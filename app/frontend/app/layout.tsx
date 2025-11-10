import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ask AI - Event Q&A',
  description: 'Real-time AI-powered Q&A for events',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

