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

  const handleSend = (event: FormEvent) => {
    event.preventDefault()

    if (isThinking) return

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
      content: 'AI is thinking...',
    }

    setMessages((prev) => [...prev, userMessage, thinkingMessage])
    setInput('')
    setIsThinking(true)

    // Simulated placeholder API call.
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === placeholderId
            ? {
                ...message,
                content:
                  "I'm still being built - ask me about TOE factors!",
              }
            : message,
        ),
      )
      setIsThinking(false)
    }, 900)
  }

  if (isLoading) {
    return (
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black font-sans">
        <ParticleBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <p className="text-white/80">Checking session...</p>
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

      <nav className="absolute right-4 top-4 z-20 flex flex-wrap items-center gap-3 text-sm md:text-base">
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
        <div className="flex h-[540px] flex-1 flex-col rounded-2xl border border-white/10 bg-white/5 shadow-xl backdrop-blur md:h-[640px]">
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
            <div className="flex items-end gap-2">
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
