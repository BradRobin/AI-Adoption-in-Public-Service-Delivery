 'use client'

import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Session } from '@supabase/supabase-js'

import { ParticleBackground } from '@/components/ParticleBackground'
import { supabase } from '@/lib/supabase/client'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type SseEvent =
  | { event: 'open'; data: string }
  | { event: 'info'; data: string }
  | { event: 'token'; data: string }
  | { event: 'error'; data: string }
  | { event: 'done'; data: string }

function parseSseEvents(raw: string): SseEvent[] {
  // Minimal SSE parser for our server format: "event: X\ndata: Y\n\n"
  const events: SseEvent[] = []
  const chunks = raw.split('\n\n')
  for (const chunk of chunks) {
    const lines = chunk.split('\n')
    let event: string | null = null
    const dataParts: string[] = []

    for (const line of lines) {
      if (line.startsWith('event:')) {
        event = line.slice('event:'.length).trim()
      } else if (line.startsWith('data:')) {
        dataParts.push(line.slice('data:'.length).trimStart())
      }
    }

    if (!event) continue
    const data = dataParts.join('\n')

    if (
      event === 'open' ||
      event === 'info' ||
      event === 'token' ||
      event === 'error' ||
      event === 'done'
    ) {
      events.push({ event, data } as SseEvent)
    }
  }
  return events
}

export default function ChatPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)

  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()

      if (!currentSession) {
        router.replace('/login')
        return
      }

      setSession(currentSession)
      setIsLoading(false)
    }

    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'SIGNED_OUT' || !newSession) {
        setSession(null)
        router.replace('/login')
        return
      }

      setSession(newSession)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    container.scrollTop = container.scrollHeight
  }, [messages.length, isThinking])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const handleSend = async (event: FormEvent) => {
    event.preventDefault()

    if (isThinking) return
    if (!session?.access_token) return

    const trimmed = input.trim()
    if (!trimmed) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    }

    const placeholderId = crypto.randomUUID()
    const thinkingMessage: ChatMessage = {
      id: placeholderId,
      role: 'assistant',
      content: '',
    }

    const nextMessages = [...messages, userMessage, thinkingMessage]
    setMessages(nextMessages)
    setInput('')
    setIsThinking(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: nextMessages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Request failed (${res.status}).`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const appendToAssistant = (delta: string) => {
        if (!delta) return
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId ? { ...m, content: m.content + delta } : m,
          ),
        )
      }

      const setAssistantText = (text: string) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === placeholderId ? { ...m, content: text } : m)),
        )
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE frames.
        while (true) {
          const frameIdx = buffer.indexOf('\n\n')
          if (frameIdx === -1) break
          const frame = buffer.slice(0, frameIdx + 2)
          buffer = buffer.slice(frameIdx + 2)

          const events = parseSseEvents(frame)
          for (const evt of events) {
            if (evt.event === 'token') appendToAssistant(evt.data)
            if (evt.event === 'info') {
              // Only show info if we have no content yet.
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === placeholderId && m.content.length === 0
                    ? { ...m, content: `${evt.data}\n` }
                    : m,
                ),
              )
            }
            if (evt.event === 'error') {
              setAssistantText(`Sorry — I couldn’t reach the AI service.\n\n${evt.data}`)
            }
            if (evt.event === 'done') {
              // no-op; loop will end when stream closes
            }
          }
        }
      }

      // If the model streamed nothing (rare), show a minimal message.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId && m.content.trim().length === 0
            ? { ...m, content: 'No response received. Please try again.' }
            : m,
        ),
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error.'
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? {
                ...m,
                content: `Sorry — I couldn’t reach the AI service. Please try again.\n\n${msg}`,
              }
            : m,
        ),
      )
    } finally {
      setIsThinking(false)
    }
  }

  if (isLoading) {
    return (
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black font-sans">
        <ParticleBackground />
        <div className="relative z-10 flex w-full max-w-md flex-col gap-4 px-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <p className="text-sm text-white/80 md:text-base">Checking session...</p>
          </div>
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur">
            <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
              <div className="h-3 w-5/6 animate-pulse rounded-full bg-white/10" />
              <div className="h-3 w-4/6 animate-pulse rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-black font-sans">
      <ParticleBackground />

      <nav className="absolute right-4 top-4 z-20 flex flex-wrap items-center gap-2 text-xs sm:text-sm md:text-base">
        <Link
          href="/"
          className="rounded-lg px-3 py-1 text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Home
        </Link>
        <Link
          href="/assess"
          className="rounded-lg px-3 py-1 text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Assess
        </Link>
        <Link
          href="/chat"
          className="rounded-lg px-3 py-1 text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Chat
        </Link>
        <Link
          href="/privacy"
          className="rounded-lg px-3 py-1 text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Privacy
        </Link>
        <Link
          href="/report"
          className="rounded-lg px-3 py-1 text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Report
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-lg px-3 py-1 text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          SignOut
        </button>
      </nav>

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-col px-4 pt-20 pb-24">
        <div className="flex min-h-[400px] flex-1 flex-col rounded-2xl border border-white/10 bg-white/5 shadow-xl backdrop-blur max-h-[calc(100vh-6rem)]">
          <header className="border-b border-white/10 px-5 py-4">
            <h1 className="text-lg font-semibold text-white md:text-xl">
              AI Readiness Chat
            </h1>
            <p className="mt-1 text-xs text-white/70 md:text-sm">
              Ask questions about your Technology–Organization–Environment (TOE)
              readiness.
            </p>
          </header>

          <section
            ref={scrollContainerRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.length === 0 && !isThinking && (
              <div className="mt-6 rounded-xl border border-dashed border-white/15 bg-black/40 px-4 py-3 text-xs text-white/70 md:text-sm">
                <p className="font-medium text-white/80">
                  Welcome to the AI Readiness Chat.
                </p>
                <p className="mt-1">
                  Start by asking about your current capabilities, risks, or TOE
                  factors. This prototype will respond with a simple placeholder
                  message for now.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm md:text-base ${
                    message.role === 'user'
                      ? 'rounded-br-sm bg-green-500 text-black'
                      : 'rounded-bl-sm bg-black/70 text-white'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </section>

          <form
            onSubmit={handleSend}
            className="border-t border-white/10 bg-black/60 px-4 py-3"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <textarea
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about your AI readiness or TOE factors..."
                className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-white/15 bg-black/70 px-3 py-2 text-sm text-white outline-none ring-0 placeholder:text-white/30 focus:border-white/40 md:text-base"
              />
              <button
                type="submit"
                disabled={isThinking || input.trim().length === 0}
                className="inline-flex h-10 min-w-[80px] items-center justify-center rounded-xl bg-green-500 px-4 text-sm font-medium text-black transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-500/60 md:h-11 md:min-w-[96px] md:px-5 md:text-base"
              >
                {isThinking ? 'Thinking...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
