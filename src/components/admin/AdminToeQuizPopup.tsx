/**
 * @file AdminToeQuizPopup.tsx
 * @description Continuous assessment popup for admins to provide quick TOE ratings.
 * Randomly presents questions from the TOE framework and updates assessment scores.
 * Demonstrates "continuous assessment" concept for ongoing readiness tracking.
 */

'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, BrainCircuit } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import toast from '@/lib/toast'
import { pushNotification } from '@/lib/notification-center'
import type { ToeSection } from '@/data/toe-questions'
import { TOE_QUESTIONS } from '@/data/toe-questions'
import type { DimensionScores, ToeScores } from '@/lib/toe-scoring'

/**
 * Routes where the continuous assessment popup may appear.
 * Popup triggers randomly when admins navigate to these pages.
 */
const TRIGGER_ROUTES = ['/dashboard', '/chat', '/privacy']

/**
 * AdminToeQuizPopup Component
 * Floating popup that occasionally prompts admin users with a single TOE question.
 * Answers incrementally update the user's overall assessment scores in real-time.
 */
export function AdminToeQuizPopup() {
    const pathname = usePathname()
    const [isVisible, setIsVisible] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [hasTriggeredRecently, setHasTriggeredRecently] = useState(false)

    // Select a random question for the quiz
    const [quizData, setQuizData] = useState<{
        section: ToeSection,
        questionText: string,
        questionId: string
    } | null>(null)

    // Option state: 1 (Strongly Disagree) to 5 (Strongly Agree)
    const [selectedScore, setSelectedScore] = useState<number | null>(null)

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            setUserId(session.user.id)
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single()

            if (profile?.role === 'admin') {
                setIsAdmin(true)
            }
        }
        checkAdmin()
    }, [])

    useEffect(() => {
        // Only trigger if admin, on a trigger route, and hasn't triggered recently in this session window
        if (!isAdmin || !pathname || hasTriggeredRecently) return

        if (TRIGGER_ROUTES.includes(pathname)) {
            // 30% chance to show up on navigation specifically for demonstration purposes
            // In a real app, you might use a time-based cooldown stored in localStorage
            if (Math.random() > 0.7) {
                // Pick a random question
                const sections: ToeSection[] = ['technological', 'organizational', 'environmental']
                const randomSection = sections[Math.floor(Math.random() * sections.length)]
                const questions = TOE_QUESTIONS[randomSection]
                const randomQuestion = questions[Math.floor(Math.random() * questions.length)]

                setQuizData({
                    section: randomSection,
                    questionText: randomQuestion.text,
                    questionId: randomQuestion.id
                })

                // Slight delay to stage the prompt as a notification instead of opening immediately
                setTimeout(() => {
                    const promptId = `toe-sync-prompt-${randomQuestion.id}`
                    pushNotification({
                        id: promptId,
                        type: 'info',
                        message: `Quick TOE check ready: ${randomQuestion.text} Tap to answer and sync readiness score.`,
                        onView: () => {
                            setQuizData({
                                section: randomSection,
                                questionText: randomQuestion.text,
                                questionId: randomQuestion.id,
                            })
                            setIsVisible(true)
                        },
                    })
                    setHasTriggeredRecently(true)
                }, 1500)
            }
        }
    }, [pathname, isAdmin, hasTriggeredRecently])

    const handleClose = () => {
        setIsVisible(false)
        setSelectedScore(null)
    }

    const handleSubmit = async () => {
        if (!userId || !quizData || selectedScore === null) return

        setIsSubmitting(true)

        try {
            // 1. Fetch latest assessment
            const { data: latestAssessment, error: fetchError } = await supabase
                .from('assessments')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            if (fetchError || !latestAssessment) {
                toast.error("Couldn't find an existing assessment to update.")
                return
            }

            // 2. We'll simulate updating their score based on this one question
            // In a robust system, we would store form values. Here, we tweak the dimension average.
            const oldDims: DimensionScores = latestAssessment.dimension_scores
            const oldSectionAverage = oldDims[quizData.section]

            // Adjust the dimension. If they answered 5, move average up slightly. If 1, move down.
            // Simplified formula: move 10% towards the new answer's value
            const impactWeight = 0.10
            const newSectionAverage = Math.max(1, Math.min(5, (oldSectionAverage * (1 - impactWeight)) + (selectedScore * impactWeight)))

            const newDims: DimensionScores = {
                ...oldDims,
                [quizData.section]: Number(newSectionAverage.toFixed(2))
            }

            // Recalculate overall score (1-5 mapped to 0-100)
            const overallAverage = (newDims.technological + newDims.organizational + newDims.environmental) / 3
            const newOverall = Math.round((overallAverage / 5) * 100)

            // 3. Insert new 'partial update' assessment
            const { error: insertError } = await supabase
                .from('assessments')
                .insert({
                    user_id: userId,
                    score: newOverall,
                    dimension_scores: newDims
                })

            if (insertError) throw insertError

            toast.success(
                (t) => (
                    <div className="flex flex-col gap-1">
                        <span className="font-semibold text-green-400">Readiness Score Updated!</span>
                        <span className="text-sm">Continuous assessment recorded a new data point.</span>
                    </div>
                ),
                { duration: 4000 }
            )
            handleClose()

        } catch (err) {
            console.error(err)
            toast.error("Failed to save response.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <AnimatePresence>
            {isVisible && quizData && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-60 flex items-center justify-center bg-black/35 backdrop-blur-sm px-4"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="w-full max-w-sm rounded-2xl border border-indigo-500/30 bg-black/80 p-5 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl"
                    >
                        <div className="mb-3 flex items-start justify-between">
                            <div className="flex items-center gap-2 text-indigo-400">
                                <BrainCircuit size={18} />
                                <span className="text-xs font-semibold uppercase tracking-wider">Continuous Assessment</span>
                            </div>
                            <button
                                onClick={handleClose}
                                aria-label="Close TOE sync prompt"
                                className="text-white/40 transition-colors hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <h3 className="mb-2 text-lg font-medium text-white leading-tight">
                            Quick Check: {quizData.section}
                        </h3>
                        <p className="mb-5 text-sm text-zinc-300">
                            {quizData.questionText}
                        </p>

                        <div className="flex flex-col gap-3">
                            <div className="relative flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-1">
                                {/* Visual background indicator for selected state */}
                                {selectedScore !== null && (
                                    <motion.div
                                        className="absolute inset-y-1 rounded-md border border-indigo-500/50 bg-indigo-500/20"
                                        layoutId="selectedBackground"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        style={{
                                            width: `calc(20% - 4px)`,
                                            left: `calc(${(selectedScore - 1) * 20}% + 2px)`
                                        }}
                                    />
                                )}

                                {[1, 2, 3, 4, 5].map((score) => (
                                    <button
                                        key={score}
                                        onClick={() => setSelectedScore(score)}
                                        className={`relative z-10 flex-1 py-2 text-sm font-medium transition-colors ${selectedScore === score ? 'text-indigo-300' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        {score}
                                    </button>
                                ))}
                            </div>
                            <div className="flex justify-between px-2 text-[10px] uppercase tracking-wider text-zinc-500">
                                <span>Strongly Disagree</span>
                                <span>Strongly Agree</span>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={selectedScore === null || isSubmitting}
                                className={`mt-2 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${selectedScore !== null
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
                                        : 'cursor-not-allowed border border-white/5 bg-white/5 text-white/30'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <span className="animate-pulse">Updating Profile...</span>
                                ) : (
                                    <>
                                        <CheckCircle size={16} />
                                        <span>Sync Readiness Score</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
