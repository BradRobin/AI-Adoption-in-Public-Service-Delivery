'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { ParticleBackground } from '@/components/ParticleBackground'
import type { Session } from '@supabase/supabase-js'
import { DashboardCharts } from '@/components/DashboardCharts'
import { InstallPrompt } from '@/components/InstallPrompt'
import { ServiceHub } from '@/components/ServiceHub'

export default function Dashboard() {
    const router = useRouter()
    const [session, setSession] = useState<Session | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [latestAssessment, setLatestAssessment] = useState<{
        score: number
        dimension_scores: any
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
                    // eslint-disable-next-line no-console
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
                .select('score, dimension_scores')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            if (!error && data) {
                setLatestAssessment(data)
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
                    const newAssessment = payload.new as { score: number; dimension_scores: any }
                    setLatestAssessment({
                        score: newAssessment.score,
                        dimension_scores: newAssessment.dimension_scores,
                    })
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

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        toast.success('You have been signed out.')
        router.replace('/login')
    }

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
                            className="flex h-12 min-w-[140px] items-center justify-center rounded-lg bg-green-500 px-6 font-medium text-white transition-colors hover:bg-green-600"
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

    return (
        <div className="relative min-h-screen w-full bg-black font-sans text-white selection:bg-green-500/30">
            <ParticleBackground />

            {/* Navigation */}
            <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                <div className="text-xl font-bold tracking-tight text-white">PARP</div>
                <div className="flex items-center gap-4">
                    <span className="hidden text-sm text-white/60 sm:inline-block">
                        {session.user?.email}
                    </span>
                    <button
                        onClick={handleSignOut}
                        className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10"
                    >
                        Sign Out
                    </button>
                </div>
            </nav>

            <InstallPrompt />

            {/* Main Content */}
            <main className="relative z-10 mx-auto max-w-5xl px-6 py-12">
                {/* Welcome Section */}
                <div className={`mb-12 text-center transition-all duration-700 ease-out ${isGreetingVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    <h1 className="text-3xl font-bold sm:text-5xl md:text-6xl">
                        Welcome back, <span className="text-green-400">{displayName}</span>
                    </h1>
                    <p className="mt-4 text-lg text-white/70">
                        Ready to continue your AI adoption journey?
                    </p>
                </div>

                {/* Dashboard Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

                    {/* Market Stats / Adoption Insight (Always Visible) */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-3">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:border-white/20">
                            <h2 className="mb-4 text-xl font-semibold text-white">
                                Kenya AI Adoption Insight
                            </h2>
                            <div className="flex flex-col gap-6 md:flex-row md:items-center">
                                <div className="flex-1 space-y-2">
                                    <p className="text-3xl font-bold text-green-400">{marketStats.ai_adoption_rate.value}</p>
                                    <p className="text-white/80">
                                        of Kenyan businesses are already using ChatGPT or similar tools.
                                    </p>
                                    <p className="text-xs text-white/50">
                                        Source: {marketStats.ai_adoption_rate.source}
                                    </p>
                                </div>
                                <div className="h-px w-full bg-white/10 md:h-24 md:w-px"></div>
                                <div className="flex-1 space-y-3">
                                    <p className="text-sm font-semibold text-white/90">Latest Policy Update:</p>
                                    <p className="text-white">
                                        {marketStats.policy_update.value}
                                    </p>
                                    <p className="text-xs text-white/50">
                                        Source: {marketStats.policy_update.source}
                                    </p>
                                    {!latestAssessment && (
                                        <Link
                                            href="/assess"
                                            className="mt-2 inline-flex items-center justify-center rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-green-400"
                                        >
                                            Check My Readiness
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Service Hub Section */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-3">
                        <ServiceHub />
                    </div>

                    {/* Charts (Conditional) */}
                    {latestAssessment && (
                        <div className="col-span-1 md:col-span-2 lg:col-span-3">
                            <DashboardCharts
                                overall={latestAssessment.score}
                                dimensionScores={latestAssessment.dimension_scores}
                            />
                        </div>
                    )}

                    {/* Action Card: Assessment */}
                    <Link
                        href="/assess"
                        className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-green-900/40 to-black p-8 transition hover:border-green-500/50 hover:shadow-lg hover:shadow-green-900/20"
                    >
                        <div className="relative z-10">
                            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/20 text-green-400 group-hover:bg-green-500 group-hover:text-black transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                                </svg>
                            </div>
                            <h3 className="mb-2 text-xl font-bold text-white">Take Assessment</h3>
                            <p className="text-sm text-white/70">
                                Evaluate your organization&apos;s readiness using the TOE framework. Get detailed scores and insights.
                            </p>
                        </div>
                        <div className="absolute inset-0 z-0 bg-green-500/5 opacity-0 transition group-hover:opacity-100"></div>
                    </Link>

                    {/* Action Card: Chat */}
                    <Link
                        href="/chat"
                        className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-blue-900/40 to-black p-8 transition hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-900/20"
                    >
                        <div className="relative z-10">
                            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-black transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                                </svg>
                            </div>
                            <h3 className="mb-2 text-xl font-bold text-white">Chat with AI</h3>
                            <p className="text-sm text-white/70">
                                Get instant answers about AI adoption, regulations, and implementation strategies in Kenya.
                            </p>
                        </div>
                        <div className="absolute inset-0 z-0 bg-blue-500/5 opacity-0 transition group-hover:opacity-100"></div>
                    </Link>

                    {/* Feedback Link (Secondary) */}
                    <div className="col-span-1 flex items-center justify-center p-4 md:col-span-2 lg:col-span-3">
                        <a
                            href={process.env.NEXT_PUBLIC_FEEDBACK_URL || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-white/40 hover:text-white hover:underline"
                        >
                            Provide Feedback on Beta
                        </a>
                    </div>

                </div>
            </main>
        </div>
    )
}
