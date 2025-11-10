export interface Question {
  id: string
  sessionId: string
  question: string
  industry: string
  status: 'pending' | 'answering' | 'answered' | 'blocked'
  answer?: string
  createdAt: string
  authorToken: string
  email?: string
  moderation?: {
    flagged: boolean
    reason?: string
  }
  meta?: {
    ipHash?: string
    userAgent?: string
  }
}

export interface CreateQuestionRequest {
  question: string
  industry: string
  sessionId: string
  authorToken: string
  email?: string
}

