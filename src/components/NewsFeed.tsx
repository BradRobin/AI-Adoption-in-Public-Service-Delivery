'use client'

import { useEffect, useState } from 'react'
import { Newspaper, ExternalLink, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

type NewsItem = {
    title: string
    link: string
    pubDate: string
    source: string
}

export function NewsFeed() {
    const [news, setNews] = useState<NewsItem[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchNews = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/news')
            if (!res.ok) throw new Error('Failed to fetch news')
            const data = await res.json()
            setNews(data.news)
        } catch (error) {
            console.error(error)
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
                    <Newspaper className="text-orange-400" />
                    AI & Tech News (Kenya)
                </h2>
                <button
                    onClick={fetchNews}
                    disabled={isLoading}
                    className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="space-y-3">
                {isLoading && news.length === 0 ? (
                    // skeletons
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-20 animate-pulse rounded-lg bg-white/5" />
                    ))
                ) : (
                    news.map((item, index) => (
                        <motion.a
                            key={index}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="group block rounded-lg border border-white/5 bg-black/20 p-4 transition hover:border-white/20 hover:bg-white/5"
                        >
                            <div className="flex justify-between items-start gap-3">
                                <h3 className="text-sm font-medium text-white group-hover:text-orange-400 line-clamp-2">
                                    {item.title}
                                </h3>
                                <ExternalLink size={14} className="text-white/30 flex-shrink-0 mt-1" />
                            </div>
                            <div className="mt-2 flex items-center gap-3 text-xs text-white/50">
                                <span className="font-semibold text-white/70">{item.source}</span>
                                <span>•</span>
                                <span>{item.pubDate}</span>
                            </div>
                        </motion.a>
                    ))
                )}

                {news.length === 0 && !isLoading && (
                    <p className="text-center text-sm text-white/50 py-4">No news available at the moment.</p>
                )}
            </div>

            <a
                href="https://news.google.com/search?q=AI+Kenya+Technology"
                target="_blank"
                rel="noreferrer"
                className="mt-4 block text-center text-xs text-white/30 hover:text-white hover:underline"
            >
                View more on Google News
            </a>
        </div>
    )
}
