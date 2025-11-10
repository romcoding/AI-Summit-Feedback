import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { container } from '../cosmos'
import { broadcastToSession } from '../signalr'

export async function hideQuestion(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const questionId = request.params.id
    if (!questionId) {
      return {
        status: 400,
        jsonBody: { error: 'Question ID required' },
      }
    }

    const { resource: question } = await container.item(questionId, questionId).read()
    if (!question) {
      return {
        status: 404,
        jsonBody: { error: 'Question not found' },
      }
    }

    // Mark as hidden (or delete)
    await container.item(questionId, questionId).delete()

    // Broadcast
    await broadcastToSession(question.sessionId, 'questionHidden', { id: questionId })

    return {
      status: 200,
      jsonBody: { success: true },
    }
  } catch (error) {
    context.log.error('Error hiding question:', error)
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' },
    }
  }
}

app.http('hideQuestion', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'questions/{id}/hide',
  handler: hideQuestion,
})

