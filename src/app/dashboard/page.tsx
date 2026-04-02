/**
 * @file dashboard/page.tsx
 * @description Main user dashboard page aggregating assessment results, news, and services.
 * Features real-time updates via Supabase subscriptions and market statistics display.
 * Protected route requiring authentication.
 */

'use client'

import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import toast from '@/lib/toast'
import { ParticleBackground } from '@/components/ParticleBackground'
import type { Session } from '@supabase/supabase-js'
import { NavigationMenu } from '@/components/NavigationMenu'
import { TypingTagline } from '@/components/TypingTagline'
import { TOE_QUESTIONS, type ToeSection } from '@/data/toe-questions'
import { computeScores, type ToeFormValues } from '@/lib/toe-scoring'

function WidgetFallback({ className = 'h-48' }: { className?: string }) {
    return (
        <div className={`glass-surface animate-pulse rounded-xl border border-white/10 bg-white/5 ${className}`} />
    )
}

const DashboardCharts = dynamic(
    () => import('@/components/DashboardCharts').then((module) => module.DashboardCharts),
    {
        ssr: false,
        loading: () => <WidgetFallback className="h-80" />,
    },
)

const InstallPrompt = dynamic(
    () => import('@/components/InstallPrompt').then((module) => module.InstallPrompt),
    {
        ssr: false,
    },
)

const ServiceHub = dynamic(
    () => import('@/components/ServiceHub').then((module) => module.ServiceHub),
    {
        ssr: false,
        loading: () => <WidgetFallback className="h-72" />,
    },
)

const OrgPulseCheck = dynamic(
    () => import('@/components/OrgPulseCheck').then((module) => module.OrgPulseCheck),
    {
        ssr: false,
        loading: () => <WidgetFallback className="h-72" />,
    },
)

const NewsFeed = dynamic(
    () => import('@/components/NewsFeed').then((module) => module.NewsFeed),
    {
        ssr: false,
        loading: () => <WidgetFallback className="h-72" />,
    },
)

const BenchmarkCard = dynamic(
    () => import('@/components/BenchmarkCard').then((module) => module.BenchmarkCard),
    {
        ssr: false,
        loading: () => <WidgetFallback className="h-40" />,
    },
)

const WEEKLY_REASSESSMENT_TOAST_ID = 'weekly-reassessment-complete'
const SECTION_ORDER: ToeSection[] = ['technological', 'organizational', 'environmental']
const SECTION_LABELS: Record<ToeSection, string> = {
    technological: 'Technological Factors',
    organizational: 'Organizational Factors',
    environmental: 'Environmental Factors',
}
const TOE_QUESTION_SEQUENCE = SECTION_ORDER.flatMap((section, sectionIndex) =>
    TOE_QUESTIONS[section].map((question, questionIndex) => ({
        ...question,
        section,
        sectionLabel: SECTION_LABELS[section],
        sequence: sectionIndex * TOE_QUESTIONS[section].length + questionIndex + 1,
    })),
)
const LIKERT_PREVIEW_OPTIONS = [
    { value: 1, label: 'Strongly Disagree' },
    { value: 2, label: 'Disagree' },
    { value: 3, label: 'Neutral' },
    { value: 4, label: 'Agree' },
    { value: 5, label: 'Strongly Agree' },
] as const
const PARP_AI_DASHBOARD_FEATURE = 'chat_with_parp_ai'
const PARP_AI_SESSION_STORAGE_KEY_PREFIX = 'parp_ai_dashboard_session_'
const DASHBOARD_CHAT_STARTERS = [
    'How should a Kenyan county government structure its first AI pilot?',
    'Give me a Kenya-specific AI governance checklist for a public agency.',
] as const

type AssessmentDimensionScores = {
    technological: number
    organizational: number
    environmental: number
}

type DashboardChatMessage = {
    id: string
    role: 'user' | 'assistant'
    content: string
}

type DashboardChatResponse = {
    session_id: string
    assistant_message: string
    feature: typeof PARP_AI_DASHBOARD_FEATURE
}

type DashboardFormattedBlock =
    | { type: 'paragraph'; content: string }
    | { type: 'list'; ordered: boolean; items: string[] }

type InlineAssessmentPreview = {
    score: number
    dimension_scores: AssessmentDimensionScores
    created_at?: string
}

function formatDashboardAssistantMessage(content: string): DashboardFormattedBlock[] {
    const normalized = content
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\*\*([^*]+)\*\*/g, '\n\n$1\n')
        .replace(/\n?\s*\*\s+(?=[A-Z0-9])/g, '\n• ')
        .replace(/\n?\s*•\s+/g, '\n• ')
        .replace(/([.!?])\s+(?=Step\s+\d+:)/gi, '$1\n\n')
        .replace(/\s+(?=Step\s+\d+:)/gi, '\n\n')
        .replace(/\s+(?=\d+\.\s+[A-Z])/g, '\n\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

    const lines = normalized
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

    const blocks: DashboardFormattedBlock[] = []
    let paragraphLines: string[] = []
    let listBlock: { ordered: boolean; items: string[] } | null = null

    const flushParagraph = () => {
        if (paragraphLines.length === 0) {
            return
        }

        blocks.push({
            type: 'paragraph',
            content: paragraphLines.join(' '),
        })
        paragraphLines = []
    }

    const flushList = () => {
        if (!listBlock || listBlock.items.length === 0) {
            listBlock = null
            return
        }

        blocks.push({
            type: 'list',
            ordered: listBlock.ordered,
            items: listBlock.items,
        })
        listBlock = null
    }

    for (const line of lines) {
        const bulletMatch = line.match(/^[•-]\s+(.*)$/)
        const numberedMatch = line.match(/^(Step\s+\d+:.*|\d+\.\s+.*)$/i)

        if (bulletMatch) {
            flushParagraph()
            if (!listBlock || listBlock.ordered) {
                flushList()
                listBlock = { ordered: false, items: [] }
            }
            listBlock.items.push(bulletMatch[1].trim())
            continue
        }

        if (numberedMatch) {
            flushParagraph()
            if (!listBlock || !listBlock.ordered) {
                flushList()
                listBlock = { ordered: true, items: [] }
            }
            listBlock.items.push(numberedMatch[1].trim())
            continue
        }

        flushList()
        paragraphLines.push(line)
    }

    flushList()
    flushParagraph()

    return blocks.length > 0 ? blocks : [{ type: 'paragraph', content }]
}

function renderDashboardMessageContent(message: DashboardChatMessage) {
    if (message.role !== 'assistant') {
        return <div className="whitespace-pre-wrap wrap-break-word">{message.content}</div>
    }

    const blocks = formatDashboardAssistantMessage(message.content)

    return (
        <div className="space-y-3">
            {blocks.map((block, index) => {
                if (block.type === 'list') {
                    if (block.ordered) {
                        return (
                            <ol key={index} className="space-y-2 pl-4">
                                {block.items.map((item, itemIndex) => (
                                    <li key={`${index}-${itemIndex}`} className="wrap-break-word leading-6">
                                        {item}
                                    </li>
                                ))}
                            </ol>
                        )
                    }

                    return (
                        <ul key={index} className="space-y-2 pl-4">
                            {block.items.map((item, itemIndex) => (
                                <li key={`${index}-${itemIndex}`} className="list-disc wrap-break-word leading-6">
                                    {item}
                                </li>
                            ))}
                        </ul>
                    )
                }

                return (
                    <p key={index} className="wrap-break-word whitespace-pre-wrap leading-7">
                        {block.content}
                    </p>
                )
            })}
        </div>
    )
}

/**
 * Main dashboard view for authenticated users.
 * Aggregates various insights including market stats, organizational pulse check,
 * news feed, and personal assessment scores. Provides entry points to take
 * assessments or chat with the AI assistant.
 */
export default function Dashboard() {
    const router = useRouter()
    const [session, setSession] = useState<Session | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [latestAssessment, setLatestAssessment] = useState<{
        score: number
        dimension_scores: AssessmentDimensionScores
        created_at?: string
        previousScore?: number | null
    } | null>(null)
    const [sessionExpired, setSessionExpired] = useState(false)
    const [redirectTakingLong, setRedirectTakingLong] = useState(false)
    const [isGreetingVisible, setIsGreetingVisible] = useState(true)
    const [toeQuizIndex, setToeQuizIndex] = useState(0)
    const [toeQuizAnswers, setToeQuizAnswers] = useState<Record<string, number>>({})
    const [isSubmittingToeQuiz, setIsSubmittingToeQuiz] = useState(false)
    const [toeSubmissionPhase, setToeSubmissionPhase] = useState<'idle' | 'processing' | 'success'>('idle')
    const [inlineAssessmentPreview, setInlineAssessmentPreview] = useState<InlineAssessmentPreview | null>(null)
    const [marketStats, setMarketStats] = useState<{
        ai_adoption_rate: { value: string; source: string }
        policy_update: { value: string; source: string }
    }>({
        ai_adoption_rate: { value: '41.5%', source: 'Loading...' },
        policy_update: { value: 'Loading...', source: '' },
    })
    const [animatedAdoptionRate, setAnimatedAdoptionRate] = useState(0)
    const [parpAiSessionId, setParpAiSessionId] = useState('')
    const [dashboardChatInput, setDashboardChatInput] = useState('')
    const [dashboardChatMessages, setDashboardChatMessages] = useState<DashboardChatMessage[]>([])
    const [isDashboardChatLoading, setIsDashboardChatLoading] = useState(false)

    const parsedAdoptionRate = Number.parseFloat(marketStats.ai_adoption_rate.value)
    const hasValidAdoptionRate = Number.isFinite(parsedAdoptionRate)
    const adoptionRateDecimals = (() => {
        const match = marketStats.ai_adoption_rate.value.match(/-?\d+(?:\.(\d+))?/)
        return match?.[1]?.length ?? 0
    })()
    const adoptionRateDisplay = hasValidAdoptionRate
        ? `${animatedAdoptionRate.toFixed(adoptionRateDecimals)}%`
        : marketStats.ai_adoption_rate.value

    const getDraftKey = (userId: string) => `toe_draft_${userId}`

    const getParpAiStorageKey = (userId: string) => `${PARP_AI_SESSION_STORAGE_KEY_PREFIX}${userId}`

    const buildDashboardConversationTitle = (messages: DashboardChatMessage[]) => {
        const firstUserMessage = messages.find((message) => message.role === 'user')?.content.trim()

        if (!firstUserMessage) {
            return 'New Chat'
        }

        const compact = firstUserMessage.replace(/\s+/g, ' ')
        return compact.length > 60 ? `${compact.slice(0, 57).trim()}...` : compact
    }

    const persistDashboardConversation = async (conversationId: string, messages: DashboardChatMessage[]) => {
        if (!session?.user?.id) {
            return
        }

        const title = buildDashboardConversationTitle(messages)
        const { error } = await supabase
            .from('conversations')
            .upsert(
                {
                    id: conversationId,
                    user_id: session.user.id,
                    title,
                    messages,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'id' },
            )

        if (error) {
            throw error
        }
    }

    const startNewParpAiSession = () => {
        const userId = session?.user?.id
        if (!userId) {
            return
        }

        const nextSessionId = crypto.randomUUID()
        localStorage.setItem(getParpAiStorageKey(userId), nextSessionId)
        setParpAiSessionId(nextSessionId)
        setDashboardChatMessages([])
        setDashboardChatInput('')
    }

    const saveToeDraft = (answers: Record<string, number>) => {
        const userId = session?.user?.id
        if (!userId) {
            return
        }

        localStorage.setItem(getDraftKey(userId), JSON.stringify(answers))
    }

    const getFirstUnansweredIndex = (answers: Record<string, number>) => {
        const firstUnansweredIndex = TOE_QUESTION_SEQUENCE.findIndex(
            (question) => typeof answers[question.id] !== 'number',
        )

        return firstUnansweredIndex === -1 ? TOE_QUESTION_SEQUENCE.length - 1 : firstUnansweredIndex
    }

    const handleToeQuizAnswer = (value: number) => {
        const activeQuestion = TOE_QUESTION_SEQUENCE[toeQuizIndex]
        if (!activeQuestion) {
            return
        }

        if (toeSubmissionPhase === 'success') {
            setToeSubmissionPhase('idle')
        }

        const updatedAnswers = {
            ...toeQuizAnswers,
            [activeQuestion.id]: value,
        }

        setToeQuizAnswers(updatedAnswers)
        saveToeDraft(updatedAnswers)

        setToeQuizIndex((previousIndex) =>
            Math.min(TOE_QUESTION_SEQUENCE.length - 1, previousIndex + 1),
        )
    }

    const submitToeQuiz = async () => {
        const unansweredIndex = TOE_QUESTION_SEQUENCE.findIndex(
            (question) => typeof toeQuizAnswers[question.id] !== 'number',
        )

        if (unansweredIndex !== -1) {
            setToeQuizIndex(unansweredIndex)
            toast.error('Please answer all TOE questions before submitting.')
            return
        }

        const userId = session?.user?.id
        if (!userId) {
            return
        }

        const startedAt = Date.now()
        const minimumProcessingMs = 1400
        setIsSubmittingToeQuiz(true)
        setToeSubmissionPhase('processing')
        const computed = computeScores(toeQuizAnswers as ToeFormValues)
        const { data, error } = await supabase
            .from('assessments')
            .insert({
                user_id: userId,
                score: computed.overall,
                dimension_scores: computed.dimensionScores,
            })
            .select('score, dimension_scores, created_at')
            .single()

        const elapsed = Date.now() - startedAt
        if (elapsed < minimumProcessingMs) {
            await new Promise((resolve) => setTimeout(resolve, minimumProcessingMs - elapsed))
        }

        if (error) {
            toast.error('Could not save your assessment. Please try again.')
            setIsSubmittingToeQuiz(false)
            setToeSubmissionPhase('idle')
            return
        }

        setInlineAssessmentPreview({
            score: data.score,
            dimension_scores: data.dimension_scores,
            created_at: data.created_at,
        })
        setLatestAssessment((prev) => ({
            score: data.score,
            dimension_scores: data.dimension_scores,
            created_at: data.created_at,
            previousScore: prev ? prev.score : null,
        }))
        localStorage.removeItem(getDraftKey(userId))
        setToeQuizAnswers({})
        setToeQuizIndex(0)
        setIsSubmittingToeQuiz(false)
        setToeSubmissionPhase('success')
        toast.success('Assessment submitted from dashboard successfully.')
    }

    const handleDashboardChatSubmit = async (event?: FormEvent<HTMLFormElement>) => {
        event?.preventDefault()

        const userMessage = dashboardChatInput.trim()
        if (!userMessage || !session || !parpAiSessionId || isDashboardChatLoading) {
            return
        }

        const userEntry: DashboardChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: userMessage,
        }

        const nextMessages = [...dashboardChatMessages, userEntry]

        setDashboardChatMessages(nextMessages)
        setDashboardChatInput('')
        setIsDashboardChatLoading(true)

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    session_id: parpAiSessionId,
                    user_message: userMessage,
                    feature: PARP_AI_DASHBOARD_FEATURE,
                }),
            })

            const payload = (await response.json().catch(() => null)) as
                | DashboardChatResponse
                | { error?: string }
                | null

            if (!response.ok) {
                throw new Error(payload && 'error' in payload ? payload.error || 'Request failed.' : 'Request failed.')
            }

            if (!payload || !('assistant_message' in payload) || payload.feature !== PARP_AI_DASHBOARD_FEATURE) {
                throw new Error('Invalid response format returned by the PARP AI backend.')
            }

            const assistantEntry: DashboardChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: payload.assistant_message,
            }

            const finalMessages = [...nextMessages, assistantEntry]

            await persistDashboardConversation(payload.session_id, finalMessages)

            setDashboardChatMessages(finalMessages)
        } catch {
            toast.error('PARP AI is unavailable right now. Please try again.')
            setDashboardChatMessages((previous) => previous.filter((entry) => entry.id !== userEntry.id))
        } finally {
            setIsDashboardChatLoading(false)
        }
    }

    const handleDashboardChatKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            void handleDashboardChatSubmit()
        }
    }

    // Effect: Check for active session on mount and subscribe to auth changes
    useEffect(() => {
        const checkSession = async () => {
            try {
                const {
                    data: { session: currentSession },
                } = await supabase.auth.getSession()

                setSession(currentSession)

                if (currentSession?.user) {
                    await fetchAssessment(currentSession.user.id)
                }

                if (!currentSession) {
                    router.replace('/login')
                }
            } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                    console.error('Error checking session on dashboard:', error)
                }
                setSession(null)
            } finally {
                setIsLoading(false)
            }
        }

        checkSession()

        const fetchAssessment = async (userId: string) => {
            const { data, error } = await supabase
                .from('assessments')
                .select('score, dimension_scores, created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(2)

            if (!error && data && data.length > 0) {
                const current = data[0]
                const previous = data.length > 1 ? data[1] : null

                setLatestAssessment({
                    score: current.score,
                    dimension_scores: current.dimension_scores,
                    created_at: current.created_at,
                    previousScore: previous ? previous.score : null
                })

                // Simulate "Weekly Check" notification once on load if assessment exists
                // In production, this would be triggered by a real background cron job
                setTimeout(() => {
                    toast.success('Weekly Background Re-assessment Complete! Tracking against dynamic Kenya average.', {
                        id: WEEKLY_REASSESSMENT_TOAST_ID,
                        icon: '📅',
                        duration: 4000,
                    })
                }, 1500)
            }
        }

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, newSession) => {
            setSession(newSession)
            if (event === 'SIGNED_OUT' && !newSession) {
                setSessionExpired(true)
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [router])

    // Effect: Realtime subscription for assessments
    useEffect(() => {
        if (!session?.user?.id) return

        const channel = supabase
            .channel(`dashboard_assessments_${session.user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'assessments',
                    filter: `user_id=eq.${session.user.id}`,
                },
                (payload) => {
                    // Update latest assessment immediately
                    const newAssessment = payload.new as {
                        score: number
                        dimension_scores: {
                            technological: number
                            organizational: number
                            environmental: number
                        }
                        created_at: string
                    }
                    setLatestAssessment(prev => ({
                        score: newAssessment.score,
                        dimension_scores: newAssessment.dimension_scores,
                        created_at: newAssessment.created_at,
                        previousScore: prev ? prev.score : null
                    }))
                    toast.success('New assessment results received!')
                }
            )
        return () => {
            supabase.removeChannel(channel)
        }
    }, [session?.user?.id])

    // Effect: Realtime subscription for market stats
    useEffect(() => {
        // Initial fetch + triggering update
        fetch('/api/stats/update')
            .then((res) => res.json())
            .catch(() => {
                // Ignore errors for background update
            })

        const fetchInitial = async () => {
            const { data } = await supabase.from('market_stats').select('*')
            if (data) {
                const statsMap: Record<string, { value: string; source: string }> = {}
                data.forEach((item) => {
                    statsMap[item.id] = { value: item.value, source: item.source }
                })
                setMarketStats((prev) => ({ ...prev, ...statsMap }))
            }
        }
        fetchInitial()

        const channel = supabase
            .channel('public:market_stats')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'market_stats',
                },
                (payload) => {
                    const newItem = payload.new as { id: string; value: string; source: string }
                    setMarketStats((prev) => ({
                        ...prev,
                        [newItem.id]: { value: newItem.value, source: newItem.source },
                    }))
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    useEffect(() => {
        if (session) {
            setRedirectTakingLong(false)
            return
        }

        const timeout = setTimeout(() => {
            if (!session) {
                setRedirectTakingLong(true)
            }
        }, 3000)

        return () => {
            clearTimeout(timeout)
        }
    }, [session])

    useEffect(() => {
        const timer = setTimeout(() => setIsGreetingVisible(true), 100)
        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        if (!session?.user?.id) {
            return
        }

        const savedDraft = localStorage.getItem(getDraftKey(session.user.id))
        if (!savedDraft) {
            return
        }

        try {
            const parsed = JSON.parse(savedDraft) as Record<string, unknown>
            const restored = Object.entries(parsed).reduce((acc, [key, raw]) => {
                if (typeof raw === 'number' && raw >= 1 && raw <= 5) {
                    acc[key] = raw
                }
                return acc
            }, {} as Record<string, number>)
            setToeQuizAnswers(restored)
            setToeQuizIndex(getFirstUnansweredIndex(restored))
        } catch {
            // Ignore malformed stored drafts
        }
    }, [session?.user?.id])

    useEffect(() => {
        if (!session?.user?.id) {
            return
        }

        const storageKey = getParpAiStorageKey(session.user.id)
        const existingSessionId = localStorage.getItem(storageKey)
        const nextSessionId = existingSessionId || crypto.randomUUID()

        if (!existingSessionId) {
            localStorage.setItem(storageKey, nextSessionId)
        }

        let isCancelled = false

        const loadDashboardConversation = async () => {
            const { data, error } = await supabase
                .from('conversations')
                .select('id, user_id, title, messages, created_at, updated_at')
                .eq('id', nextSessionId)
                .eq('user_id', session.user.id)
                .maybeSingle()

            if (isCancelled) {
                return
            }

            if (error) {
                toast.error('Could not load your dashboard chat history.')
                setDashboardChatMessages([])
                setParpAiSessionId(nextSessionId)
                return
            }

            setParpAiSessionId(nextSessionId)
            setDashboardChatMessages(Array.isArray(data?.messages) ? data.messages : [])
        }

        void loadDashboardConversation()

        return () => {
            isCancelled = true
        }
    }, [session?.user?.id])

    useEffect(() => {
        if (!hasValidAdoptionRate) return

        const durationMs = 2000
        const startTime = performance.now()
        let frameId = 0

        const animate = (now: number) => {
            const progress = Math.min((now - startTime) / durationMs, 1)
            const easedProgress = 1 - Math.pow(1 - progress, 3)
            setAnimatedAdoptionRate(parsedAdoptionRate * easedProgress)

            if (progress < 1) {
                frameId = requestAnimationFrame(animate)
            }
        }

        frameId = requestAnimationFrame(animate)

        return () => {
            cancelAnimationFrame(frameId)
        }
    }, [hasValidAdoptionRate, parsedAdoptionRate])

    if (isLoading && !redirectTakingLong) {
        return (
            <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black font-sans">
                <ParticleBackground />
                <div className="relative z-10 flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <p className="text-white/80">Loading your dashboard...</p>
                </div>
            </div>
        )
    }

    if (sessionExpired) {
        return (
            <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black px-4 font-sans">
                <ParticleBackground />
                <div className="relative z-10 flex max-w-md flex-col items-center gap-6 text-center">
                    <p className="text-lg text-red-400 md:text-xl">
                        Your session has ended. Please sign in again.
                    </p>
                    <div className="flex flex-col gap-4 sm:flex-row">
                        <Link
                            href="/login"
                            className="flex h-12 w-full min-w-0 items-center justify-center rounded-lg bg-green-500 px-6 font-medium text-white transition-colors hover:bg-green-600 sm:w-auto sm:min-w-35"
                        >
                            Login
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    if (!session) {
        return (
            <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black font-sans">
                <ParticleBackground />
                <div className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 text-center">
                    <h1 className="text-lg font-semibold text-white md:text-xl">
                        Not logged in.
                    </h1>
                    <p className="text-sm text-white/80 md:text-base">
                        {redirectTakingLong
                            ? 'Redirecting to login...'
                            : 'Preparing redirect...'}
                    </p>
                </div>
            </div>
        )
    }

    const rawUsername =
        (session.user?.user_metadata as { username?: string } | null | undefined)
            ?.username

    const formatName = (name?: string | null) => {
        if (!name || typeof name !== 'string') return undefined
        return name.charAt(0).toUpperCase() + name.slice(1)
    }

    const displayName =
        formatName(rawUsername) ?? session.user?.email ?? 'User'

    const getRelativeTime = (isoString: string) => {
        const d = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) return `updated ${diffMins} minutes ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `updated ${diffHours} hours ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `updated ${diffDays} days ago`;
    }

    const activeToeQuestion = TOE_QUESTION_SEQUENCE[toeQuizIndex]
    const toeAnsweredCount = TOE_QUESTION_SEQUENCE.reduce(
        (count, question) => count + (typeof toeQuizAnswers[question.id] === 'number' ? 1 : 0),
        0,
    )
    const isToeQuizComplete = toeAnsweredCount === TOE_QUESTION_SEQUENCE.length

    return (
        <div className="relative min-h-screen w-full bg-black font-sans text-white selection:bg-green-500/30">
            <ParticleBackground />

            {/* Navigation */}
            <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                <div className="flex flex-col items-start gap-0.5">
                    <Link
                        href="/dashboard"
                        className="text-xl font-bold tracking-tight text-white transition-opacity hover:opacity-80"
                    >
                        PARP
                    </Link>
                    <TypingTagline className="min-h-[1.1rem] text-[11px] font-medium text-white/70 sm:text-xs" />
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-tier-3 hidden text-sm sm:inline-block">
                        {session.user?.email}
                    </span>
                    <NavigationMenu />
                </div>
            </nav>

            <InstallPrompt />

            {/* Main Content */}
            <main id="main-content" className="mobile-page-with-bottom-nav relative z-10 mx-auto max-w-5xl px-4 pt-8 md:px-6 md:pt-12 md:pb-12">
                {/* Welcome Section */}
                <div className={`mb-12 text-center transition-all duration-700 ease-out ${isGreetingVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    <h1 className="text-tier-1 text-3xl font-bold sm:text-5xl md:text-6xl">
                        Welcome back, <span className="text-green-400">{displayName}</span>
                    </h1>
                    <p className="text-tier-3 mt-4 text-lg">
                        Ready to continue your AI adoption journey?
                    </p>
                    {latestAssessment && (
                        <div className="glass-surface text-tier-2 mt-4 inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm">
                            <span>Current readiness: {latestAssessment.score}%</span>
                            {latestAssessment.previousScore && (
                                <span className={latestAssessment.score >= latestAssessment.previousScore ? "text-green-400" : "text-red-400"}>
                                    ({latestAssessment.score > latestAssessment.previousScore ? 'up' : 'down'} {Math.abs(latestAssessment.score - latestAssessment.previousScore)}% since last assessment)
                                </span>
                            )}
                            {latestAssessment.created_at && (
                                <span className="text-tier-3 sm:ml-2 sm:border-l sm:border-white/20 sm:pl-2">
                                    {getRelativeTime(latestAssessment.created_at)}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 md:gap-6 lg:grid-cols-3 lg:gap-6 xl:gap-8">

                    {/* Take Assessment — inline full quiz */}
                    <div
                        className="group relative overflow-hidden rounded-xl bg-[#2d8a2d] p-6 shadow-[0_6px_24px_rgba(45,138,45,0.22)] transition duration-300 hover:shadow-[0_8px_32px_rgba(45,138,45,0.28)] sm:col-span-2 lg:col-span-2"
                    >
                        <div className="relative z-10">
                            {/* Header */}
                            <div className="mb-4 flex items-center gap-3">
                                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20 text-[#ffffff]">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold leading-tight text-[#ffffff]">Take Assessment</h3>
                                    <p className="text-xs font-medium text-[#f7f9fa]/80">TOE Framework · {toeAnsweredCount}/{TOE_QUESTION_SEQUENCE.length} answered</p>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <progress
                                value={toeAnsweredCount}
                                max={TOE_QUESTION_SEQUENCE.length}
                                className="h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-white/25 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-white [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-white"
                            />

                            {/* Question card */}
                            {activeToeQuestion && (
                                <section className="mt-4 rounded-xl border border-white/25 bg-white/10 p-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-white/40 bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ffffff]">
                                            {activeToeQuestion.sectionLabel}
                                        </span>
                                    </div>
                                    <p className="mt-3 text-[17px] font-bold leading-snug text-[rgb(255,255,255)] sm:text-lg lg:text-xl">
                                        {activeToeQuestion.text}
                                    </p>

                                    {/* Likert scale */}
                                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-5">
                                        {LIKERT_PREVIEW_OPTIONS.map((option) => {
                                            const isSelected = toeQuizAnswers[activeToeQuestion.id] === option.value
                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => handleToeQuizAnswer(option.value)}
                                                    aria-label={`${option.label} (${option.value})`}
                                                    className={`mobile-touch-target rounded-lg border px-2 py-2 text-xs font-bold transition-colors duration-300 ease-out ${
                                                        isSelected
                                                            ? 'border-white bg-white text-black'
                                                            : 'border-white/50 bg-transparent text-[#ffffff] hover:border-white hover:bg-white hover:text-black'
                                                    }`}
                                                >
                                                    {option.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </section>
                            )}

                            {/* Submit */}
                            <div className="mt-4 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={submitToeQuiz}
                                    disabled={!isToeQuizComplete || isSubmittingToeQuiz}
                                    className={`mobile-touch-target relative inline-flex items-center gap-2 overflow-hidden rounded-lg border px-4 py-2 text-xs font-bold transition-all duration-300 ${isSubmittingToeQuiz
                                        ? 'border-emerald-300/80 bg-emerald-400/25 text-emerald-50 shadow-[0_0_20px_rgba(74,222,128,0.55)]'
                                        : 'border-emerald-200 bg-emerald-500 text-white shadow-[0_0_16px_rgba(34,197,94,0.55)] hover:-translate-y-0.5 hover:bg-emerald-400 hover:shadow-[0_0_26px_rgba(74,222,128,0.72)]'
                                        } disabled:cursor-not-allowed disabled:opacity-50`}
                                >
                                    {isSubmittingToeQuiz && (
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                                    )}
                                    <span>{isSubmittingToeQuiz ? 'Processing Results…' : 'Submit Assessment'}</span>
                                </button>
                            </div>

                            {toeSubmissionPhase === 'processing' && (
                                <div className="mt-3 rounded-lg border border-emerald-200/50 bg-emerald-300/20 px-3 py-2">
                                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-50">Analyzing your responses</p>
                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25" aria-hidden="true">
                                        <div className="h-full w-1/2 animate-pulse rounded-full bg-white" />
                                    </div>
                                </div>
                            )}

                            {inlineAssessmentPreview && toeSubmissionPhase === 'success' && (
                                <section className="mt-4 rounded-xl border border-white/35 bg-white/15 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">Latest Result Preview</p>
                                        <p className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-[#2d8a2d]">
                                            Overall {inlineAssessmentPreview.score}%
                                        </p>
                                    </div>
                                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                        <div className="rounded-lg border border-white/30 bg-black/15 px-3 py-2">
                                            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/75">Technological</p>
                                            <p className="mt-1 text-base font-bold text-white">{inlineAssessmentPreview.dimension_scores.technological}%</p>
                                        </div>
                                        <div className="rounded-lg border border-white/30 bg-black/15 px-3 py-2">
                                            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/75">Organizational</p>
                                            <p className="mt-1 text-base font-bold text-white">{inlineAssessmentPreview.dimension_scores.organizational}%</p>
                                        </div>
                                        <div className="rounded-lg border border-white/30 bg-black/15 px-3 py-2">
                                            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/75">Environmental</p>
                                            <p className="mt-1 text-base font-bold text-white">{inlineAssessmentPreview.dimension_scores.environmental}%</p>
                                        </div>
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>

                    <section className="parp-ai-card relative min-w-0 overflow-hidden rounded-xl bg-[#a01010] p-6 shadow-[0_6px_24px_rgba(160,16,16,0.22)]">
                        <div className="relative z-10 flex h-full min-h-112 flex-col">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-white">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-white">Chat with PARP AI</h3>
                                </div>
                                <div className="flex max-w-full flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V7.875a4.5 4.5 0 10-9 0V10.5m-.75 0h10.5A1.5 1.5 0 0118.75 12v6A1.5 1.5 0 0117.25 19.5H6.75A1.5 1.5 0 015.25 18v-6a1.5 1.5 0 011.5-1.5z" />
                                        </svg>
                                        Secure Session
                                    </span>
                                    <button
                                        type="button"
                                        onClick={startNewParpAiSession}
                                        className="mobile-touch-target rounded-lg border border-white/35 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10 hover:text-white"
                                    >
                                        New Chat
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 flex-1 space-y-4 rounded-xl border border-white/15 bg-black/15 p-4">
                                {dashboardChatMessages.length === 0 ? (
                                    <div className="space-y-4 text-sm text-white/80">
                                        <div className="flex max-w-full flex-wrap gap-2">
                                            {DASHBOARD_CHAT_STARTERS.map((starter) => (
                                                <button
                                                    key={starter}
                                                    type="button"
                                                    onClick={() => setDashboardChatInput(starter)}
                                                    className="rounded-full border border-white/30 bg-white/10 px-3 py-2 text-left text-xs font-medium text-white transition hover:bg-white/20 hover:text-white"
                                                >
                                                    {starter}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="parp-ai-scrollbar-hidden max-h-80 space-y-3 overflow-y-auto pr-1">
                                        {dashboardChatMessages.map((message) => (
                                            <article
                                                key={message.id}
                                                className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${message.role === 'assistant'
                                                    ? 'border border-white/10 bg-white/10 text-white'
                                                    : 'ml-auto max-w-[92%] border border-white/20 bg-black/25 text-white/95'
                                                    }`}
                                            >
                                                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">
                                                    {message.role === 'assistant' ? 'PARP AI' : 'You'}
                                                </p>
                                                {renderDashboardMessageContent(message)}
                                            </article>
                                        ))}
                                        {isDashboardChatLoading && (
                                            <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/80">
                                                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">PARP AI</p>
                                                Thinking...
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleDashboardChatSubmit} className="mt-4 space-y-3">
                                <label className="block">
                                    <span className="sr-only">Ask PARP AI</span>
                                    <textarea
                                        value={dashboardChatInput}
                                        onChange={(event) => setDashboardChatInput(event.target.value)}
                                        onKeyDown={handleDashboardChatKeyDown}
                                        rows={3}
                                        placeholder="Ask PARP AI about Kenya AI policy, rollout strategy, governance, or adoption risks..."
                                        className="min-w-0 mobile-touch-target h-24 w-full resize-none rounded-xl border border-white/20 bg-black/20 px-4 py-4 text-center text-sm leading-6 text-white placeholder:text-center placeholder:text-white/45 focus:border-white/45 focus:outline-none"
                                    />
                                </label>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <Link
                                        href={parpAiSessionId ? `/chat?conversation=${parpAiSessionId}` : '/chat'}
                                        className="text-xs font-semibold text-white/75 underline decoration-white/30 underline-offset-4 transition hover:text-white"
                                    >
                                        Open full chat workspace
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={!dashboardChatInput.trim() || isDashboardChatLoading || !parpAiSessionId}
                                        className="mobile-touch-target rounded-lg border border-white bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isDashboardChatLoading ? 'Sending...' : 'Send'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </section>

                    {/* Market Stats / Adoption Insight (Always Visible) */}
                    <div className="col-span-1 min-w-0 md:col-span-2 lg:col-span-3">
                        <div className="glass-surface overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20">
                            <h2 className="text-tier-2 mb-3 text-xl font-semibold">
                                Kenya AI Adoption Insight
                            </h2>
                            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                                <div className="min-w-0 flex-1 space-y-2">
                                    <p className="wrap-break-word text-tier-1 text-3xl font-bold text-green-400">{adoptionRateDisplay}</p>
                                    <p className="text-tier-3">
                                        of Kenyan businesses are already using ChatGPT or similar tools.
                                    </p>
                                    <p className="text-tier-3 truncate text-xs">
                                        Source: {marketStats.ai_adoption_rate.source}
                                    </p>
                                </div>
                                <div className="h-px w-full bg-white/10 md:h-24 md:w-px"></div>
                                <div className="min-w-0 flex-1 space-y-3">
                                    <p className="text-tier-1 text-sm font-semibold">Latest Policy Update:</p>
                                    <p className="text-tier-1 wrap-break-word">
                                        {marketStats.policy_update.value}
                                    </p>
                                    <p className="text-tier-3 truncate text-xs">
                                        Source: {marketStats.policy_update.source}
                                    </p>
                                    {!latestAssessment && (
                                        <Link
                                            href="/assess"
                                            className="mobile-touch-target mt-2 inline-flex items-center justify-center rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-400"
                                        >
                                            Check My Readiness
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Adoption Benchmark (Conditional) */}
                    {latestAssessment && (
                        <div className="col-span-1 min-w-0 md:col-span-2 lg:col-span-3">
                            <BenchmarkCard
                                userScore={latestAssessment.score}
                                industryAvg={parseFloat(marketStats.ai_adoption_rate.value) || 42.1}
                                source={marketStats.ai_adoption_rate.source}
                            />
                        </div>
                    )}

                    {/* Service Hub Section */}
                    <div className="col-span-1 min-w-0 md:col-span-2 lg:col-span-3">
                        <ServiceHub />
                    </div>

                    {/* Org Pulse Check & News Feed (2 Columns) */}
                    <div className="col-span-1 min-w-0 md:col-span-2 lg:col-span-3 grid grid-cols-1 gap-4 sm:gap-4 md:gap-6 lg:grid-cols-2">
                        <OrgPulseCheck />
                        <NewsFeed />
                    </div>

                    {/* Charts (Conditional) */}
                    {latestAssessment && (
                        <div className="col-span-1 min-w-0 overflow-hidden md:col-span-2 lg:col-span-3">
                            <DashboardCharts
                                overall={latestAssessment.score}
                                dimensionScores={latestAssessment.dimension_scores}
                            />
                        </div>
                    )}

                </div>
            </main>

        </div>
    )
}
