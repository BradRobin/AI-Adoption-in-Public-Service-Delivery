/**
 * @file NewsFeed.tsx
 * @description Real-time news feed component displaying AI and public service news.
 * Fetches articles from the internal /api/news endpoint which proxies Google News RSS.
 * Features loading skeletons, error handling, and manual refresh capability.
 */

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Newspaper, RefreshCw, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from '@/lib/toast'

/**
 * Represents a single news item sourced from the RSS feed.
 */
type NewsItem = {
    /** Article headline text */
    title: string
    /** URL to the full article */
    link: string
    /** Formatted publication date */
    pubDate: string
    /** News outlet name */
    source: string
    /** Optional article summary/excerpt */
    snippet?: string
}

/**
 * NewsFeed Component
 * Fetches and displays the latest AI and Tech news relevant to Kenya.
 * Uses the internal /api/news route which acts as a proxy/parser for Google News RSS.
 */
export function NewsFeed() {
    const [news, setNews] = useState<NewsItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
    const cardRefs = useRef<Array<HTMLElement | null>>([])

    const fetchNews = async () => {
        setIsLoading(true)
        setError(false)
        try {
            const res = await fetch('/api/news', { cache: 'no-store' })
            if (!res.ok) throw new Error('Failed to fetch news')
            const data = await res.json()
            setNews(data.news)
        } catch (err) {
            console.error(err)
            setError(true)
            toast.error('Failed to load news feed')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchNews()
    }, [])

    const kenyaContext = useMemo(() => {
        return news.map((item) => {
            const title = `${item.title} ${item.snippet || ''}`.toLowerCase()

            if (/health|hospital|nhif|medical|clinic|patient/.test(title)) {
                return 'Stronger digital health services can reduce wait times and improve care access nationwide.'
            }
            if (/education|school|student|teacher|university|learning/.test(title)) {
                return 'Smart education tools can improve learning outcomes in both urban and rural counties.'
            }
            if (/agri|farm|food|maize|drought|climate/.test(title)) {
                return 'Data-driven agriculture helps farmers plan better and protect food security in Kenya.'
            }
            if (/transport|traffic|road|mobility|nairobi/.test(title)) {
                return 'Better digital planning can ease congestion and make daily movement more predictable.'
            }
            if (/government|public|service|ecitizen|county/.test(title)) {
                return 'Efficient digital public services save citizens time and improve trust in institutions.'
            }

            return 'This signals how AI adoption is shaping service delivery, jobs, and citizen experience in Kenya.'
        })
    }, [news])

    const handleSurpriseMe = () => {
        if (news.length === 0) return

        let randomIndex = Math.floor(Math.random() * news.length)
        if (news.length > 1 && selectedIndex !== null && randomIndex === selectedIndex) {
            randomIndex = (randomIndex + 1) % news.length
        }

        setSelectedIndex(randomIndex)

        const targetCard = cardRefs.current[randomIndex]
        if (targetCard) {
            targetCard.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center',
            })
        }
    }

    return (
        <div className="h-full rounded-2xl border border-orange-300/15 bg-[radial-gradient(circle_at_12%_0%,rgba(251,146,60,0.16),transparent_38%),linear-gradient(155deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur-md">
            {/* Header */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                    <Newspaper className="text-orange-400" aria-hidden="true" />
                    AI & Public Service News
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSurpriseMe}
                        disabled={isLoading || news.length === 0}
                        className="mobile-touch-target inline-flex items-center gap-1.5 rounded-lg border border-orange-300/25 bg-orange-400/10 px-3 py-2 text-xs font-semibold tracking-wide text-orange-200 transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300/45 hover:bg-orange-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Show a random article"
                    >
                        <Sparkles size={14} aria-hidden="true" />
                        Surprise Me
                    </button>
                    <button
                        onClick={fetchNews}
                        disabled={isLoading}
                        aria-label="Refresh news feed"
                        className="mobile-touch-target rounded-lg p-3 text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} aria-hidden="true" />
                    </button>
                </div>
            </div>

            {/* News List */}
            <div className="space-y-3 md:space-y-0">
                {isLoading && news.length === 0 ? (
                    // Loading skeletons - 3 cards
                    <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 md:mx-0 md:block md:space-y-3 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="w-[84%] shrink-0 snap-center animate-pulse rounded-lg border border-white/5 bg-black/20 p-4 sm:w-[72%] md:w-auto md:shrink md:snap-none">
                                <div className="mb-3 flex items-center gap-2">
                                    <div className="h-3 w-20 rounded bg-orange-500/20" />
                                    <div className="h-3 w-3 rounded-full bg-white/10" />
                                    <div className="h-3 w-16 rounded bg-white/10" />
                                </div>
                                <div className="mb-2 h-5 w-4/5 rounded bg-white/10" />
                                <div className="mb-1 h-4 w-full rounded bg-white/5" />
                                <div className="mb-3 h-4 w-3/4 rounded bg-white/5" />
                                <div className="h-3 w-20 rounded bg-orange-500/10" />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    // Error state
                    <div className="text-center py-10 bg-black/20 rounded-lg border border-red-500/10">
                        <p className="text-white/60 text-sm mb-3">Failed to load news</p>
                        <button
                            onClick={fetchNews}
                            className="mobile-touch-target text-orange-400 text-sm hover:underline inline-flex items-center gap-1.5 font-medium"
                        >
                            <RefreshCw size={14} /> Try again
                        </button>
                    </div>
                ) : (
                    // News cards
                    <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 md:mx-0 md:block md:space-y-3 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
                        {news.map((item, index) => (
                            <motion.article
                                key={index}
                                ref={(el) => {
                                    cardRefs.current[index] = el
                                }}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -4 }}
                                transition={{ delay: index * 0.04, duration: 0.3 }}
                                onHoverStart={() => setHoveredIndex(index)}
                                onHoverEnd={() => setHoveredIndex((current) => (current === index ? null : current))}
                                onFocusCapture={() => setHoveredIndex(index)}
                                onBlurCapture={() => setHoveredIndex((current) => (current === index ? null : current))}
                                className={`group relative w-[84%] shrink-0 snap-center rounded-xl border p-4 transition-all duration-300 sm:w-[72%] md:w-auto md:shrink md:snap-none ${
                                    selectedIndex === index
                                        ? 'border-orange-300/55 bg-orange-500/10 shadow-[0_12px_30px_rgba(251,146,60,0.16)] ring-1 ring-orange-300/40'
                                        : 'border-white/10 bg-black/30 hover:border-orange-300/45 hover:bg-white/5 hover:shadow-[0_10px_24px_rgba(251,146,60,0.12)]'
                                }`}
                            >
                                <motion.div
                                    initial={false}
                                    animate={{ opacity: hoveredIndex === index ? 1 : 0, y: hoveredIndex === index ? 0 : 4 }}
                                    transition={{ duration: 0.18 }}
                                    className="pointer-events-none absolute -top-2 right-3 z-20 hidden max-w-70 rounded-md border border-orange-300/30 bg-black/90 px-3 py-2 text-[11px] text-orange-100 shadow-xl md:block"
                                    role="tooltip"
                                >
                                    <p className="font-semibold text-orange-300">Why this matters in Kenya</p>
                                    <p className="mt-0.5 text-orange-100/90">{kenyaContext[index]}</p>
                                </motion.div>

                                <div className="mb-2 flex items-center gap-2 text-xs">
                                    <span className="font-semibold text-orange-400">{item.source}</span>
                                    <span className="text-white/30">•</span>
                                    <time className="text-white/50">{item.pubDate}</time>
                                </div>

                                <h3 className="line-clamp-2 text-base font-bold leading-snug text-white transition-colors group-hover:text-orange-300">
                                    {item.title}
                                </h3>

                                {item.snippet && (
                                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/65">
                                        {item.snippet}
                                    </p>
                                )}

                                <p className="mt-2 text-xs leading-relaxed text-orange-100/80 md:hidden">
                                    {kenyaContext[index]}
                                </p>

                                <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mobile-touch-target mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-200 transition-colors hover:text-orange-100 group/link"
                                    aria-label={`Read full article: ${item.title}`}
                                >
                                    Read more
                                    <motion.span
                                        aria-hidden="true"
                                        className="inline-block"
                                        initial={false}
                                        animate={{ x: hoveredIndex === index ? 3 : 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        →
                                    </motion.span>
                                </a>
                            </motion.article>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {news.length === 0 && !isLoading && !error && (
                    <p className="text-center text-sm text-white/50 py-8 bg-black/20 rounded-lg">
                        No news available at the moment.
                    </p>
                )}
            </div>

            {/* Footer link */}
            <a
                href="https://news.google.com/search?q=AI+Kenya+public+services"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block text-center text-xs text-white/30 hover:text-white/60 hover:underline transition-colors"
            >
                View more on Google News
            </a>
        </div>
    )
}
