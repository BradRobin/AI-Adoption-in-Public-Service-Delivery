'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Session } from '@supabase/supabase-js'
import { useForm } from 'react-hook-form'

import { ParticleBackground } from '@/components/ParticleBackground'
import { LikertScale } from '@/components/LikertScale'
import { supabase } from '@/lib/supabase/client'
import {
  TOE_QUESTIONS,
  type ToeSection,
} from '@/data/toe-questions'

type ToeFormValues = Record<string, number>

const SECTION_LABELS: Record<ToeSection, string> = {
  technological: 'Technological Factors',
  organizational: 'Organizational Factors',
  environmental: 'Environmental Factors',
}

const SECTION_ORDER: ToeSection[] = [
  'technological',
  'organizational',
  'environmental',
]

export default function AssessPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [submittedData, setSubmittedData] = useState<ToeFormValues | null>(null)

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ToeFormValues>({
    mode: 'onChange',
    defaultValues: SECTION_ORDER.reduce(
      (acc, section) => {
        TOE_QUESTIONS[section].forEach((q) => {
          acc[q.id] = undefined
        })
        return acc
      },
      {} as Record<string, undefined>,
    ),
  })

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

  const onSubmit = (data: ToeFormValues) => {
    setSubmittedData(data)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
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
      <main className="relative z-10 mx-auto w-full max-w-2xl px-4 pt-20 pb-24">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur md:p-8">
          <h1 className="text-xl font-semibold text-white md:text-2xl">
            AI Readiness Assessment (TOE Framework)
          </h1>
          <p className="mt-3 text-sm text-white/80 md:text-base">
            Rate each statement on a scale of 1 (Strongly Disagree) to 5
            (Strongly Agree).
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-8 space-y-8"
          >
            {SECTION_ORDER.map((section) => (
              <section key={section} className="space-y-4">
                <h2 className="text-lg font-medium text-white">
                  {SECTION_LABELS[section]}
                </h2>
                <div className="space-y-6">
                  {TOE_QUESTIONS[section].map((q) => (
                    <LikertScale
                      key={q.id}
                      name={q.id}
                      control={control}
                      label={q.text}
                      error={errors[q.id]?.message}
                    />
                  ))}
                </div>
              </section>
            ))}

            <div className="pt-4">
              <button
                type="submit"
                disabled={!isValid}
                className="w-full rounded-lg bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-base"
              >
                Submit
              </button>
            </div>
          </form>

          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  )
}
