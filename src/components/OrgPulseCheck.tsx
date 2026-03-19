/**
 * @file OrgPulseCheck.tsx
 * @description Organization digital maturity analyzer component.
 * Performs keyword-based heuristic analysis on news mentions to estimate
 * AI adoption levels without requiring expensive LLM API calls.
 */

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, Building, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import toast from '@/lib/toast'

/**
 * The structured shape of the digital maturity assessment.
 */
type AssessmentResult = {
    /** Categorized maturity level: Low, Medium, High, or Unknown */
    level: 'Low' | 'Medium' | 'High' | 'Unknown'
    /** Array of insight strings based on analysis */
    insights: string[]
    /** Array of actionable recommendations */
    recommendations: string[]
    /** Disclaimer about data limitations */
    disclaimer: string
    /** Optional source articles used in analysis */
    sources?: { title: string, link: string, source: string }[]
}

/**
 * Keywords used for heuristic-based digital maturity analysis.
 * AI keywords indicate advanced digital transformation.
 */
const AI_KEYWORDS = ['ai', 'artificial intelligence', 'machine learning', 'chatbot', 'genai', 'automation', 'digital transformation', 'smart', 'data analytics', 'predictive']

/**
 * General technology keywords indicating basic digital presence.
 */
const TECH_KEYWORDS = ['digital', 'online', 'platform', 'app', 'mobile', 'cloud', 'technology', 'innovation', 'ict', 'e-government', 'e-service']

/**
 * Analyzes search results using keyword matching to estimate digital maturity.
 * No LLM required - pure heuristic analysis based on keyword frequency.
 *
 * @param {string} orgName - Name of the organization being analyzed
 * @param {Array} articles - News articles returned from search
 * @returns {AssessmentResult} Structured maturity assessment
 */
function analyzeWithHeuristics(orgName: string, articles: { title: string, link: string, source: string }[]): AssessmentResult {
    if (articles.length === 0) {
        return {
            level: 'Unknown',
            insights: [
                `No recent public mentions found for "${orgName}" related to AI or digital initiatives.`,
                'This could indicate limited public communication about technology adoption.',
                'The organization may be in early stages of digital transformation or maintains a low public profile.'
            ],
            recommendations: [
                'Consider conducting a formal digital maturity assessment.',
                'Explore AI adoption strategies used by similar organizations in Kenya.',
                'Increase public communication about digital initiatives to build stakeholder confidence.'
            ],
            disclaimer: 'This analysis is based on publicly available news mentions. No direct organizational data was accessed.',
            sources: []
        }
    }

    // Count keyword matches across all article titles
    let aiScore = 0
    let techScore = 0
    const insights: string[] = []
    
    const allTitles = articles.map(a => a.title.toLowerCase()).join(' ')
    
    AI_KEYWORDS.forEach(keyword => {
        if (allTitles.includes(keyword)) aiScore++
    })
    
    TECH_KEYWORDS.forEach(keyword => {
        if (allTitles.includes(keyword)) techScore++
    })

    // Determine maturity level based on scores
    let level: AssessmentResult['level']
    if (aiScore >= 3) {
        level = 'High'
        insights.push(`Strong AI presence detected: Found ${aiScore} AI-related keywords in recent news mentions.`)
    } else if (aiScore >= 1 || techScore >= 3) {
        level = 'Medium'
        insights.push(`Moderate digital presence: Found ${aiScore} AI-related and ${techScore} technology keywords in news.`)
    } else if (techScore >= 1) {
        level = 'Low'
        insights.push(`Basic digital presence detected with ${techScore} technology-related mentions.`)
    } else {
        level = 'Low'
        insights.push('Limited technology-related keywords found in recent news coverage.')
    }

    // Add source-specific insights
    articles.forEach((article, i) => {
        const titleLower = article.title.toLowerCase()
        if (titleLower.includes('ai') || titleLower.includes('artificial intelligence')) {
            insights.push(`[${i + 1}] Active AI initiative mentioned: "${article.title.slice(0, 80)}..."`)
        } else if (titleLower.includes('digital') || titleLower.includes('technology')) {
            insights.push(`[${i + 1}] Digital initiative covered: "${article.title.slice(0, 80)}..."`)
        }
    })

    // Cap insights at 4
    const finalInsights = insights.slice(0, 4)

    // Generate recommendations based on level
    const recommendations: string[] = []
    if (level === 'High') {
        recommendations.push('Continue investing in AI capabilities and consider sharing best practices.')
        recommendations.push('Explore advanced AI applications like predictive analytics for service delivery.')
    } else if (level === 'Medium') {
        recommendations.push('Accelerate AI adoption by piloting chatbots or automated service systems.')
        recommendations.push('Partner with local tech hubs or universities for AI capacity building.')
    } else {
        recommendations.push('Start with foundational digital services before advancing to AI.')
        recommendations.push('Conduct staff training on digital tools and data literacy.')
        recommendations.push('Consider implementing basic automation for repetitive processes.')
    }

    return {
        level,
        insights: finalInsights,
        recommendations: recommendations.slice(0, 3),
        disclaimer: 'This analysis is based on keyword analysis of recent news mentions. It provides a surface-level estimate and may not reflect internal digital capabilities.',
        sources: articles
    }
}

/**
 * OrgPulseCheck Component
 * Allows users to enter an organization name to receive a real-time estimation
 * of their digital maturity based on web search results and keyword analysis.
 * Does NOT require an LLM/API key - uses heuristic analysis.
 */
export function OrgPulseCheck() {
    const [orgName, setOrgName] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [result, setResult] = useState<AssessmentResult | null>(null)

    const handleVisitSite = () => {
        const query = `${orgName.trim()} official site`
        window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer')
    }

    const handleDone = () => {
        setOrgName('')
        setResult(null)
    }

    const handleAnalyze = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!orgName.trim() || isLoading) return

        setIsLoading(true)
        setResult(null)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                toast.error('Session expired')
                setIsLoading(false)
                return
            }

            // Fetch search results from Google News RSS
            const searchRes = await fetch(`/api/org-search?q=${encodeURIComponent(orgName)}`)
            const searchData = await searchRes.json()
            const articles = searchData.articles || []

            // Analyze using keyword-based heuristics (no LLM required)
            const analysis = analyzeWithHeuristics(orgName, articles)
            setResult(analysis)

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Unknown error'
            console.error('Org Analysis Error:', errorMessage, e)
            toast.error(`Analysis failed: ${errorMessage}`)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <h2 className="mb-4 text-xl font-semibold text-white flex items-center gap-2">
                <Building className="text-blue-400" />
                Organization Pulse Check
            </h2>
            <p className="text-sm text-white/60 mb-6">
                Enter an organization name to get an instant digital maturity estimate based on public news.
            </p>

            <form onSubmit={handleAnalyze} className="relative mb-6">
                <input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Kenya Revenue Authority, Ministry of Health..."
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-5 py-3 pr-12 text-white placeholder:text-white/30 focus:border-blue-500/50 focus:outline-none"
                />
                <button
                    type="submit"
                    disabled={isLoading || !orgName.trim()}
                    className="absolute right-2 top-2 rounded-lg bg-blue-500/20 p-2 text-blue-400 transition hover:bg-blue-500 hover:text-black disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                </button>
            </form>

            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="rounded-xl bg-black/40 p-5 border border-white/10 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-white/50">Estimated Maturity</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${result.level === 'High' ? 'bg-green-500/20 text-green-400' :
                                    result.level === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-red-500/20 text-red-400'
                                    }`}>
                                    {result.level}
                                </span>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-white mb-2">Key Insights</h4>
                                <ul className="list-disc list-inside text-sm text-white/70 space-y-1">
                                    {result.insights.map((insight, i) => (
                                        <li key={i}>{insight}</li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-white mb-2">Recommendations</h4>
                                <ul className="list-disc list-inside text-sm text-white/70 space-y-1">
                                    {result.recommendations.map((rec, i) => (
                                        <li key={i}>{rec}</li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-white mb-2">Sources</h4>
                                {result.sources && result.sources.length > 0 ? (
                                    <ul className="text-sm text-blue-400 space-y-1">
                                        {result.sources.map((src, i) => (
                                            <li key={i}>
                                                <a href={src.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                    [{i + 1}] {src.title} ({src.source})
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-white/50">No recent public mentions found.</p>
                                )}
                            </div>

                            <div className="flex gap-2 items-start text-[10px] text-white/30 bg-white/5 p-2 rounded-lg">
                                <AlertCircle size={12} className="mt-0.5" />
                                <p>{result.disclaimer}</p>
                            </div>

                            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={handleVisitSite}
                                    className="flex-1 rounded-lg border border-blue-500/30 bg-blue-500/15 px-4 py-2.5 text-sm font-medium text-blue-300 transition hover:border-blue-400/50 hover:bg-blue-500/25"
                                >
                                    Visit Site
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDone}
                                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
