/*
 * Azure Function: negotiate
 *
 * Provides SignalR connection information for clients. This function registers
 * itself using the v4 programming model's `app.http` API. It accepts an
 * optional `userId` query parameter (the author token) and returns a JSON
 * object containing a SignalR endpoint URL and access token. Clients should
 * call this endpoint to establish a SignalR connection.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getClientCredentials } from '../signalr'

// Handler for negotiate endpoint
export async function negotiate(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Extract userId from query string (e.g. ?userId=abc123). If not provided, undefined.
    const userId = request.query.get('userId') || undefined

    // Get the SignalR connection details
    const { url, accessToken } = getClientCredentials(userId)

    return {
      status: 200,
      jsonBody: { url, accessToken },
      headers: {
        'Content-Type': 'application/json',
      },
    }
  } catch (error) {
    context.log.error('Error in negotiate function:', error)
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' },
    }
  }
}

// Register the negotiate function as an HTTP-triggered function
app.http('negotiate', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'negotiate',
  handler: negotiate,
})