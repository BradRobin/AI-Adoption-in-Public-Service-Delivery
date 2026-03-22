/**
 * @file chat/page.tsx
 * @description Interactive AI chat interface page with streaming responses.
 * Features conversation history, avatar speaking mode, and provider switching.
 * Persists chat conversations to Supabase for cross-session continuity.
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import toast from '@/lib/toast'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Session } from '@supabase/supabase-js'

import { ParticleBackground } from '@/components/ParticleBackground'
import { supabase } from '@/lib/supabase/client'
import AvatarAdvisor from '@/components/AvatarAdvisor'
import { usePrivacyConsent } from '@/components/PrivacyBanner'
import { NavigationMenu } from '@/components/NavigationMenu'
import { Video, VideoOff, ThumbsUp, ThumbsDown, Copy, Volume2, Plus, MessageSquare, Trash2, Edit2, Check, X, Menu } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Represents a single chat message with unique identifier.
 */
type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

/**
 * Represents a persisted conversation record from Supabase.
 */
type Conversation = {
  id: string
  user_id: string
  title: string
  messages: ChatMessage[]
  created_at: string
  updated_at: string
}

/**
 * Defines the structure of Server-Sent Events (SSE) chunks returned by the chat API.
 */
// SSE event types for handling stream chunks
type SseEvent =
  | { event: 'open'; data: string }
  | { event: 'info'; data: string }
  | { event: 'token'; data: string }
  | { event: 'error'; data: string }
  | { event: 'done'; data: string }

const TITLE_STOP_WORDS = new Set([
  'about',
  'after',
  'also',
  'because',
  'between',
  'could',
  'does',
  'from',
  'have',
  'into',
  'just',
  'make',
  'need',
  'please',
  'should',
  'show',
  'some',
  'than',
  'that',
  'them',
  'there',
  'they',
  'this',
  'what',
  'when',
  'where',
  'which',
  'with',
  'would',
  'your',
])

const TITLE_PHRASES = [
  { pattern: /report issue/i, label: 'Issue Report', weight: 10 },
  { pattern: /ai readiness|readiness assessment/i, label: 'AI Readiness', weight: 9 },
  { pattern: /technology[\s-]*organization[\s-]*environment|\btoe\b/i, label: 'TOE Factors', weight: 8 },
  { pattern: /queue time|waiting time|service time/i, label: 'Service Timing', weight: 8 },
  { pattern: /service delivery/i, label: 'Service Delivery', weight: 8 },
  { pattern: /digital transformation/i, label: 'Digital Transformation', weight: 7 },
  { pattern: /public service/i, label: 'Public Services', weight: 7 },
  { pattern: /huduma center|huduma kenya|\bhuduma\b/i, label: 'Huduma', weight: 7 },
  { pattern: /ecitizen/i, label: 'eCitizen', weight: 7 },
  { pattern: /ntsa/i, label: 'NTSA', weight: 7 },
  { pattern: /k\s*r\s*a|itax/i, label: 'KRA iTax', weight: 7 },
  { pattern: /sha/i, label: 'SHA', weight: 7 },
  { pattern: /nssf/i, label: 'NSSF', weight: 7 },
  { pattern: /helb/i, label: 'HELB', weight: 7 },
  { pattern: /ifmis/i, label: 'IFMIS', weight: 7 },
  { pattern: /crb/i, label: 'CRB', weight: 7 },
]

const TITLE_TOKEN_LABELS: Record<string, string> = {
  ai: 'AI',
  adoption: 'Adoption',
  assessment: 'Assessment',
  automation: 'Automation',
  chatbot: 'Chatbot',
  county: 'County',
  dashboard: 'Dashboard',
  digital: 'Digital',
  huduma: 'Huduma',
  implementation: 'Implementation',
  integration: 'Integration',
  kenya: 'Kenya',
  local: 'Local AI',
  model: 'AI Model',
  news: 'News',
  ollama: 'Ollama',
  openai: 'OpenAI',
  organization: 'Organization',
  organizational: 'Organizational',
  policy: 'Policy',
  readiness: 'Readiness',
  report: 'Report',
  service: 'Service',
  services: 'Services',
  strategy: 'Strategy',
  support: 'Support',
  technology: 'Technology',
  technological: 'Technology',
  transformation: 'Transformation',
}

const HERO_EXAMPLE_PROMPT = {
  label: 'Try example question',
  prompt:
    'Niko kaunti officer Nairobi. Nipatie quick AI readiness score estimate, 2 online gigs naweza anza this week, na public services naweza speed up leo.',
}

function renderWithPrivacyLink(text: string): React.ReactNode {
  const pattern = /(Privacy Policy|Privacy)/gi
  const parts = text.split(pattern)
  return parts.map((part, index) =>
    pattern.test(part) ? (
      <Link
        key={index}
        href="/privacy"
        className="underline decoration-dotted text-green-400 hover:text-green-300 transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        {part}
      </Link>
    ) : (
      <span key={index}>{part}</span>
    ),
  )
}

function buildConversationTitle(messages: ChatMessage[]): string {
  const relevantMessages = messages.filter(
    (message) => message.content.trim().length > 0,
  )

  if (relevantMessages.length === 0) {
    return 'New Chat'
  }

  const conceptScores = new Map<string, number>()
  const addScore = (label: string, score: number) => {
    conceptScores.set(label, (conceptScores.get(label) ?? 0) + score)
  }

  for (const message of relevantMessages) {
    const content = message.content.trim()
    const lowered = content.toLowerCase()
    const roleWeight = message.role === 'user' ? 3 : 1

    for (const phrase of TITLE_PHRASES) {
      if (phrase.pattern.test(lowered)) {
        addScore(phrase.label, phrase.weight * roleWeight)
      }
    }

    const normalized = lowered.replace(/[^a-z0-9\s]/g, ' ')
    for (const token of normalized.split(/\s+/)) {
      if (!token) {
        continue
      }

      if (TITLE_STOP_WORDS.has(token)) {
        continue
      }

      if (token.length < 4 && !['ai', 'toe', 'sha', 'kra'].includes(token)) {
        continue
      }

      const label = TITLE_TOKEN_LABELS[token]
      if (label) {
        addScore(label, roleWeight)
      }
    }
  }

  const rankedConcepts = [...conceptScores.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].length - right[0].length)
    .map(([label]) => label)

  if (rankedConcepts.length > 0) {
    return rankedConcepts.slice(0, 2).join(' / ').slice(0, 60)
  }

  const fallbackMessage = relevantMessages.find((message) => message.role === 'user')?.content ?? relevantMessages[0].content
  const compact = fallbackMessage.replace(/\s+/g, ' ').trim()
  return compact.length > 60 ? `${compact.slice(0, 57).trim()}...` : compact
}

/**
 * Parses raw text from an SSE stream into structured event objects.
 * Handles the standard SSE format, accounting for newlines and data chunking.
 *
 * @param {string} raw The raw streaming string chunk.
 * @returns {SseEvent[]} An array of parsed Server-Sent Events.
 */
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
  const { consentChatHistory, loading: consentLoading } = usePrivacyConsent()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [thinkingTime, setThinkingTime] = useState(0)
  const [thinkingDurations, setThinkingDurations] = useState<Record<string, number>>({})

  const [showAvatar, setShowAvatar] = useState(false)
  const [avatarText, setAvatarText] = useState<string | null>(null)

  // Chat History State
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [editTitleValue, setEditTitleValue] = useState('')

  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const thinkingTimeRef = useRef(0)

  const handleStarterPromptClick = () => {
    setInput(HERO_EXAMPLE_PROMPT.prompt)
    window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      const length = HERO_EXAMPLE_PROMPT.prompt.length
      inputRef.current?.setSelectionRange(length, length)
    })
  }

  // Format thinking time as "Xs" or "Xm Ys"
  const formatThinkingTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`
    }
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  // Timer effect for tracking thinking duration
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isThinking) {
      setThinkingTime(0)
      thinkingTimeRef.current = 0
      interval = setInterval(() => {
        setThinkingTime((prev) => {
          const newVal = prev + 1
          thinkingTimeRef.current = newVal
          return newVal
        })
      }, 1000)
    } else {
      setThinkingTime(0)
      thinkingTimeRef.current = 0
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isThinking])

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

  // Fetch conversations when session exists
  useEffect(() => {
    if (consentLoading) return
    if (!consentChatHistory) {
      setConversations([])
      setActiveConversationId(null)
      return
    }

    if (!session?.user?.id) return

    const fetchConversations = async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false })

      if (!error && data) {
        setConversations(data)
      }
    }

    fetchConversations()

    // Realtime subscription for cross-tab sync
    const channel = supabase
      .channel(`conversations_${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session?.user?.id, consentChatHistory, consentLoading])

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

  const handleSpeak = (text: string) => {
    // Reveal the 3D Avatar Player overlay and feed it the AI response text
    setAvatarText(text)
    setShowAvatar(true)
  }
  // handles the copy functionality
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Response copied to clipboard')
  }

  const handleSend = async (event: FormEvent) => {
    event.preventDefault()

    if (isThinking) return
    if (!session?.user?.id) return

    const trimmed = input.trim()
    if (!trimmed) return

    // Ensure we capture current active convo state synchronously inside this function scope 
    let currentConversationId = activeConversationId
    const existingConversation = currentConversationId
      ? conversations.find((conversation) => conversation.id === currentConversationId) ?? null
      : null
    let isBrandNewConversation = false
    let autoTitle = 'New Chat'
    let shouldAutoRefreshTitle = false

    // If no active conversation, prep to create one
    if (!currentConversationId) {
      isBrandNewConversation = true
    }

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

    const userOnlyMessages = [...messages, userMessage]
    const previousAutoTitle = buildConversationTitle(messages)
    autoTitle = buildConversationTitle(userOnlyMessages)
    shouldAutoRefreshTitle =
      isBrandNewConversation ||
      !existingConversation ||
      existingConversation.title.trim().length === 0 ||
      existingConversation.title === 'New Chat' ||
      existingConversation.title === previousAutoTitle

    const nextMessages = [...messages, userMessage, thinkingMessage]
    setMessages(nextMessages)
    setInput('')
    setIsThinking(true)

    // Instantly create the conversation in the database if brand new
    if (isBrandNewConversation && consentChatHistory) {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: session.user.id,
          title: autoTitle,
          messages: [userMessage], // Will be updated when assistant finishes
        })
        .select()
        .single()

      if (!error && data) {
        currentConversationId = data.id
        setActiveConversationId(data.id)
        setConversations((previous) => [data, ...previous.filter((conversation) => conversation.id !== data.id)])
      } else {
        console.error('Failed to create conversation', error)
      }
    } else if (currentConversationId && consentChatHistory) {
      // Persist the user message immediately for existing chats
      await supabase
        .from('conversations')
        .update({
          messages: [...messages, userMessage],
          updated_at: new Date().toISOString()
        })
        .eq('id', currentConversationId)
    }

    const currentProvider = 'ollama'
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

      // If the model streamed nothing, show a minimal message.
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
      // Capture the thinking duration for this message before resetting
      setThinkingDurations((prev) => ({ ...prev, [placeholderId]: thinkingTimeRef.current }))
      setIsThinking(false)

      // Trigger Avatar Speech if enabled
      if (fullResponse && showAvatar) {
        setAvatarText(fullResponse)
      }

      // Persist final messages state to database
      if (currentConversationId && fullResponse.length > 0 && consentChatHistory) {
        const assistantMessage: ChatMessage = {
          id: placeholderId,
          role: 'assistant',
          content: fullResponse,
        }
        const finalMessages = [...messages, userMessage, assistantMessage]
        const nextTitle = buildConversationTitle(finalMessages)
        const updatePayload: Pick<Conversation, 'messages' | 'updated_at'> & { title?: string } = {
          messages: finalMessages,
          updated_at: new Date().toISOString(),
        }

        if (shouldAutoRefreshTitle) {
          updatePayload.title = nextTitle
        }

        await supabase
          .from('conversations')
          .update(updatePayload)
          .eq('id', currentConversationId)

        setConversations((previous) =>
          previous.map((conversation) =>
            conversation.id === currentConversationId
              ? {
                  ...conversation,
                  messages: finalMessages,
                  updated_at: updatePayload.updated_at,
                  title: shouldAutoRefreshTitle ? nextTitle : conversation.title,
                }
              : conversation,
          ),
        )
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

  // --- Sidebar Actions ---

  const handleNewChat = () => {
    setActiveConversationId(null)
    setMessages([])
    if (window.innerWidth < 768) setIsSidebarOpen(false)
  }

  const handleLoadChat = (conv: Conversation) => {
    setActiveConversationId(conv.id)
    setMessages(conv.messages || [])
    if (window.innerWidth < 768) setIsSidebarOpen(false)
  }

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent loading the chat when deleting
    if (!confirm('Are you sure you want to delete this conversation?')) return

    const { error } = await supabase.from('conversations').delete().eq('id', id)
    if (!error) {
      if (activeConversationId === id) {
        setActiveConversationId(null)
        setMessages([])
      }
      setConversations(prev => prev.filter(c => c.id !== id))
      toast.success('Conversation deleted')
    } else {
      toast.error('Failed to delete conversation')
    }
  }

  const handleRenameSubmit = async (id: string, e: React.FormEvent | null = null) => {
    if (e) e.preventDefault()

    const trimmed = editTitleValue.trim()
    if (!trimmed) {
      setEditingTitleId(null)
      return
    }

    setConversations(prev => prev.map(c => c.id === id ? { ...c, title: trimmed } : c))
    setEditingTitleId(null)

    const { error } = await supabase
      .from('conversations')
      .update({ title: trimmed })
      .eq('id', id)

    if (error) {
      toast.error('Failed to rename')
      // Let realtime subscription revert the UI on next fetch if error
    }
  }

  const startEditing = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingTitleId(conv.id)
    setEditTitleValue(conv.title)
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
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-black font-sans">
      <ParticleBackground />

      <nav className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/dashboard"
          className="text-xl font-bold tracking-tight text-white transition-opacity hover:opacity-80"
        >
          PARP
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-white/60 sm:inline-block">
            {session.user?.email}
          </span>
          <NavigationMenu />
        </div>
      </nav>

      <main id="main-content" className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-4 pb-8 md:pt-20 md:pb-24">

        {/* Mobile Sidebar Toggle Button (Visible only on small screens) */}
        <div className="mb-4 flex items-center gap-2 md:hidden">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            <Menu size={16} />
            <span>{isSidebarOpen ? 'Hide History' : 'View History'}</span>
          </button>
          <button
            onClick={handleNewChat}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-2 text-sm text-green-400 transition hover:bg-green-500/20"
          >
            <Plus size={16} />
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex min-h-[500px] flex-1 flex-col md:flex-row rounded-2xl border border-white/10 bg-white/5 shadow-xl backdrop-blur max-h-[calc(100vh-6rem)] relative overflow-hidden">

          {/* History Sidebar */}
          <div className={`
            absolute md:static inset-y-0 left-0 z-30 w-[260px] md:w-[300px] 
            border-r border-white/10 bg-black/90 md:bg-black/40 backdrop-blur-md 
            transform transition-transform duration-300 ease-in-out flex flex-col
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}>
            <div className="p-4 border-b border-white/10 hidden md:block">
              <button
                onClick={handleNewChat}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 hover:bg-green-400 text-black px-4 py-3 text-sm font-medium transition"
              >
                <Plus size={18} />
                <span>New Chat</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
              {conversations.length === 0 ? (
                <p className="text-center text-xs text-white/40 mt-6">No saved conversations</p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleLoadChat(conv)}
                    className={`group cursor-pointer rounded-lg p-3 transition-colors flex items-start gap-3 ${activeConversationId === conv.id ? 'bg-white/15' : 'hover:bg-white/5'}`}
                  >
                    <MessageSquare size={16} className={`mt-0.5 shrink-0 ${activeConversationId === conv.id ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`} />

                    {editingTitleId === conv.id ? (
                      <form
                        onSubmit={(e) => handleRenameSubmit(conv.id, e)}
                        className="flex-1 flex items-center gap-1"
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          autoFocus
                          value={editTitleValue}
                          onChange={e => setEditTitleValue(e.target.value)}
                          onBlur={() => handleRenameSubmit(conv.id)}
                          className="w-full bg-black/50 border border-green-500/50 rounded px-1.5 py-0.5 text-sm text-white outline-none"
                        />
                        <button type="submit" className="text-green-400 p-0.5"><Check size={14} /></button>
                      </form>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <p className={`truncate text-sm ${activeConversationId === conv.id ? 'font-medium text-white' : 'text-white/80'}`}>
                          {conv.title}
                        </p>
                      </div>
                    )}

                    {!editingTitleId && (
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => startEditing(conv, e)}
                          className="text-white/40 hover:text-white p-1"
                          title="Rename conversation"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteChat(conv.id, e)}
                          className="text-white/40 hover:text-red-400 p-1"
                          title="Delete conversation"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <header className="border-b border-white/10 px-5 py-4 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-white md:text-xl truncate">
                  {activeConversationId ? conversations.find(c => c.id === activeConversationId)?.title || 'Chat' : 'New AI Readiness Chat'}
                </h1>
                <p className="mt-1 text-xs text-white/70 md:text-sm">
                  Ask questions about your Technology–Organization–Environment (TOE)
                  readiness.
                </p>
              </div>
            </header>

            <section
              ref={scrollContainerRef}
              className="flex-1 space-y-3 overflow-y-auto px-4 py-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/30"
            >
              {messages.length === 0 && !isThinking && (
                <div className="mt-6 rounded-2xl border border-green-400/25 bg-gradient-to-br from-green-500/10 via-black/50 to-blue-500/10 px-4 py-4 text-xs text-white/80 shadow-[0_18px_40px_-26px_rgba(74,222,128,0.9)] md:px-5 md:py-5 md:text-sm">
                  <p className="text-base font-semibold text-white md:text-lg">
                    Karibu sana. Tuanze na quick win leo.
                  </p>
                  <p className="mt-2 leading-relaxed text-white/80">
                    I can instantly help you estimate your AI readiness score, suggest practical online gigs, and guide you through public services faster. Uliza kwa Sheng ama English, vile unafeel.
                  </p>
                  <button
                    type="button"
                    onClick={handleStarterPromptClick}
                    className="mt-3 inline-flex items-center rounded-full border border-green-300/35 bg-green-500/15 px-3 py-1.5 text-xs font-semibold text-green-200 transition hover:bg-green-500/25 hover:text-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300 md:text-sm"
                  >
                    {HERO_EXAMPLE_PROMPT.label}
                  </button>
                </div>
              )}

              {messages.map((message, index) => {
                const isLastMessage = index === messages.length - 1
                const isCurrentlyStreaming = isThinking && isLastMessage && message.role === 'assistant'

                return (
                  <div
                    key={message.id}
                    className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} mb-2`}
                  >
                    <div
                      className={`text-sm md:text-base ${message.role === 'user'
                        ? 'max-w-[80%] rounded-2xl rounded-br-sm border border-green-400/30 bg-green-500 px-4 py-3 text-black'
                        : 'max-w-full px-0 py-0 text-white'
                        }`}
                    >
                      {isCurrentlyStreaming && message.content === '' ? (
                        <div className="flex items-center gap-2 h-5 px-1">
                          <div className="flex items-center gap-1">
                            <motion.div className="w-1.5 h-1.5 bg-white/70 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                            <motion.div className="w-1.5 h-1.5 bg-white/70 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                            <motion.div className="w-1.5 h-1.5 bg-white/70 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
                          </div>
                          <motion.span
                            className="text-xs text-white/60 font-mono"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          >
                            {formatThinkingTime(thinkingTime)}
                          </motion.span>
                        </div>
                      ) : (
                        message.role === 'assistant'
                          ? renderWithPrivacyLink(message.content)
                          : message.content
                      )}
                    </div>
                    {message.role === 'assistant' && !isCurrentlyStreaming && message.content.length > 0 && (
                      <div className="mt-2 flex items-center gap-3 px-2 text-white/40">
                        <button onClick={() => toast.success('Thanks for the feedback!')} className="hover:text-white transition-colors" title="Helpful" aria-label="Mark response as helpful">
                          <ThumbsUp size={16} aria-hidden="true" />
                        </button>
                        <button onClick={() => toast.success('Thanks for the feedback!')} className="hover:text-white transition-colors" title="Not Helpful" aria-label="Mark response as not helpful">
                          <ThumbsDown size={16} aria-hidden="true" />
                        </button>
                        <button onClick={() => handleCopy(message.content)} className="hover:text-white transition-colors" title="Copy" aria-label="Copy response to clipboard">
                          <Copy size={16} aria-hidden="true" />
                        </button>
                        <button onClick={() => handleSpeak(message.content)} className="hover:text-white transition-colors" title="Read Aloud" aria-label="Read response aloud">
                          <Volume2 size={16} aria-hidden="true" />
                        </button>
                        {thinkingDurations[message.id] !== undefined && thinkingDurations[message.id] > 0 && (
                          <span className="text-xs text-white/40 ml-1">
                            thought for {formatThinkingTime(thinkingDurations[message.id])}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </section>

            <form
              onSubmit={handleSend}
              className="border-t border-white/10 bg-black/60 px-4 py-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <textarea
                  ref={inputRef}
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
                  placeholder="Ask in Sheng or English (score, gigs, services)"
                  className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-white/15 bg-black/70 px-3 py-2 text-sm text-white outline-none ring-0 placeholder:text-white/30 focus:border-white/40 md:text-base [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/30"
                />
                <div className="flex items-center gap-2 px-1 pb-1 sm:pb-0">
                  {/* Avatar Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowAvatar(!showAvatar)}
                    className={`ml-2 flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${showAvatar ? 'border-green-500 bg-green-500/20 text-green-400' : 'border-white/20 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
                    title="Toggle 3D Avatar"
                    aria-label={showAvatar ? "Disable 3D Avatar" : "Enable 3D Avatar"}
                    aria-pressed={showAvatar}
                  >
                    {showAvatar ? <Video size={14} aria-hidden="true" /> : <VideoOff size={14} aria-hidden="true" />}
                    <span className="hidden sm:inline">Avatar</span>
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={isThinking || input.trim().length === 0}
                  aria-label={isThinking ? `Thinking for ${formatThinkingTime(thinkingTime)}` : 'Send message'}
                  className="inline-flex h-10 min-w-[80px] items-center justify-center rounded-xl bg-green-500 px-4 text-sm font-medium text-black transition-colors hover:bg-green-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:bg-green-500/60 md:h-11 md:min-w-[96px] md:px-5 md:text-base"
                >
                  {isThinking && (
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border border-black border-t-transparent" aria-hidden="true" />
                  )}
                  {isThinking ? `${formatThinkingTime(thinkingTime)}` : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] text-white/40 md:text-xs">
          AI can make mistakes. Always verify outputs. Use responsibly.
        </p>

        {/* Avatar Player Overlay */}
        <AvatarAdvisor
          responseText={avatarText}
          isVisible={showAvatar}
          onClose={() => setShowAvatar(false)}
          isListening={isThinking}
        />
      </main>
    </div>
  )
}
