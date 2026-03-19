/**
 * @file assess/page.tsx
 * @description TOE AI Readiness Self-Assessment page with Likert scale questions.
 * Users rate their organization across Technological, Organizational, and Environmental dimensions.
 * Results are computed locally and persisted to Supabase for historical tracking.
 */

'use client'

import { useEffect, useState } from 'react'
import toast from '@/lib/toast'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Session } from '@supabase/supabase-js'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { ParticleBackground } from '@/components/ParticleBackground'
import { LikertScale } from '@/components/LikertScale'
import { NavigationMenu } from '@/components/NavigationMenu'
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

/**
 * Maps TOE section keys to human-readable labels for UI display.
 */
// Maps TOE section keys to human-readable labels
const SECTION_LABELS: Record<ToeSection, string> = {
  technological: 'Technological Factors',
  organizational: 'Organizational Factors',
  environmental: 'Environmental Factors',
}

/**
 * Defines the strict presentation order of the TOE dimensions in the assessment.
 */
// Order in which sections are presented
const SECTION_ORDER: ToeSection[] = [
  'technological',
  'organizational',
  'environmental',
]

const QUESTION_SEQUENCE = SECTION_ORDER.flatMap((section) =>
  TOE_QUESTIONS[section].map((question, index) => ({
    ...question,
    section,
    sectionLabel: SECTION_LABELS[section],
    sectionQuestionNumber: index + 1,
    sectionQuestionCount: TOE_QUESTIONS[section].length,
  })),
)

// Zod schema for form validation
const toeFormSchema = z.object(
  SECTION_ORDER.reduce(
    (acc, section) => {
      TOE_QUESTIONS[section].forEach((q) => {
        acc[q.id] = z.number({
          message: 'Please select an option.',
        }).min(1, 'This question is required.')
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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

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

  const formValues = watch()

  const getNextQuestionIndex = (values: Partial<ToeFormValues>) => {
    const firstUnansweredIndex = QUESTION_SEQUENCE.findIndex(
      (question) => typeof values[question.id] !== 'number',
    )

    return firstUnansweredIndex === -1 ? QUESTION_SEQUENCE.length : firstUnansweredIndex
  }

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
          setCurrentQuestionIndex(getNextQuestionIndex(parsed))
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
      localStorage.setItem(draftKey, JSON.stringify(formValues))
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
    setCurrentQuestionIndex(0)
    window.scrollTo(0, 0)
  }

  const handlePreviousQuestion = () => {
    setCurrentQuestionIndex((previousIndex) => Math.max(0, previousIndex - 1))
  }

  const handleNextQuestion = () => {
    setCurrentQuestionIndex((previousIndex) =>
      Math.min(QUESTION_SEQUENCE.length, previousIndex + 1),
    )
  }

  const handleQuestionAnswered = () => {
    setCurrentQuestionIndex((previousIndex) => {
      if (previousIndex >= QUESTION_SEQUENCE.length - 1) {
        return QUESTION_SEQUENCE.length
      }

      return previousIndex + 1
    })
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
  const totalQuestions = QUESTION_SEQUENCE.length
  const answeredCount = QUESTION_SEQUENCE.reduce(
    (count, question) => count + (typeof formValues[question.id] === 'number' ? 1 : 0),
    0,
  )
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100)
  const currentQuestion = QUESTION_SEQUENCE[currentQuestionIndex] ?? null
  const currentQuestionValue = currentQuestion ? formValues[currentQuestion.id] : undefined
  const isCompletionStep = currentQuestionIndex >= totalQuestions

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-black font-sans">
      <ParticleBackground />
      <nav className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <div className="text-xl font-bold tracking-tight text-white">PARP</div>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-white/60 sm:inline-block">
            {session.user?.email}
          </span>
          <NavigationMenu />
        </div>
      </nav>
      <main id="main-content" className="relative z-10 mx-auto w-full max-w-2xl px-4 pt-20 pb-24">
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
                Answer one statement at a time. The card advances as soon as you select a response.
              </p>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="mt-8 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                    aria-label="Go to previous question"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-lg font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    &lt;
                  </button>
                  <div className="text-sm text-white/45">
                    {isCompletionStep ? 'Ready to submit' : `Question ${currentQuestionIndex + 1} of ${totalQuestions}`}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-white/45">
                    <span>{answeredCount} of {totalQuestions} answered</span>
                    <span>{progressPercent}% complete</span>
                  </div>
                  <progress
                    value={answeredCount}
                    max={totalQuestions}
                    className="assessment-progress h-2 w-full overflow-hidden rounded-full"
                  />
                </div>

                {!isCompletionStep && currentQuestion ? (
                  <section className="space-y-5 rounded-2xl border border-white/10 bg-black/35 p-5 shadow-lg backdrop-blur-sm md:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
                        {currentQuestion.sectionLabel}
                      </div>
                      <div className="text-sm text-white/45">
                        Question {currentQuestionIndex + 1} of {totalQuestions}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-white/40">
                        Section question {currentQuestion.sectionQuestionNumber} of {currentQuestion.sectionQuestionCount}
                      </p>
                      <LikertScale
                        key={currentQuestion.id}
                        name={currentQuestion.id}
                        control={control}
                        label={currentQuestion.text}
                        error={errors[currentQuestion.id]?.message}
                        onValueChange={handleQuestionAnswered}
                      />
                    </div>
                  </section>
                ) : (
                  <section className="space-y-4 rounded-2xl border border-white/10 bg-black/35 p-5 shadow-lg backdrop-blur-sm md:p-6">
                    <div className="inline-flex rounded-full border border-green-500/25 bg-green-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-green-300">
                      Assessment Complete
                    </div>
                    <h2 className="text-lg font-medium text-white md:text-xl">
                      All questions answered
                    </h2>
                    <p className="text-sm text-white/65 md:text-base">
                      Review your completion status and submit to generate your AI readiness results.
                    </p>
                  </section>
                )}

                {isCompletionStep && (
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={!isValid || isSaving}
                      className="w-full rounded-lg bg-green-500 px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 md:text-base"
                    >
                      Submit Assessment
                    </button>
                  </div>
                )}
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
