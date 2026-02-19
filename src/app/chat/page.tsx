'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Session } from '@supabase/supabase-js'

import { ParticleBackground } from '@/components/ParticleBackground'
import { supabase } from '@/lib/supabase/client'
import { AvatarPlayer } from '@/components/AvatarPlayer'
import { Video, VideoOff } from 'lucide-react'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

// SSE event types for handling stream chunks
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
        const dataVal = line.slice('data:'.length);
        // Only strip the single mandatory space required by SSE spec
        if (dataVal.startsWith(' ')) {
          dataParts.push(dataVal.slice(1));
        } else {
          dataParts.push(dataVal);
        }
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

/**
 * ChatPage Component
 * Provides a chat interface for users to interact with the AI assistant.
 * Handles message history, real-time streaming response, and auto-scrolling.
 */
export default function ChatPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isLocalAI, setIsLocalAI] = useState(true) // Default to Local (Ollama)
  const [showAvatar, setShowAvatar] = useState(false)
  const [avatarText, setAvatarText] = useState<string | null>(null)

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
    toast.success('You have been signed out.')
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
    const currentProvider = isLocalAI ? 'ollama' : 'openai'
    let fullResponse = ''

    try {
      // Send message to backend API and handle streaming response
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
          provider: currentProvider,
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
        fullResponse += delta
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
      toast.error('Chat service is unavailable right now. Please try again.')
    } finally {
      setIsThinking(false)

      // Trigger Avatar Speech if enabled
      if (fullResponse && showAvatar) {
        setAvatarText(fullResponse)
      }

      if (fullResponse) {
        const lowerContent = fullResponse.toLowerCase()
        const riskyKeywords = [
          'write my essay',
          'do my homework',
          'academic dishonesty',
          'cheat',
          'stereotypes',
          'bias',
        ]
        const found = riskyKeywords.find((kw) => lowerContent.includes(kw))
        if (found) {
          toast(
            'This content may involve sensitive or academic integrity topics. Please verify and use ethically.',
            {
              icon: '⚠️',
              style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
              },
              duration: 5000,
            }
          )
        }
      }
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
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm md:text-base ${message.role === 'user'
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
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (!isThinking && input.trim().length > 0) {
                      handleSend(e as unknown as FormEvent)
                    }
                  }
                }}
                placeholder="Ask PARP AI"
                className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-white/15 bg-black/70 px-3 py-2 text-sm text-white outline-none ring-0 placeholder:text-white/30 focus:border-white/40 md:text-base"
              />
              <div className="flex items-center gap-2 px-1 pb-1 sm:pb-0">
                {/* Local AI Toggle */}
                <label className="flex items-center gap-2 cursor-pointer text-xs text-white/70 hover:text-white select-none">
                  <div className="relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none bg-white/20">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isLocalAI}
                      onChange={() => setIsLocalAI(!isLocalAI)}
                    />
                    <div className={`w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600`}></div>
                  </div>
                  <span className="hidden sm:inline">Local AI</span>
                </label>

                {/* Avatar Toggle */}
                <button
                  type="button"
                  onClick={() => setShowAvatar(!showAvatar)}
                  className={`ml-2 flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors ${showAvatar ? 'border-green-500 bg-green-500/20 text-green-400' : 'border-white/20 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
                  title="Toggle 3D Avatar"
                >
                  {showAvatar ? <Video size={14} /> : <VideoOff size={14} />}
                  <span className="hidden sm:inline">Avatar</span>
                </button>
              </div>
              <button
                type="submit"
                disabled={isThinking || input.trim().length === 0}
                className="inline-flex h-10 min-w-[80px] items-center justify-center rounded-xl bg-green-500 px-4 text-sm font-medium text-black transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-500/60 md:h-11 md:min-w-[96px] md:px-5 md:text-base"
              >
                {isThinking && (
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border border-black border-t-transparent" />
                )}
                {isThinking ? 'Thinking...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
        <p className="mt-2 text-center text-[10px] text-white/40 md:text-xs">
          AI can make mistakes. Always verify outputs. Use responsibly.
        </p>

        {/* Avatar Player Overlay */}
        <AvatarPlayer
          textToSpeak={avatarText}
          isVisible={showAvatar}
          onClose={() => setShowAvatar(false)}
        />
      </main>
    </div>
  )
}
