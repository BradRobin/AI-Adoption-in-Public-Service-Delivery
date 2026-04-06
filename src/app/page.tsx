'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { ParticleBackground } from '@/components/ParticleBackground'
import { TypingTagline } from '@/components/TypingTagline'
import { AppPageSkeleton } from '@/components/AppPageSkeleton'
import type { Session } from '@supabase/supabase-js'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { PlayCircle } from 'lucide-react'

const SUPPORTED_SERVICES = [
  'SHA',
  'NTSA',
  'eCitizen',
  'KRA iTax',
  'NSSF',
  'HELB',
  'Huduma Kenya',
  'IFMIS',
  'CRB Services',
]

const SOCIAL_PROOF_TARGET = 47892
const SOCIAL_PROOF_START = 47210
const DEMO_VIDEO_SRC = '/demo/parp-45s-reel.mp4'

function ScorePreviewCard() {
  return (
    <div className="w-full max-w-xs rounded-2xl border border-white/20 bg-black/90 p-4 text-left shadow-2xl backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Instant Preview</p>
        <span className="rounded-full border border-green-400/30 bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-300">
          60s
        </span>
      </div>
      <p className="text-sm text-white/85">
        Your projected score: <strong className="text-green-300">72%</strong>
      </p>
      <p className="mb-3 text-xs text-white/60">
        Kenya average: <strong className="text-blue-300">64%</strong>
      </p>
      <div className="space-y-2">
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[72%] rounded-full bg-green-400" />
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[64%] rounded-full bg-blue-400" />
        </div>
      </div>
    </div>
  )
}

/**
 * The main Landing Page component for the PARP application.
 * Handles initial user entry, displays the hero section, and checks for existing user sessions
 * to automatically redirect authenticated users to the dashboard.
 */
export default function LandingPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const prefersReducedMotion = useReducedMotion()
  const [socialProofCount, setSocialProofCount] = useState(
    prefersReducedMotion ? SOCIAL_PROOF_TARGET : SOCIAL_PROOF_START
  )
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // State to manage the loading spinner while checking auth status
  const [isLoading, setIsLoading] = useState(true)

  // Effect: Check for active session. If logged in, redirect to dashboard.
  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession()

        setSession(currentSession)

        if (currentSession) {
          router.replace('/dashboard')
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error checking session on landing page:', error)
        }
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [router])

  useEffect(() => {
    if (prefersReducedMotion) {
      setSocialProofCount(SOCIAL_PROOF_TARGET)
      return
    }

    let frame = 0
    const durationMs = 1150
    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      const value = Math.round(
        SOCIAL_PROOF_START + (SOCIAL_PROOF_TARGET - SOCIAL_PROOF_START) * eased
      )
      setSocialProofCount(value)

      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [prefersReducedMotion])

  // Show loading spinner while checking auth state to prevent flash of content
  if (isLoading) {
    return <AppPageSkeleton variant="hero" message="Checking your session..." />
  }

  // If session exists (and redirect is happening), show nothing or a spinner
  if (session) {
    return <AppPageSkeleton variant="hero" message="Redirecting to dashboard..." />
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-black font-sans text-white">
      <ParticleBackground />

      {/* Header / Nav */}
      <header className="relative z-20 flex w-full items-center justify-between px-6 py-4 md:px-12">
        <div className="flex flex-col items-start gap-0.5">
          <Link
            href="/dashboard"
            className="text-xl font-bold tracking-tight transition-opacity hover:opacity-80"
          >
            PARP
          </Link>
          <TypingTagline className="min-h-[1.1rem] text-[11px] font-medium text-white/70 sm:text-xs" />
        </div>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-gray-200"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-8 text-center sm:pt-12">
        <div className="max-w-4xl space-y-7">
          <motion.div
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/75"
          >
            <span className="h-2 w-2 rounded-full bg-green-400" />
            <span>{socialProofCount.toLocaleString()}+ Kenyans have taken the assessment</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08, ease: 'easeOut' }}
            className="text-balance text-4xl font-black leading-[1.03] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Discover Your AI Readiness Score in 60 Seconds
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16, ease: 'easeOut' }}
            className="mx-auto max-w-3xl text-base text-white/75 sm:text-lg md:text-xl"
          >
            Get an instant benchmark for your organization, compare against Kenya&apos;s public sector average,
            and unlock your next practical AI wins.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.24, ease: 'easeOut' }}
            className="mx-auto flex w-full max-w-3xl flex-col items-stretch justify-center gap-3 pt-2 sm:flex-row"
          >
            <div
              className="group relative w-full sm:w-auto"
              onMouseEnter={() => setIsPreviewOpen(true)}
              onMouseLeave={() => setIsPreviewOpen(false)}
              onFocus={() => setIsPreviewOpen(true)}
              onBlur={() => setIsPreviewOpen(false)}
            >
              <motion.div whileHover={prefersReducedMotion ? undefined : { y: -2 }}>
                <Link
                  href="/signup"
                  className="cta-pulse-hover relative flex h-13 w-full min-w-0 items-center justify-center overflow-hidden rounded-full border border-green-300/40 bg-green-500 px-8 text-base font-bold text-black transition sm:min-w-55 sm:w-auto"
                  aria-describedby="hero-score-preview"
                >
                  <span className="relative z-10">Get My Score Free →</span>
                  <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
                    <span className="absolute inset-x-4 bottom-0 h-0.5 bg-[linear-gradient(90deg,#000_0%,#000_18%,#fff_18%,#fff_22%,#c8102e_22%,#c8102e_50%,#fff_50%,#fff_54%,#006600_54%,#006600_82%,#000_82%,#000_100%)]" />
                  </span>
                </Link>
              </motion.div>

              <div className="mt-3 md:hidden">
                <ScorePreviewCard />
              </div>

              <AnimatePresence>
                {isPreviewOpen && (
                  <motion.div
                    id="hero-score-preview"
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="pointer-events-none absolute left-1/2 top-[calc(100%+12px)] z-30 hidden -translate-x-1/2 md:block"
                    role="tooltip"
                  >
                    <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-white/20 bg-black/90" />
                    <ScorePreviewCard />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.div whileHover={prefersReducedMotion ? undefined : { y: -2 }}>
              <Link
                href="#demo"
                className="group relative flex h-13 w-full min-w-0 items-center justify-center gap-2 rounded-full border border-blue-400/60 bg-blue-500/5 px-8 text-base font-semibold text-blue-200 transition hover:border-blue-300 hover:bg-blue-500/10 hover:text-blue-100 sm:min-w-55 sm:w-auto"
              >
                <PlayCircle size={18} />
                <span>Watch 45-Second Demo</span>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.32, ease: 'easeOut' }}
            className="mt-8 grid grid-cols-1 gap-5 pt-4 text-left md:grid-cols-3"
          >
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur-sm">
              <h3 className="mb-2 font-semibold text-green-400">TOE Framework</h3>
              <p className="text-sm text-gray-300">
                Scientifically grounded scoring across technological, organizational, and environmental readiness.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur-sm">
              <h3 className="mb-2 font-semibold text-blue-400">Actionable Output</h3>
              <p className="text-sm text-gray-300">
                Receive a practical score with immediate guidance, not generic AI advice.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur-sm">
              <h3 className="mb-2 font-semibold text-red-300">Kenya-Relevant Benchmark</h3>
              <p className="text-sm text-gray-300">
                Compare your readiness to a localized public service baseline in seconds.
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      <section id="demo" className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-10">
        <div className="glass-surface rounded-2xl border border-white/12 bg-linear-to-br from-blue-500/12 via-white/6 to-green-500/12 p-6 text-left sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">45-Second Demo</p>
          <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">See how your score is generated</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/70 sm:text-base">
            A quick walkthrough of PARP&apos;s readiness assessment flow, benchmark comparison, and next-step recommendations.
          </p>

          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start">
            <div className="glass-surface overflow-hidden rounded-xl border border-white/15 bg-white/6 shadow-[0_24px_54px_rgb(0_0_0/0.32)]">
              <video
                className="aspect-video h-auto w-full bg-transparent"
                controls
                preload="metadata"
                playsInline
                aria-label="PARP 45-second demo reel"
              >
                <source src={DEMO_VIDEO_SRC} type="video/mp4" />
                Your browser does not support embedded videos. Use the download link below to watch the demo.
              </video>
            </div>

            <div className="glass-surface rounded-xl border border-white/12 bg-white/6 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">What you&apos;ll see</p>
              <ul className="mt-3 space-y-2 text-sm text-white/80">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-400" />
                  Instant score generation flow from sign-up to results.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400" />
                  Side-by-side benchmark against Kenya average.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-300" />
                  Action plan hints for your first AI implementation wins.
                </li>
              </ul>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a
                  href={DEMO_VIDEO_SRC}
                  className="inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-500/15 px-4 py-2 text-xs font-semibold text-black transition hover:border-blue-200 hover:bg-blue-500/25"
                >
                  <PlayCircle size={14} />
                  Open Full Reel
                </a>
                <Link
                  href="/signup"
                  className="inline-flex items-center rounded-full border border-green-300/30 bg-green-500/15 px-4 py-2 text-xs font-semibold text-black transition hover:border-green-200 hover:bg-green-500/25"
                >
                  Start My Assessment
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Services Carousel */}
      <section className="relative z-10 w-full py-3">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
            Supported Public Services
          </div>
          <div className="services-carousel-mask">
            <div className="services-carousel-track">
              {[...SUPPORTED_SERVICES, ...SUPPORTED_SERVICES].map((service, index) => (
                <span
                  key={`${service}-${index}`}
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/10 bg-black/50 py-6 text-center backdrop-blur-sm">
        <p className="text-xs text-gray-500">
          Powered by Next.js & Supabase · Built by Engineer Brad Robinson
        </p>
      </footer>
    </div>
  )
}
