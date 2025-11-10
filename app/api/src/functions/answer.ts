import { app, TimerRequest, InvocationContext } from '@azure/functions'
import { container } from '../cosmos'
import { broadcastToSession } from '../signalr'
import { generateAnswer } from '../ai'
import { Question } from '../types'

export async function answerWorker(
  request: TimerRequest,
  context: InvocationContext
): Promise<void> {
  try {
    // Find oldest pending question
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.status = @status ORDER BY c.createdAt ASC OFFSET 0 LIMIT 1',
        parameters: [{ name: '@status', value: 'pending' }],
      })
      .fetchAll()

    if (resources.length === 0) {
      context.log('No pending questions')
      return
    }

    const question = resources[0] as Question

    // Update status to answering
    question.status = 'answering'
    await container.items.upsert(question)
    await broadcastToSession(question.sessionId, 'questionAnswered', question)

    try {
      // Generate answer
      const answer = await generateAnswer(question.question, question.industry)

      // Update with answer
      question.status = 'answered'
      question.answer = answer
      await container.items.upsert(question)

      // Broadcast
      await broadcastToSession(question.sessionId, 'questionAnswered', question)
      context.log(`Answered question ${question.id}`)
    } catch (error) {
      context.log.error('Error generating answer:', error)
      // Reset to pending for retry
      question.status = 'pending'
      await container.items.upsert(question)
    }
  } catch (error) {
    context.log.error('Error in answer worker:', error)
  }
}

// Timer trigger: every minute
// Note: For faster processing (< 1 minute), consider using Azure Service Bus Queue or Event Grid
// Azure Functions timer triggers support 6-field cron (with seconds) in v4, but 1 minute is more reliable
app.timer('answerWorker', {
  schedule: '0 * * * * *', // Every minute at :00 seconds
  handler: answerWorker,
})

