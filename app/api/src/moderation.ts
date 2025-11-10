import { ContentSafetyClient, AnalyzeTextOptions } from '@azure/ai-content-safety'

const client = new ContentSafetyClient(
  process.env.CONTENT_SAFETY_ENDPOINT!,
  { key: process.env.CONTENT_SAFETY_KEY! }
)

export async function moderateText(text: string): Promise<{ flagged: boolean; reason?: string }> {
  try {
    const result = await client.analyzeText({
      text,
      categories: ['Hate', 'SelfHarm', 'Sexual', 'Violence'],
    } as AnalyzeTextOptions)

    if (result.hateResult?.severity && result.hateResult.severity > 0) {
      return { flagged: true, reason: 'Hate content detected' }
    }
    if (result.selfHarmResult?.severity && result.selfHarmResult.severity > 0) {
      return { flagged: true, reason: 'Self-harm content detected' }
    }
    if (result.sexualResult?.severity && result.sexualResult.severity > 0) {
      return { flagged: true, reason: 'Sexual content detected' }
    }
    if (result.violenceResult?.severity && result.violenceResult.severity > 0) {
      return { flagged: true, reason: 'Violence content detected' }
    }

    return { flagged: false }
  } catch (error) {
    console.error('Moderation error:', error)
    // Fail open for now, but log
    return { flagged: false }
  }
}

