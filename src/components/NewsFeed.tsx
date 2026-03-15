/**
 * @file NewsFeed.tsx
 * @description Real-time news feed component displaying AI and public service news.
 * Fetches articles from the internal /api/news endpoint which proxies Google News RSS.
 * Features loading skeletons, error handling, and manual refresh capability.
 */

'use client'

import { useEffect, useState } from 'react'
import { Newspaper, RefreshCw, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

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

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm h-full">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Newspaper className="text-orange-400" aria-hidden="true" />
                    AI & Public Service News
                </h2>
                <button
                    onClick={fetchNews}
                    disabled={isLoading}
                    aria-label="Refresh news feed"
                    className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} aria-hidden="true" />
                </button>
            </div>

            {/* News List */}
            <div className="space-y-3">
                {isLoading && news.length === 0 ? (
                    // Loading skeletons - 3 cards
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="animate-pulse rounded-lg border border-white/5 bg-black/20 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="h-3 w-20 rounded bg-orange-500/20" />
                                <div className="h-3 w-3 rounded-full bg-white/10" />
                                <div className="h-3 w-16 rounded bg-white/10" />
                            </div>
                            <div className="h-5 w-4/5 rounded bg-white/10 mb-2" />
                            <div className="h-4 w-full rounded bg-white/5 mb-1" />
                            <div className="h-4 w-3/4 rounded bg-white/5 mb-3" />
                            <div className="h-3 w-20 rounded bg-orange-500/10" />
                        </div>
                    ))
                ) : error ? (
                    // Error state
                    <div className="text-center py-10 bg-black/20 rounded-lg border border-red-500/10">
                        <p className="text-white/60 text-sm mb-3">Failed to load news</p>
                        <button
                            onClick={fetchNews}
                            className="text-orange-400 text-sm hover:underline inline-flex items-center gap-1.5 font-medium"
                        >
                            <RefreshCw size={14} /> Try again
                        </button>
                    </div>
                ) : (
                    // News cards
                    news.map((item, index) => (
                        <motion.article
                            key={index}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04, duration: 0.3 }}
                            className="group rounded-lg border border-white/5 bg-black/30 p-4 transition-all duration-200 hover:border-orange-500/30 hover:bg-white/5 hover:shadow-lg hover:shadow-orange-500/5 hover:scale-[1.01]"
                        >
                            {/* Source & Date - ONLY display here, nowhere else */}
                            <div className="flex items-center gap-2 text-xs mb-2">
                                <span className="font-semibold text-orange-400">{item.source}</span>
                                <span className="text-white/30">•</span>
                                <time className="text-white/50">{item.pubDate}</time>
                            </div>

                            {/* Title - clean, no source */}
                            <h3 className="text-base font-semibold leading-snug text-white group-hover:text-orange-400 transition-colors line-clamp-2">
                                {item.title}
                            </h3>

                            {/* Snippet - already cleaned by backend, no source */}
                            {item.snippet && (
                                <p className="mt-2 text-sm text-white/60 leading-relaxed line-clamp-3">
                                    {item.snippet}
                                </p>
                            )}

                            {/* Read more link */}
                            <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-orange-400/80 hover:text-orange-400 transition-colors group/link"
                                aria-label={`Read full article: ${item.title}`}
                            >
                                Read more
                                <ArrowRight
                                    size={12}
                                    className="transition-transform duration-200 group-hover/link:translate-x-1"
                                    aria-hidden="true"
                                />
                            </a>
                        </motion.article>
                    ))
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
