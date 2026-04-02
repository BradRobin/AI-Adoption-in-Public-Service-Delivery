/**
 * @file dashboard/page.tsx
 * @description Main user dashboard page aggregating assessment results, news, and services.
 * Features real-time updates via Supabase subscriptions and market statistics display.
 * Protected route requiring authentication.
 */

'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import toast from '@/lib/toast'
import { ParticleBackground } from '@/components/ParticleBackground'
import type { Session } from '@supabase/supabase-js'
import { NavigationMenu } from '@/components/NavigationMenu'
import { TypingTagline } from '@/components/TypingTagline'

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
        dimension_scores: {
            technological: number
            organizational: number
            environmental: number
        }
        created_at?: string
        previousScore?: number | null
    } | null>(null)
    const [sessionExpired, setSessionExpired] = useState(false)
    const [redirectTakingLong, setRedirectTakingLong] = useState(false)
    const [isGreetingVisible, setIsGreetingVisible] = useState(true)
    const [marketStats, setMarketStats] = useState<{
        ai_adoption_rate: { value: string; source: string }
        policy_update: { value: string; source: string }
    }>({
        ai_adoption_rate: { value: '41.5%', source: 'Loading...' },
        policy_update: { value: 'Loading...', source: '' },
    })
    const [animatedAdoptionRate, setAnimatedAdoptionRate] = useState(0)

    const parsedAdoptionRate = Number.parseFloat(marketStats.ai_adoption_rate.value)
    const hasValidAdoptionRate = Number.isFinite(parsedAdoptionRate)
    const adoptionRateDecimals = (() => {
        const match = marketStats.ai_adoption_rate.value.match(/-?\d+(?:\.(\d+))?/)
        return match?.[1]?.length ?? 0
    })()
    const adoptionRateDisplay = hasValidAdoptionRate
        ? `${animatedAdoptionRate.toFixed(adoptionRateDecimals)}%`
        : marketStats.ai_adoption_rate.value

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

                    {/* Action Cards (Chat & Assessment) */}
                    <Link
                        href="/assess"
                        className="glass-surface mobile-touch-target group relative overflow-hidden rounded-xl border border-green-300/70 bg-green-950/25 p-8 transition duration-300 shadow-[0_0_44px_rgba(34,197,94,0.6)] hover:border-green-200/95 hover:shadow-[0_0_74px_rgba(34,197,94,0.9)]"
                    >
                        <div className="relative z-10">
                            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/20 text-green-400 group-hover:bg-green-500 group-hover:text-black transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                                </svg>
                            </div>
                            <h3 className="text-tier-1 mb-2 text-xl font-bold">Take Assessment</h3>
                            <p className="text-tier-2 text-sm">
                                Evaluate your organization&apos;s readiness using the TOE framework. Get detailed scores and insights.
                            </p>
                        </div>
                        <div className="absolute inset-0 z-0 bg-green-400/20 opacity-75 blur-2xl transition group-hover:opacity-100"></div>
                    </Link>

                    <Link
                        href="/chat"
                        className="glass-surface mobile-touch-target group relative overflow-hidden rounded-xl border border-red-300/70 bg-red-950/25 p-8 transition duration-300 shadow-[0_0_44px_rgba(239,68,68,0.6)] hover:border-red-200/95 hover:shadow-[0_0_74px_rgba(239,68,68,0.9)]"
                    >
                        <div className="relative z-10">
                            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/20 text-red-400 group-hover:bg-red-500 group-hover:text-black transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                                </svg>
                            </div>
                            <h3 className="text-tier-1 mb-2 text-xl font-bold">Chat with AI</h3>
                            <p className="text-tier-2 text-sm">
                                Get instant answers about AI adoption, regulations, and implementation strategies in Kenya.
                            </p>
                        </div>
                        <div className="absolute inset-0 z-0 bg-red-400/20 opacity-75 blur-2xl transition group-hover:opacity-100"></div>
                    </Link>

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
