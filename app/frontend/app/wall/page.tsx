/*
 * Updated Wall Page for AI Summit Feedback.
 *
 * This version negotiates a SignalR connection via the backend instead of using a
 * pre-configured URL. It subscribes to question creation, answer, and hide
 * events from the server and updates the UI accordingly. Real-time updates
 * occur through the SignalR connection, with a backup refresh interval.
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import * as signalR from '@microsoft/signalr'

interface Question {
  id: string
  question: string
  industry: string
  status: 'pending' | 'answering' | 'answered' | 'blocked'
  answer?: string
  createdAt: string
}

export default function WallPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session') || 'default'
  const isAdmin = searchParams.get('admin') === 'true'
  const [questions, setQuestions] = useState<Question[]>([])
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null)
  const highlightedTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load initial data and connect to SignalR on mount or when sessionId changes
  useEffect(() => {
    loadQuestions()

    let currentConnection: signalR.HubConnection | null = null

    const connectSignalR = async () => {
      try {
        // Request a SignalR connection from the backend
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/negotiate`)
        if (!res.ok) {
          throw new Error('Failed to negotiate SignalR connection')
        }
        const { url, accessToken } = await res.json()
        const conn = new signalR.HubConnectionBuilder()
          .withUrl(url, { accessTokenFactory: () => accessToken })
          .withAutomaticReconnect()
          .build()

        await conn.start()

        // Listen for questions being created
        conn.on('questionCreated', (data: Question) => {
          setQuestions((prev) => [data, ...prev])
        })

        // Listen for answers
        conn.on('questionAnswered', (data: Question) => {
          setQuestions((prev) => prev.map((q) => (q.id === data.id ? data : q)))
          setHighlightedId(data.id)
          if (highlightedTimeoutRef.current) {
            clearTimeout(highlightedTimeoutRef.current)
          }
          highlightedTimeoutRef.current = setTimeout(() => {
            setHighlightedId(null)
          }, 10000)
        })

        // Listen for questions being hidden
        conn.on('questionHidden', (data: { id: string }) => {
          setQuestions((prev) => prev.filter((q) => q.id !== data.id))
        })

        currentConnection = conn
        setConnection(conn)
      } catch (err) {
        console.error('SignalR connection error:', err)
      }
    }

    connectSignalR()

    // Periodically reload questions as a backup
    const interval = setInterval(loadQuestions, 30000)

    return () => {
      clearInterval(interval)
      if (highlightedTimeoutRef.current) {
        clearTimeout(highlightedTimeoutRef.current)
      }
      if (currentConnection) {
        currentConnection.stop()
      }
    }
  }, [sessionId])

  // Fetch questions for the current session
  const loadQuestions = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/questions?sessionId=${sessionId}`
      )
      if (response.ok) {
        const data = await response.json()
        setQuestions(data)
      }
    } catch (error) {
      console.error('Failed to load questions:', error)
    }
  }

  // Admin-only handler to hide a question
  const handleHide = async (id: string) => {
    if (!isAdmin) return
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/questions/${id}/hide`, {
        method: 'POST',
      })
    } catch (error) {
      console.error('Failed to hide question:', error)
    }
  }

  const pendingQuestions = questions.filter((q) => q.status === 'pending' || q.status === 'answering')
  const answeredQuestions = questions.filter((q) => q.status === 'answered')

  const industryCounts = questions.reduce((acc, q) => {
    acc[q.industry] = (acc[q.industry] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-5xl font-bold mb-2">Live Q&A Wall</h1>
          <div className="flex gap-6 text-lg">
            <span>Total: {questions.length}</span>
            <span>Pending: {pendingQuestions.length}</span>
            <span>Answered: {answeredQuestions.length}</span>
          </div>
          {Object.keys(industryCounts).length > 0 && (
            <div className="mt-2 text-sm text-gray-400">
              Industries: {Object.entries(industryCounts)
                .map(([ind, count]) => `${ind} (${count})`)
                .join(', ')}
            </div>
          )}
        </header>

        <div className="grid grid-cols-2 gap-6">
          {/* Incoming Column */}
          <div>
            <h2 className="text-3xl font-semibold mb-4 text-yellow-400">
              Incoming ({pendingQuestions.length})
            </h2>
            <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {pendingQuestions.map((q) => (
                <div
                  key={q.id}
                  className={`bg-gray-800 rounded-lg p-4 border-2 ${
                    q.status === 'answering' ? 'border-yellow-500' : 'border-gray-700'
                  } ${isAdmin ? 'hover:border-red-500' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-gray-400">{q.industry}</span>
                    {isAdmin && (
                      <button
                        onClick={() => handleHide(q.id)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Hide
                      </button>
                    )}
                  </div>
                  <div className="text-lg font-medium">{q.question}</div>
                  {q.status === 'answering' && (
                    <div className="mt-2 text-sm text-yellow-400">Answering...</div>
                  )}
                </div>
              ))}
              {pendingQuestions.length === 0 && (
                <div className="text-gray-500 text-center py-8">No pending questions</div>
              )}
            </div>
          </div>

          {/* Answered Column */}
          <div>
            <h2 className="text-3xl font-semibold mb-4 text-green-400">
              Answered ({answeredQuestions.length})
            </h2>
            <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {answeredQuestions.map((q) => (
                <div
                  key={q.id}
                  className={`bg-gray-800 rounded-lg p-4 border-2 transition-all ${
                    highlightedId === q.id
                      ? 'border-green-400 shadow-lg shadow-green-500/50 scale-105'
                      : 'border-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-gray-400">{q.industry}</span>
                    {isAdmin && (
                      <button
                        onClick={() => handleHide(q.id)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Hide
                      </button>
                    )}
                  </div>
                  <div className="text-lg font-medium mb-3">{q.question}</div>
                  {q.answer && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <div className="text-sm text-green-400 mb-1">Answer:</div>
                      <div className="text-gray-300 whitespace-pre-wrap">{q.answer}</div>
                    </div>
                  )}
                </div>
              ))}
              {answeredQuestions.length === 0 && (
                <div className="text-gray-500 text-center py-8">No answered questions yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}