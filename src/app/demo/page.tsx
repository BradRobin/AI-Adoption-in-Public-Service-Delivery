'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Bot, MessageSquareText, Sparkles, Trash2 } from 'lucide-react'

import { ParticleBackground } from '@/components/ParticleBackground'
import { ToeResults } from '@/components/ToeResults'
import { ServiceHub } from '@/components/ServiceHub'
import { BenchmarkCard } from '@/components/BenchmarkCard'
import { TypingTagline } from '@/components/TypingTagline'
import {
  clearDemoChatState,
  createDefaultDemoMessages,
  createDefaultDemoToeResult,
  readDemoMessages,
  readDemoMeta,
  readDemoToeResult,
  type DemoChatMessage,
  writeDemoMessages,
  writeDemoMeta,
  writeDemoToeResult,
} from '@/lib/demo-state'

const CHAT_SUGGESTIONS = [
  'Estimate queue time at Huduma Center in Nairobi CBD',
  'Report issue: NTSA portal says my DL renewal is pending for too long',
  'How can my county government adopt AI safely this year?',
  'What support does SHA provide for maternal health referrals?',
  'How do I file a clean water outage complaint in Nairobi?',
]

const SERVICE_PROMPTS: Record<string, string> = {
  health: 'How can SHA support maternal health referrals in Nairobi?',
  transport: 'Report issue: I lost my driving license and need NTSA steps.',
  water: 'How do I report a water outage and get faster response in Nairobi?',
  education: 'How can HELB improve support with AI chat for students?',
  ajira: 'Draft me a short winning proposal for an Ajira digital writing gig.',
}

function makeMessage(role: 'user' | 'assistant', content: string): DemoChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  }
}

function buildDemoReply(input: string): string {
  const normalized = input.toLowerCase()

  if (normalized.includes('queue') || normalized.includes('huduma')) {
    return 'For Huduma Centre Nairobi CBD, current estimated wait is about 38-55 minutes between 10:00 and 13:00. Fastest window is usually 08:10-09:00. Carry your ID and pre-filled eCitizen details to cut service time.'
  }

  if (normalized.includes('report issue') || normalized.includes('ticket') || normalized.includes('complaint')) {
    const suffix = Math.floor(1000 + Math.random() * 8999)
    return `Issue captured and routed. Ticket Number: TKT-NBO-${suffix}. I have tagged this as Service Delay and recommend attaching screenshots plus the exact submission timestamp for faster escalation.`
  }

  if (normalized.includes('sha') || normalized.includes('maternal') || normalized.includes('health')) {
    return 'SHA maternal pathway usually starts with facility triage, referral confirmation, then claim follow-through. If this is urgent, go to the nearest hospital immediately. For non-emergency support, keep your member number and referral notes ready before contact.'
  }

  if (normalized.includes('ntsa') || normalized.includes('driving') || normalized.includes('license')) {
    return 'For NTSA license issues: 1) confirm status in eCitizen TIMS, 2) submit a concise inquiry with ID and DL number, 3) attach payment reference if renewal was paid. Typical resolution for straightforward cases is 3-7 working days.'
  }

  if (normalized.includes('county') || normalized.includes('adopt ai') || normalized.includes('government')) {
    return 'A practical county AI rollout starts with 3 use-cases: queue prediction, citizen complaint triage, and permit-status assistant. Run an 8-week pilot in one department, set privacy checks from day one, and train a cross-functional team before scaling.'
  }

  if (normalized.includes('water') || normalized.includes('outage')) {
    return 'For water outage reports, include estate, nearest landmark, start time, and severity (no flow or low pressure). Reports with precise location details are prioritized faster by operations teams and reduce repeat follow-ups.'
  }

  if (normalized.includes('ajira') || normalized.includes('proposal') || normalized.includes('gig')) {
    return 'Use this opener: "Hello, I can deliver your task within 24 hours with clean structure and verified sources." Then add 2 proof points from your past work and finish with one clear call to action. Keep the full proposal under 120 words for better response rates.'
  }

  return 'Great question. In Kenya, the best outcomes come from combining quick digital workflows, clear accountability, and citizen-friendly communication. Share your exact service or county and I will give a tailored action plan.'
}

export default function DemoPage() {
  const [toeResult] = useState(() =>
    typeof window === 'undefined' ? createDefaultDemoToeResult() : readDemoToeResult(),
  )
  const [messages, setMessages] = useState<DemoChatMessage[]>(() =>
    typeof window === 'undefined' ? createDefaultDemoMessages() : readDemoMessages(),
  )
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    writeDemoToeResult(toeResult)
    writeDemoMessages(messages)
    writeDemoMeta({
      ...readDemoMeta(),
      lastUpdatedAt: new Date().toISOString(),
    })
  }, [toeResult, messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isThinking])

  const canSend = input.trim().length > 0 && !isThinking

  const scoreGeneratedLabel = useMemo(() => {
    const date = new Date(toeResult.generatedAt)
    return Number.isNaN(date.getTime()) ? 'Today' : date.toLocaleDateString('en-KE')
  }, [toeResult.generatedAt])

  const sendMessage = async (raw: string, suggestion?: string) => {
    const text = raw.trim()
    if (!text || isThinking) return

    const nextUserMessage = makeMessage('user', text)
    setMessages((prev) => [...prev, nextUserMessage])
    setInput('')
    setIsThinking(true)

    if (suggestion) {
      writeDemoMeta({
        ...readDemoMeta(),
        lastSuggestion: suggestion,
        lastUpdatedAt: new Date().toISOString(),
      })
    }

    await new Promise((resolve) => setTimeout(resolve, 650 + Math.random() * 500))

    const reply = buildDemoReply(text)
    const assistantMessage = makeMessage('assistant', reply)
    setMessages((prev) => [...prev, assistantMessage])
    setIsThinking(false)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSend) return
    await sendMessage(input)
  }

  const handleSuggestion = async (suggestion: string) => {
    await sendMessage(suggestion, suggestion)
  }

  const handleServiceAssist = async (service: { id: string; title: string }) => {
    const prompt = SERVICE_PROMPTS[service.id] || `How can I use ${service.title} more effectively?`
    await sendMessage(prompt, prompt)
  }

  const resetChat = () => {
    const defaults = createDefaultDemoMessages()
    setMessages(defaults)
    clearDemoChatState()
  }

  return (
    <div className="relative min-h-screen w-full bg-black font-sans text-white selection:bg-green-500/30">
      <ParticleBackground />

      <div className="sticky top-0 z-30 border-b border-white/10 bg-black/75 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-start gap-0.5">
              <Link
                href="/"
                className="text-lg font-bold tracking-tight text-white transition-opacity hover:opacity-80"
              >
                PARP
              </Link>
              <TypingTagline className="min-h-4 text-[10px] font-medium text-white/70 sm:text-[11px]" />
            </div>
            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-green-300">
              Cold User Experience
            </span>
          </div>

          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-green-400"
          >
            I’m impressed — Sign Up Now
          </Link>
        </div>
      </div>

      <main id="main-content" className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-green-300">Instant Value Preview</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                Experience PARP in 60 seconds, no account needed.
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-white/70 sm:text-base">
                You are seeing a realistic TOE readiness snapshot, live service portals, and an interactive Kenyan public-service assistant powered by demo data in your browser.
              </p>
            </div>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-300 transition hover:bg-green-500 hover:text-black"
            >
              Start Full Access
            </Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">TOE Readiness Snapshot</h2>
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70">
                  Calculated: {scoreGeneratedLabel}
                </span>
              </div>
              <ToeResults
                overall={toeResult.overall}
                dimensionScores={toeResult.dimensionScores}
                interpretation={toeResult.interpretation}
                onRetake={() => {
                  // Keep demo in wow mode and direct users to full journey.
                  window.location.href = '/signup'
                }}
              />
            </div>

            <BenchmarkCard userScore={toeResult.overall} industryAvg={42.3} source="Kenya Public Sector Pulse 2026" />
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-green-300" />
              <h2 className="text-lg font-semibold">Live Public Service Hub</h2>
            </div>
            <p className="mb-4 text-sm text-white/70">
              Cards are fully clickable. Use Ask Demo Bot to pull service-specific guidance directly into chat below.
            </p>
            <ServiceHub demoMode onDemoAssist={handleServiceAssist} />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-green-300" />
              <h2 className="text-xl font-semibold">PARP Demo Chatbot</h2>
            </div>
            <button
              type="button"
              onClick={resetChat}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10"
            >
              <Trash2 size={14} />
              Clear Chat
            </button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {CHAT_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSuggestion(suggestion)}
                disabled={isThinking}
                className="rounded-full border border-green-500/25 bg-green-500/10 px-3 py-1.5 text-xs text-green-200 transition hover:bg-green-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="max-h-90 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[92%] rounded-xl px-4 py-3 text-sm leading-relaxed sm:max-w-[80%] ${message.role === 'assistant'
                      ? 'mr-auto border border-white/10 bg-white/10 text-white'
                      : 'ml-auto border border-green-500/20 bg-green-500/15 text-green-100'
                    }`}
                >
                  {message.content}
                </div>
              ))}

              {isThinking && (
                <div className="mr-auto flex max-w-[80%] items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/80">
                  <MessageSquareText size={14} className="animate-pulse text-green-300" />
                  Thinking...
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, 350))}
              placeholder="Ask about AI readiness, service queues, NTSA, SHA, or county transformation"
              className="h-11 flex-1 rounded-lg border border-white/15 bg-black/40 px-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20"
            />
            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-green-500 px-4 text-sm font-semibold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
