'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, Building, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

/**
 * The structured shape of the digital maturity assessment returned by the AI.
 */
type AssessmentResult = {
    level: 'Low' | 'Medium' | 'High' | 'Unknown'
    insights: string[]
    recommendations: string[]
    disclaimer: string
    sources?: { title: string, link: string, source: string }[]
}

/**
 * OrgPulseCheck Component
 * Allows users to enter an organization name to receive an AI-generated,
 * real-time estimation of their digital maturity based on the TOE framework.
 */
export function OrgPulseCheck() {
    const [orgName, setOrgName] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [result, setResult] = useState<AssessmentResult | null>(null)

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

            // 1. Fetch search results (simulated web + x search)
            const searchRes = await fetch(`/api/org-search?q=${encodeURIComponent(orgName)}`)
            const searchData = await searchRes.json()
            const articles = searchData.articles || []

            let searchContext = ''
            if (articles.length > 0) {
                searchContext = "Recent Web & X Mentions Found:\n" + articles.map((a: any, i: number) => `[${i + 1}] Title: ${a.title} | Source: ${a.source}`).join('\n')
            } else {
                searchContext = "No recent public search results or mentions found on Web/X for this organization."
            }

            // 2. Fetch LLM stream with the injected sources
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: `Analyze: ${orgName}\n\n${searchContext}` }],
                    provider: 'openai',
                    systemPrompt: `You are an AI Digital Maturity Analyst. Estimate digital maturity for the organization using the provided search web/X results.
                    
Your output MUST be a valid JSON object strictly matching this format:
{
  "level": "Low" | "Medium" | "High" | "Unknown",
  "insights": ["List 2-4 key findings regarding their AI/digital adoption. Use inline citations like [1] that map to the provided sources."],
  "recommendations": ["List 2 actionable recommendations, e.g. 'Bolster with local LLM for privacy'"],
  "disclaimer": "This analysis relies on recent public data and surface web mentions. No deep scraping was performed."
}

If 'No recent public search results' is found, provide generic recommendations based on their assumed sector and emphasize the lack of public AI transparency in the insights. Do NOT halucinate sources.`
                }),
            })

            if (!res.ok) throw new Error('Chat API returned error')

            const reader = res.body?.pipeThrough(new TextDecoderStream()).getReader()
            let accumulated = ''

            // Secure, single-pass reading
            while (true) {
                const { value, done } = await reader?.read() || {}
                if (done) break
                accumulated += value
            }

            // Extract data from SSE format safely
            let jsonString = ''
            const parts = accumulated.split('\n\n')
            for (const part of parts) {
                const lines = part.split('\n')
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const rawData = line.slice(6)
                        if (rawData !== '[DONE]' && rawData !== 'ok') {
                            jsonString += rawData
                        }
                    }
                }
            }

            const cleanJson = jsonString.replace(/```json/g, '').replace(/```/g, '').trim()
            const parsed = JSON.parse(cleanJson)

            // Attach sources for UI rendering
            parsed.sources = articles
            setResult(parsed)

        } catch (e) {
            console.error('Org Analysis Error', e)
            toast.error('Analysis failed. Please try again.')
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
                Enter an organization name to get an instant, AI-estimated digital maturity profile.
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
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
