import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { container } from '../cosmos'
import { broadcastToSession } from '../signalr'
import { moderateText } from '../moderation'
import { ULID } from 'ulid'
import { CreateQuestionRequest, Question } from '../types'

// Rate limiting (simple in-memory, use Redis in production)
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_SECONDS = 20

function checkRateLimit(authorToken: string): boolean {
  const lastRequest = rateLimitMap.get(authorToken)
  const now = Date.now()
  if (lastRequest && now - lastRequest < RATE_LIMIT_SECONDS * 1000) {
    return false
  }
  rateLimitMap.set(authorToken, now)
  return true
}

export async function createQuestion(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const body = (await request.json()) as CreateQuestionRequest

    if (!body.question || !body.industry || !body.sessionId || !body.authorToken) {
      return {
        status: 400,
        jsonBody: { error: 'Missing required fields' },
      }
    }

    // Rate limiting
    if (!checkRateLimit(body.authorToken)) {
      return {
        status: 429,
        jsonBody: { error: 'Rate limit exceeded. Please wait before submitting another question.' },
      }
    }

    // Moderation
    const moderation = await moderateText(body.question)
    if (moderation.flagged) {
      return {
        status: 400,
        jsonBody: { error: 'Question blocked by content moderation', reason: moderation.reason },
      }
    }

    const question: Question = {
      id: ULID.generate(),
      sessionId: body.sessionId,
      question: body.question,
      industry: body.industry,
      status: moderation.flagged ? 'blocked' : 'pending',
      createdAt: new Date().toISOString(),
      authorToken: body.authorToken,
      email: body.email,
      moderation,
      meta: {
        userAgent: request.headers.get('user-agent') || undefined,
      },
    }

    await container.items.create(question)

    // Broadcast to SignalR
    await broadcastToSession(body.sessionId, 'questionCreated', question)

    return {
      status: 201,
      jsonBody: { id: question.id, status: question.status },
    }
  } catch (error) {
    context.log.error('Error creating question:', error)
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' },
    }
  }
}

export async function getQuestions(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const sessionId = request.query.get('sessionId')
    if (!sessionId) {
      return {
        status: 400,
        jsonBody: { error: 'sessionId required' },
      }
    }

    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.sessionId = @sessionId AND c.status != @status ORDER BY c.createdAt DESC',
        parameters: [
          { name: '@sessionId', value: sessionId },
          { name: '@status', value: 'blocked' },
        ],
      })
      .fetchAll()

    return {
      status: 200,
      jsonBody: resources,
    }
  } catch (error) {
    context.log.error('Error getting questions:', error)
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' },
    }
  }
}

app.http('createQuestion', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'questions',
  handler: createQuestion,
})

app.http('getQuestions', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'questions',
  handler: getQuestions,
})

