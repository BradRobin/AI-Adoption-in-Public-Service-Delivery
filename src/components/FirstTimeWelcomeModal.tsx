'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Bot,
  CarFront,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { supabase } from '@/lib/supabase/client'

const WELCOME_STORAGE_KEY = 'parp_welcome_v1'
const KENYA_AVERAGE_SCORE = 64
const FALLBACK_SCORE = 74
const AUTO_ADVANCE_MS = 6000

type WelcomeState = {
  version: number
  dismissed: boolean
  dismissedAt: string
}

type Step = 0 | 1 | 2

function readWelcomeState(): WelcomeState | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(WELCOME_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as WelcomeState
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.dismissed !== 'boolean' ||
      typeof parsed.dismissedAt !== 'string'
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function persistDismissed() {
  if (typeof window === 'undefined') return

  const payload: WelcomeState = {
    version: 1,
    dismissed: true,
    dismissedAt: new Date().toISOString(),
  }

  window.localStorage.setItem(WELCOME_STORAGE_KEY, JSON.stringify(payload))
}

function StepOneScore({ score }: { score: number }) {
  const ringDegrees = Math.max(0, Math.min(100, score)) * 3.6
  const diff = score - KENYA_AVERAGE_SCORE
  const ringTrackColor = 'rgb(0 0 0 / 0.08)'

  return (
    <div className="grid gap-4 md:grid-cols-[1.15fr_1fr]">
      <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_20px_70px_-35px_rgba(74,222,128,0.45)]">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/55">Instant Benchmark</p>
          <span className="rounded-full border border-green-500/30 bg-green-500/12 px-2 py-0.5 text-[10px] font-semibold text-green-700">
            LIVE PREVIEW
          </span>
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="relative grid h-32 w-32 place-items-center rounded-full"
            style={{
              background: `conic-gradient(rgb(74 222 128) ${ringDegrees}deg, ${ringTrackColor} 0deg)`,
            }}
          >
            <div className="grid h-24 w-24 place-items-center rounded-full bg-white shadow-inner shadow-black/8">
              <span className="text-2xl font-black text-black">{score}%</span>
            </div>
          </motion.div>

          <div className="w-full space-y-3">
            <div>
              <p className="text-sm text-black/65">Your projected readiness</p>
              <p className="text-xl font-bold text-black">{score}%</p>
            </div>
            <div>
              <p className="text-sm text-black/65">Kenya public-sector average</p>
              <p className="text-xl font-bold text-blue-600">{KENYA_AVERAGE_SCORE}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/12 bg-white/4 p-5">
        <div className="mb-3 flex items-center gap-2 text-sm text-green-300">
          <TrendingUp className="h-4 w-4" />
          <span className="font-semibold">Fast Insight</span>
        </div>
        <p className="text-sm leading-relaxed text-white/80">
          {diff >= 0
            ? `You are already ${diff}% ahead of average. Let us turn that momentum into real service impact.`
            : `You are ${Math.abs(diff)}% below average. A focused 60-second assessment shows exactly where to improve first.`}
        </p>
      </div>
    </div>
  )
}

function StepTwoChatPreview() {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_20px_60px_-36px_rgba(59,130,246,0.22)]">
      <div className="mb-4 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-black/85">
          <Bot className="h-4 w-4 text-green-600" />
          PARP Kenyan AI Advisor
        </p>
        <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-green-700">
          LIVE PREVIEW
        </span>
      </div>

      <div className="space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="ml-auto max-w-[85%] rounded-2xl rounded-br-md border border-black/8 bg-black/4 px-3 py-2 text-sm text-black/75"
        >
          Sasa boss, nipatie quick readiness score, gigs na service shortcut za leo.
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="max-w-[88%] rounded-2xl rounded-bl-md border border-green-500/20 bg-green-500/8 px-3 py-2 text-sm text-black/80"
        >
          Karibu sana. Nakuonyesha score estimate, gigs 2 unaweza start wiki hii, na huduma gani upate faster kulingana na location yako. Twende Sheng ama English?
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          className="inline-flex items-center gap-1 rounded-full border border-black/8 bg-black/4 px-3 py-1 text-xs text-black/55"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          <span className="ml-1">Advisor is typing...</span>
        </motion.div>
      </div>
    </div>
  )
}

function StepThreeServicePeek() {
  return (
    <div className="rounded-2xl border border-white/12 bg-gradient-to-br from-white/[0.05] to-white/[0.03] p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Public Service Hub</p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="group rounded-xl border border-blue-400/30 bg-blue-500/10 p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-lg bg-blue-500/20 px-2.5 py-1 text-sm font-semibold text-blue-200">
            <CarFront className="h-4 w-4" />
            NTSA Transport
          </div>
          <span className="rounded-full border border-green-400/40 bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-300">
            Highlighted
          </span>
        </div>

        <p className="text-sm text-white/85">
          Renew licenses, check compliance steps, and get instant AI help before visiting the portal.
        </p>
      </motion.div>
    </div>
  )
}

export default function FirstTimeWelcomeModal() {
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()

  const [open, setOpen] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [step, setStep] = useState<Step>(0)
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true)
  const [score, setScore] = useState(FALLBACK_SCORE)

  useEffect(() => {
    const state = readWelcomeState()
    setIsReady(true)

    if (!state?.dismissed) {
      setOpen(true)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const hydrateScore = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user?.id) return

      const { data } = await supabase
        .from('assessments')
        .select('score')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!cancelled && data?.score && typeof data.score === 'number') {
        const safeScore = Math.max(0, Math.min(100, Math.round(data.score)))
        setScore(safeScore)
      }
    }

    hydrateScore()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!open || !autoAdvanceEnabled || prefersReducedMotion) return
    if (step >= 2) return

    const timer = window.setTimeout(() => {
      setStep((prev) => (prev < 2 ? ((prev + 1) as Step) : prev))
    }, AUTO_ADVANCE_MS)

    return () => window.clearTimeout(timer)
  }, [open, step, autoAdvanceEnabled, prefersReducedMotion])

  const stepMeta = useMemo(
    () => [
      {
        title: 'Your AI Readiness Score is Ready',
        subtitle: 'In seconds, see where you stand and how to improve with confidence.',
      },
      {
        title: 'Try the Kenyan AI Advisor',
        subtitle: 'Get instant score insight, gig ideas, and public-service shortcuts in Sheng or English.',
      },
      {
        title: 'Quick Peek: Public Service Hub',
        subtitle: 'One place to navigate services and act faster with AI-assisted support.',
      },
    ],
    [],
  )

  const dismiss = () => {
    persistDismissed()
    setOpen(false)
  }

  const startAssessment = () => {
    persistDismissed()
    setOpen(false)
    router.push('/assess')
  }

  const goNext = () => {
    setAutoAdvanceEnabled(false)
    setStep((prev) => (prev < 2 ? ((prev + 1) as Step) : prev))
  }

  const goBack = () => {
    setAutoAdvanceEnabled(false)
    setStep((prev) => (prev > 0 ? ((prev - 1) as Step) : prev))
  }

  if (!isReady) return null

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          dismiss()
          return
        }

        setOpen(next)
      }}
    >
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="fixed left-1/2 top-1/2 z-[75] w-[94vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-white/15 bg-zinc-950 text-white shadow-[0_30px_120px_-40px_rgba(34,197,94,0.7)]"
              >
                <div className="pointer-events-none absolute inset-0 opacity-70">
                  <div className="absolute -left-12 -top-16 h-44 w-44 rounded-full bg-green-500/20 blur-3xl" />
                  <div className="absolute -right-10 top-10 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
                  <div className="absolute bottom-0 left-1/3 h-36 w-36 rounded-full bg-emerald-400/15 blur-3xl" />
                </div>

                <div className="relative max-h-[86vh] overflow-y-auto p-5 sm:p-7">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-green-300/25 bg-green-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-green-300">
                        <Sparkles className="h-3.5 w-3.5" />
                        45-Second Guided Start
                      </p>
                      <Dialog.Title className="text-balance text-2xl font-black leading-tight text-white sm:text-3xl">
                        {stepMeta[step].title}
                      </Dialog.Title>
                      <Dialog.Description className="mt-2 max-w-2xl text-sm text-white/70 sm:text-base">
                        {stepMeta[step].subtitle}
                      </Dialog.Description>
                    </div>

                    <button
                      type="button"
                      onClick={dismiss}
                      className="rounded-full border border-white/15 bg-white/5 p-2 text-white/65 transition hover:bg-white/10 hover:text-white"
                      aria-label="Close welcome modal"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                      {step === 0 && <StepOneScore score={score} />}
                      {step === 1 && <StepTwoChatPreview />}
                      {step === 2 && <StepThreeServicePeek />}
                    </motion.div>
                  </AnimatePresence>

                  <div className="mt-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {[0, 1, 2].map((index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setAutoAdvanceEnabled(false)
                              setStep(index as Step)
                            }}
                            className={`h-2.5 rounded-full transition ${
                              step === index ? 'w-8 bg-green-400' : 'w-2.5 bg-white/25 hover:bg-white/40'
                            }`}
                            aria-label={`Jump to step ${index + 1}`}
                          />
                        ))}
                      </div>

                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/45">Step {step + 1} of 3</p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={goBack}
                          disabled={step === 0}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={goNext}
                          disabled={step === 2}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={startAssessment}
                        className="inline-flex h-12 w-full min-w-0 items-center justify-center rounded-xl bg-green-500 px-6 text-base font-bold text-black shadow-[0_18px_45px_-25px_rgba(74,222,128,0.95)] transition hover:-translate-y-0.5 hover:bg-green-400 sm:w-auto sm:min-w-60"
                      >
                        Start My Real Assessment
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  )
}
