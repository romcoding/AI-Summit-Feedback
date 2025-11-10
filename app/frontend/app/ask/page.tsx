'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import * as signalR from '@microsoft/signalr'
import { ULID } from 'ulid'

const INDUSTRIES = [
  'Insurance',
  'Banking',
  'Healthcare',
  'Retail',
  'Manufacturing',
  'Technology',
  'Consulting',
  'Other',
]

interface Question {
  id: string
  question: string
  industry: string
  status: 'pending' | 'answering' | 'answered' | 'blocked'
  answer?: string
  createdAt: string
}

export default function AskPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session') || 'default'
  const [question, setQuestion] = useState('')
  const [industry, setIndustry] = useState('')
  const [email, setEmail] = useState('')
  const [authorToken, setAuthorToken] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [myQuestions, setMyQuestions] = useState<Question[]>([])
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null)

  useEffect(() => {
    // Get or create author token
    let token = localStorage.getItem('authorToken')
    if (!token) {
      token = ULID.generate().toLowerCase()
      localStorage.setItem('authorToken', token)
    }
    setAuthorToken(token)

    // Load my questions
    loadMyQuestions(token)

    // Setup SignalR connection
    const hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${process.env.NEXT_PUBLIC_SIGNALR_URL}/api`)
      .withAutomaticReconnect()
      .build()

    hubConnection.start()
      .then(() => {
        hubConnection.on('questionAnswered', (data: { id: string; answer: string; authorToken: string }) => {
          if (data.authorToken === token) {
            loadMyQuestions(token)
          }
        })
      })
      .catch(console.error)

    setConnection(hubConnection)

    return () => {
      hubConnection.stop()
    }
  }, [])

  const loadMyQuestions = async (token: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/my/${token}`)
      if (response.ok) {
        const data = await response.json()
        setMyQuestions(data)
      }
    } catch (error) {
      console.error('Failed to load questions:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || !industry) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          industry,
          sessionId,
          authorToken,
          email: email.trim() || undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setQuestion('')
        setIndustry('')
        setEmail('')
        // Reload questions
        setTimeout(() => loadMyQuestions(authorToken), 1000)
      } else {
        alert('Failed to submit question. Please try again.')
      }
    } catch (error) {
      console.error('Submission error:', error)
      alert('Network error. Please check your connection.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mt-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Ask your AI a question
          </h1>
          <p className="text-gray-600 mb-6">
            Your question will appear on the big screen and you'll get an AI-powered answer.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
                Question *
              </label>
              <textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What would you like to know about AI?"
              />
            </div>

            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
                Industry *
              </label>
              <select
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select an industry...</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email (optional, for follow-up)
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
              By submitting, you agree that your question may be shown on the big screen.
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !question.trim() || !industry}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Question'}
            </button>
          </form>

          {myQuestions.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h2 className="text-xl font-semibold mb-4">Your Questions</h2>
              <div className="space-y-4">
                {myQuestions.map((q) => (
                  <div
                    key={q.id}
                    className={`p-4 rounded-lg border-2 ${
                      q.status === 'answered'
                        ? 'border-green-500 bg-green-50'
                        : q.status === 'answering'
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900 mb-2">{q.question}</div>
                    <div className="text-sm text-gray-600 mb-2">
                      Industry: {q.industry} • {q.status}
                    </div>
                    {q.status === 'answered' && q.answer && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-sm font-medium text-green-700 mb-1">Answer:</div>
                        <div className="text-gray-700 whitespace-pre-wrap">{q.answer}</div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(q.answer || '')
                            alert('Answer copied to clipboard!')
                          }}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                        >
                          Copy Answer
                        </button>
                      </div>
                    )}
                    {q.status === 'answering' && (
                      <div className="mt-2 text-sm text-yellow-700">
                        We're answering now...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

