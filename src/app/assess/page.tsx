'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Session } from '@supabase/supabase-js'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { ParticleBackground } from '@/components/ParticleBackground'
import { LikertScale } from '@/components/LikertScale'
import { ToeResults } from '@/components/ToeResults'
import { supabase } from '@/lib/supabase/client'
import {
  computeScores,
  getInterpretation,
  type ToeFormValues,
  type ToeScores,
} from '@/lib/toe-scoring'
import {
  TOE_QUESTIONS,
  type ToeSection,
} from '@/data/toe-questions'

// Maps TOE section keys to human-readable labels
const SECTION_LABELS: Record<ToeSection, string> = {
  technological: 'Technological Factors',
  organizational: 'Organizational Factors',
  environmental: 'Environmental Factors',
}

// Order in which sections are presented
const SECTION_ORDER: ToeSection[] = [
  'technological',
  'organizational',
  'environmental',
]

// Zod schema for form validation
const toeFormSchema = z.object(
  SECTION_ORDER.reduce(
    (acc, section) => {
      TOE_QUESTIONS[section].forEach((q) => {
        acc[q.id] = z.number({
          invalid_type_error: 'Please select an option.',
          required_error: 'This question is required.',
        })
      })
      return acc
    },
    {} as Record<string, z.ZodNumber>,
  ),
)

/**
 * AssessPage Component
 * Provides a form for users to evaluate their readiness across TOE dimensions.
 * Handles form state, submission to Supabase, and displays results.
 */
export default function AssessPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [submittedData, setSubmittedData] = useState<ToeFormValues | null>(null)
  const [scores, setScores] = useState<ToeScores | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // React Hook Form initialization with default values
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<ToeFormValues>({
    mode: 'onChange',
    resolver: zodResolver(toeFormSchema),
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

  // Load draft from localStorage
  useEffect(() => {
    if (session?.user?.id && !submittedData) {
      const draftKey = `toe_draft_${session.user.id}`
      const savedDraft = localStorage.getItem(draftKey)
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft)
          Object.keys(parsed).forEach((key) => {
            setValue(key, parsed[key])
          })
          toast.success('Restored previous draft.')
        } catch {
          // Ignore invalid draft
        }
      }
    }
  }, [session, setValue, submittedData])

  const handleSaveDraft = () => {
    if (session?.user?.id) {
      const draftKey = `toe_draft_${session.user.id}`
      const currentValues = watch()
      localStorage.setItem(draftKey, JSON.stringify(currentValues))
      toast.success('Draft saved successfully.')
    }
  }

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

      // Fetch latest assessment if session exists
      if (currentSession?.user) {
        const { data, error } = await supabase
          .from('assessments')
          .select('*')
          .eq('user_id', currentSession.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!error && data) {
          setScores({
            overall: data.score,
            dimensionScores: data.dimension_scores as any, // Cast for simplicity, ideally validate
          })
          // We set submittedData to a dummy object just to trigger the "showResults" view
          // since we only strictly need scores to display results.
          setSubmittedData({} as ToeFormValues)
        }
      }

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

  // Handle form submission: compute scores and save to database
  const onSubmit = async (data: ToeFormValues) => {
    setSaveError(null)
    const computed = computeScores(data)
    setScores(computed)
    setSubmittedData(data)
    setIsSaving(true)

    const userId = session?.user?.id
    if (userId) {
      // Clear draft on successful submission
      localStorage.removeItem(`toe_draft_${userId}`)

      const { error } = await supabase.from('assessments').insert({
        user_id: userId,
        score: computed.overall,
        dimension_scores: computed.dimensionScores,
      })

      if (error) {
        setSaveError(error.message)
        toast.error('Could not save assessment. Your results are still shown locally.')
      } else {
        toast.success('Assessment saved. Results are now recorded for this session.')
      }
    }

    setIsSaving(false)
  }

  const handleRetake = () => {
    // Clear form and local state
    reset(
      SECTION_ORDER.reduce(
        (acc, section) => {
          TOE_QUESTIONS[section].forEach((q) => {
            acc[q.id] = undefined
          })
          return acc
        },
        {} as Record<string, undefined>,
      ),
    )
    if (session?.user?.id) {
      localStorage.removeItem(`toe_draft_${session.user.id}`)
    }
    setSubmittedData(null)
    setScores(null)
    setSaveError(null)
    window.scrollTo(0, 0)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success('You have been signed out.')
    router.replace('/login')
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
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur">
            <div className="h-4 w-40 animate-pulse rounded-full bg-white/10" />
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
              <div className="h-3 w-5/6 animate-pulse rounded-full bg-white/10" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
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

  const showResults = submittedData && scores

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
      <main className="relative z-10 mx-auto w-full max-w-2xl px-4 pt-20 pb-24">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur md:p-8">
          <h1 className="text-xl font-semibold text-white md:text-2xl">
            AI Readiness Assessment (TOE Framework)
          </h1>

          {showResults ? (
            <>
              <p className="mt-3 text-sm text-white/80 md:text-base">
                Your assessment results are below.
              </p>
              {isSaving && (
                <p className="mt-2 text-sm text-white/70">
                  Saving...
                </p>
              )}
              {saveError && (
                <p className="mt-2 text-sm text-red-400">
                  Could not save to server: {saveError}
                </p>
              )}
              <div className="mt-8">
                <ToeResults
                  overall={scores.overall}
                  dimensionScores={scores.dimensionScores}
                  interpretation={getInterpretation(scores.dimensionScores)}
                  onRetake={handleRetake}
                />
              </div>
            </>
          ) : (
            <>
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

                <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10 md:text-base"
                  >
                    Save Draft
                  </button>
                  <button
                    type="submit"
                    disabled={!isValid || isSaving}
                    className="w-full rounded-lg bg-green-500 px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 md:text-base"
                  >
                    Submit Assessment
                  </button>
                </div>
              </form>
            </>
          )}

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
