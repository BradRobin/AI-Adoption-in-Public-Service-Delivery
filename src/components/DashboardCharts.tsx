'use client'

import {
    Bar,
    BarChart,
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import type { DimensionScores } from '@/lib/toe-scoring'

type DashboardChartsProps = {
    overall: number
    dimensionScores: DimensionScores
}

const DIMENSION_LABELS: Record<keyof DimensionScores, string> = {
    technological: 'Tech',
    organizational: 'Org',
    environmental: 'Env',
}

export function DashboardCharts({
    overall,
    dimensionScores,
}: DashboardChartsProps) {
    const chartData = (
        ['technological', 'organizational', 'environmental'] as const
    ).map((key) => ({
        subject: DIMENSION_LABELS[key],
        A: dimensionScores[key],
        fullMark: 5,
    }))

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Overall Score & Radar Chart */}
            <div className="flex flex-col items-center justify-center space-y-4 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="text-center">
                    <span className="text-4xl font-bold text-green-400">{overall}</span>
                    <span className="text-xl text-white/60"> / 100</span>
                    <p className="text-sm text-white/50">Overall Readiness</p>
                </div>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                            <PolarGrid stroke="rgba(255,255,255,0.1)" />
                            <PolarAngleAxis
                                dataKey="subject"
                                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                            />
                            <PolarRadiusAxis
                                angle={30}
                                domain={[0, 5]}
                                tick={false}
                                axisLine={false}
                            />
                            <Radar
                                name="Score"
                                dataKey="A"
                                stroke="#22c55e"
                                strokeWidth={2}
                                fill="#22c55e"
                                fillOpacity={0.3}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                }}
                                itemStyle={{ color: '#22c55e' }}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bar Breakdown */}
            <div className="flex flex-col justify-center space-y-4 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <h3 className="mb-2 text-lg font-semibold text-white">Dimension Breakdown</h3>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                        >
                            <XAxis type="number" domain={[0, 5]} hide />
                            <YAxis
                                type="category"
                                dataKey="subject"
                                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                                width={40}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{
                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                }}
                            />
                            <Bar
                                dataKey="A"
                                name="Score"
                                fill="#22c55e"
                                radius={[0, 4, 4, 0]}
                                barSize={20}
                                background={{ fill: 'rgba(255,255,255,0.05)' }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
