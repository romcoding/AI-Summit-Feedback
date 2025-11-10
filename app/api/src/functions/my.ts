import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { container } from '../cosmos'

export async function getMyQuestions(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const authorToken = request.params.authorToken
    if (!authorToken) {
      return {
        status: 400,
        jsonBody: { error: 'authorToken required' },
      }
    }

    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.authorToken = @authorToken ORDER BY c.createdAt DESC',
        parameters: [{ name: '@authorToken', value: authorToken }],
      })
      .fetchAll()

    return {
      status: 200,
      jsonBody: resources,
    }
  } catch (error) {
    context.log.error('Error getting my questions:', error)
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' },
    }
  }
}

app.http('getMyQuestions', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'my/{authorToken}',
  handler: getMyQuestions,
})

