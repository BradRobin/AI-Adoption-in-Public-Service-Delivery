'use client'

import { motion } from 'framer-motion'
import { TrendingUp, Award } from 'lucide-react'

interface BenchmarkCardProps {
    userScore: number
}

export function BenchmarkCard({ userScore }: BenchmarkCardProps) {
    const INDUSTRY_AVG = 42.1 // Based on DataReportal 2024 Kenya Digital Adoption
    const isAboveAvg = userScore >= INDUSTRY_AVG
    const diff = (userScore - INDUSTRY_AVG).toFixed(1)

    return (
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${isAboveAvg ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                    <Award size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white">Adoption Benchmark</h3>
                    <p className="text-xs text-white/50">vs. National Average (Public Sector)</p>
                </div>
            </div>

            <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/70">Your Readiness</span>
                    <span className="font-bold text-white">{userScore.toFixed(1)}%</span>
                </div>
                <div className="relative h-2 w-full rounded-full bg-white/10">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${userScore}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={`absolute h-full rounded-full ${isAboveAvg ? 'bg-green-500' : 'bg-yellow-500'}`}
                    />
                    {/* Marker for Industry Avg */}
                    <div
                        className="absolute top-[-4px] h-4 w-1 bg-white/30"
                        style={{ left: `${INDUSTRY_AVG}%` }}
                        title={`National Avg: ${INDUSTRY_AVG}%`}
                    />
                </div>
                <div className="flex justify-between text-xs mt-1 text-white/30">
                    <span>0%</span>
                    <span style={{ marginLeft: `${INDUSTRY_AVG - 10}%` }}>Avg: {INDUSTRY_AVG}%</span>
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
                AUTO-CHECK: TODAY
            </div>
        </div>
    )
}
