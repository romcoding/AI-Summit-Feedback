import { OpenAIClient, AzureOpenAI } from '@azure/openai'

const client = new OpenAIClient(
  process.env.AOAI_ENDPOINT!,
  { apiKey: process.env.AOAI_KEY! }
)

const MODEL_NAME = process.env.MODEL_NAME || 'gpt-4o'

const INDUSTRY_PROMPTS: Record<string, string> = {
  Insurance: 'Focus on claims automation, underwriting triage, GDPR/FINMA compliance, and audit trails.',
  Banking: 'Emphasize model risk management, PII handling, and record-keeping requirements.',
  Healthcare: 'Include HIPAA/clinical safety disclaimers and patient privacy considerations.',
}

export async function generateAnswer(question: string, industry: string): Promise<string> {
  const industryContext = INDUSTRY_PROMPTS[industry] || 'Provide practical, industry-appropriate guidance.'

  const systemPrompt = `You are the on-stage AI for an industry event.

Answer clearly, in 5–7 crisp sentences max.
If the question is broad, give a practical framework + first steps.
If the question asks for code or configs, provide a minimal, copyable block.
Respect the declared industry: ${industry}. Use that context to tailor risks, regulations, and examples.
${industryContext}
If safety/compliance is uncertain, state assumptions and safe alternatives.
Return Markdown only. No external links unless explicitly asked.`

  try {
    const response = await client.getChatCompletions(MODEL_NAME, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ])

    return response.choices[0]?.message?.content || 'Unable to generate answer at this time.'
  } catch (error) {
    console.error('AI generation error:', error)
    throw error
  }
}

