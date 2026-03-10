'use client'

import { useEffect, useState } from 'react'
import { Newspaper, ExternalLink, RefreshCw, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

/**
 * Represents a single news item sourced from the RSS feed.
 */
type NewsItem = {
    title: string
    link: string
    pubDate: string
    source: string
    snippet?: string
}

/**
 * Removes trailing source attribution from snippet text.
 * Handles patterns like "... - Daily Nation" or "... | TechCrunch"
 * @param snippet - The raw snippet text
 * @param source - The source name to remove
 * @returns Cleaned snippet without duplicate source
 */
function cleanSnippet(snippet: string | undefined, source: string): string {
    if (!snippet) return ''

    let cleaned = snippet.trim()

    // Remove trailing source patterns: "- Source", "| Source", "— Source"
    const patterns = [
        new RegExp(`\\s*[-–—|]\\s*${escapeRegex(source)}\\s*$`, 'i'),
        new RegExp(`\\s*\\[${escapeRegex(source)}\\]\\s*$`, 'i'),
        new RegExp(`\\s*\\(${escapeRegex(source)}\\)\\s*$`, 'i'),
    ]

    for (const pattern of patterns) {
        cleaned = cleaned.replace(pattern, '')
    }

    // Truncate to ~180 chars with word boundary
    if (cleaned.length > 180) {
        cleaned = cleaned.substring(0, 177)
        const lastSpace = cleaned.lastIndexOf(' ')
        if (lastSpace > 140) {
            cleaned = cleaned.substring(0, lastSpace)
        }
        cleaned += '...'
    }

    return cleaned.trim()
}

/**
 * Escapes special regex characters in a string.
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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

            <div className="space-y-3">
                {isLoading && news.length === 0 ? (
                    // Loading skeletons
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="animate-pulse rounded-lg bg-white/5 p-4">
                            <div className="h-4 w-3/4 rounded bg-white/10 mb-3" />
                            <div className="h-3 w-full rounded bg-white/5 mb-2" />
                            <div className="h-3 w-2/3 rounded bg-white/5 mb-3" />
                            <div className="h-3 w-1/3 rounded bg-white/5" />
                        </div>
                    ))
                ) : error ? (
                    <div className="text-center py-8 bg-black/20 rounded-lg">
                        <p className="text-white/50 text-sm mb-3">Unable to load news</p>
                        <button
                            onClick={fetchNews}
                            className="text-orange-400 text-sm hover:underline inline-flex items-center gap-1"
                        >
                            <RefreshCw size={14} /> Try again
                        </button>
                    </div>
                ) : (
                    news.map((item, index) => {
                        const cleanedSnippet = cleanSnippet(item.snippet, item.source)

                        return (
                            <motion.article
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="group rounded-lg border border-white/5 bg-black/30 p-4 transition-all hover:border-orange-500/30 hover:bg-white/5"
                                aria-labelledby={`news-title-${index}`}
                            >
                                {/* Source & Date - Single clean display */}
                                <div className="flex items-center gap-2 text-xs mb-2">
                                    <span className="font-medium text-orange-400">{item.source || 'News'}</span>
                                    <span className="text-white/30">•</span>
                                    <time className="text-white/50" dateTime={item.pubDate}>
                                        {item.pubDate}
                                    </time>
                                </div>

                                {/* Title */}
                                <h3
                                    id={`news-title-${index}`}
                                    className="text-base font-semibold leading-snug text-white group-hover:text-orange-400 transition-colors line-clamp-2"
                                >
                                    {item.title}
                                </h3>

                                {/* Snippet - cleaned, no duplicate source */}
                                {cleanedSnippet && (
                                    <p className="mt-2 text-sm text-white/60 leading-relaxed line-clamp-2">
                                        {cleanedSnippet}
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
                                        className="transition-transform group-hover/link:translate-x-0.5"
                                        aria-hidden="true"
                                    />
                                </a>
                            </motion.article>
                        )
                    })
                )}

                {news.length === 0 && !isLoading && !error && (
                    <p className="text-center text-sm text-white/50 py-6 bg-black/20 rounded-lg">
                        No news available at the moment.
                    </p>
                )}
            </div>

            <a
                href="https://news.google.com/search?q=AI+Kenya+public+services"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block text-center text-xs text-white/30 hover:text-white hover:underline transition-colors"
            >
                View more on Google News
            </a>
        </div>
    )
}
