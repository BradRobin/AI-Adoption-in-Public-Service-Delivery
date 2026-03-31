/**
 * @file BenchmarkCard.tsx
 * @description Visual comparison card showing user's AI readiness score vs national average.
 * Provides immediate feedback on how the organization compares to Kenya's public sector benchmark.
 */

'use client'

import { motion } from 'framer-motion'
import { TrendingUp, Award } from 'lucide-react'

/**
 * Props for the BenchmarkCard component.
 */
interface BenchmarkCardProps {
    userScore: number
    industryAvg: number
    source?: string
}

/**
 * BenchmarkCard Component
 * Displays the user's overall AI adoption readiness score compared visually against an established national average.
 *
 * @param {BenchmarkCardProps} props - The component props containing the user's score to evaluate.
 */
export function BenchmarkCard({ userScore, industryAvg, source }: BenchmarkCardProps) {
    const isAboveAvg = userScore >= industryAvg
    const diff = (userScore - industryAvg).toFixed(1)

    return (
        <div className="glass-surface relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 mb-3">
                <div className={`p-2 rounded-lg ${isAboveAvg ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                    <Award size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white">Adoption Benchmark</h3>
                    <p className="text-xs text-white/50">vs. National Average (Public Sector)</p>
                </div>
            </div>

            <div className="mb-4">
                <div className="flex justify-between text-sm mb-2 text-white/80">
                    <span>
                        Your score: <strong className="text-white">{userScore.toFixed(1)}%</strong> vs. Kenya average <strong className="text-white">{industryAvg.toFixed(1)}%</strong>
                    </span>
                </div>
                <div className="relative h-2 w-full rounded-full bg-white/10">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${userScore}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={`absolute h-full rounded-full ${isAboveAvg ? 'bg-green-500' : 'bg-yellow-500'}`}
                        role="progressbar"
                        aria-valuenow={userScore}
                        aria-valuemin={0}
                        aria-valuemax={100}
                    />
                </div>
                <div className="mt-1 flex items-center justify-between gap-3 text-xs text-white/30">
                    <span>0%</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white/50">
                        Kenya avg: {industryAvg.toFixed(1)}%
                    </span>
                    <span>100%</span>
                </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-black/20 p-3 text-sm">
                <TrendingUp size={16} className={isAboveAvg ? 'text-green-400' : 'text-yellow-400'} />
                <p className="text-white/80">
                    You are <strong className={isAboveAvg ? 'text-green-400' : 'text-yellow-400'}>
                        {isAboveAvg ? `${diff}% above` : `${Math.abs(Number(diff))}% below`}
                    </strong> the national average.
                    {isAboveAvg
                        ? " Great job leading the digital transformation!"
                        : " Focus on 'Organization' pillar improvements to catch up."}
                </p>
            </div>

            {/* Simulated 'Last Checked' Badge */}
            <div className="absolute top-4 right-4 text-[10px] text-green-400/60 font-mono border border-green-500/10 px-2 py-0.5 rounded-full">
                BACKGROUND RE-ASSESSMENT: ACTIVE
            </div>
        </div>
    )
}
