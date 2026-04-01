/**
 * @file DashboardCharts.tsx
 * @description Dashboard visualization component with radar and bar charts.
 * Displays TOE framework assessment scores using Recharts library.
 */

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
import { useTheme } from '@/lib/theme-context'

const CHART_THEME = {
    grid: 'rgba(255,255,255,0.1)',
    gridLight: 'rgba(0,0,0,0.08)',
    text: 'rgba(255,255,255,0.7)',
    textLight: 'rgba(0,0,0,0.6)',
    tooltipBackground: 'rgba(0,0,0,0.8)',
    tooltipBackgroundLight: 'rgba(255,255,255,0.96)',
    tooltipBorder: '1px solid rgba(255,255,255,0.1)',
    tooltipBorderLight: '1px solid rgba(0,0,0,0.08)',
    tooltipText: '#fff',
    tooltipTextLight: '#171717',
    barBackground: 'rgba(255,255,255,0.05)',
    barBackgroundLight: 'rgba(0,0,0,0.05)',
    cursor: 'rgba(255,255,255,0.05)',
    cursorLight: 'rgba(0,0,0,0.04)',
}

/**
 * Props for the DashboardCharts component.
 */
type DashboardChartsProps = {
    overall: number
    dimensionScores: DimensionScores
}

/**
 * Maps the internal dimension keys to short labels used in the radar/bar charts.
 */
const DIMENSION_LABELS: Record<keyof DimensionScores, string> = {
    technological: 'Tech',
    organizational: 'Org',
    environmental: 'Env',
}

/**
 * DashboardCharts Component
 * Renders Recharts visualizations (Radar and Bar charts) to display the user's
 * TOE assessment scores across the three dimensions.
 *
 * @param {DashboardChartsProps} props containing the overall and dimensional scores.
 */
export function DashboardCharts({
    overall,
    dimensionScores,
}: DashboardChartsProps) {
    const { theme } = useTheme()
    const isLightMode = theme === 'light'

    const chartData = (
        ['technological', 'organizational', 'environmental'] as const
    ).map((key) => ({
        subject: DIMENSION_LABELS[key],
        A: dimensionScores[key],
        fullMark: 5,
    }))

    return (
        <div className="grid gap-4 sm:gap-4 md:gap-6 lg:gap-6 xl:gap-8 md:grid-cols-2">
            {/* Overall Score & Radar Chart */}
            <div className="glass-surface flex flex-col items-center justify-center space-y-3 rounded-xl border border-white/10 bg-white/5 p-5 md:space-y-4 md:p-6">
                <div className="text-center">
                    <span className="text-4xl font-bold text-green-400">{overall}</span>
                    <span className="text-tier-2 text-xl"> / 100</span>
                    <p className="text-tier-2 text-sm">Overall Readiness</p>
                </div>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                            <PolarGrid stroke={isLightMode ? CHART_THEME.gridLight : CHART_THEME.grid} />
                            <PolarAngleAxis
                                dataKey="subject"
                                tick={{ fill: isLightMode ? CHART_THEME.textLight : CHART_THEME.text, fontSize: 12 }}
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
                                    backgroundColor: isLightMode ? CHART_THEME.tooltipBackgroundLight : CHART_THEME.tooltipBackground,
                                    border: isLightMode ? CHART_THEME.tooltipBorderLight : CHART_THEME.tooltipBorder,
                                    borderRadius: '8px',
                                    color: isLightMode ? CHART_THEME.tooltipTextLight : CHART_THEME.tooltipText,
                                }}
                                itemStyle={{ color: '#22c55e' }}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bar Breakdown */}
            <div className="glass-surface flex flex-col justify-center space-y-3 rounded-xl border border-white/10 bg-white/5 p-5 md:space-y-4 md:p-6">
                <h3 className="text-tier-1 mb-2 text-lg font-semibold">Dimension Breakdown</h3>
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
                                tick={{ fill: isLightMode ? CHART_THEME.textLight : CHART_THEME.text, fontSize: 12 }}
                                width={40}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: isLightMode ? CHART_THEME.cursorLight : CHART_THEME.cursor }}
                                contentStyle={{
                                    backgroundColor: isLightMode ? CHART_THEME.tooltipBackgroundLight : CHART_THEME.tooltipBackground,
                                    border: isLightMode ? CHART_THEME.tooltipBorderLight : CHART_THEME.tooltipBorder,
                                    borderRadius: '8px',
                                    color: isLightMode ? CHART_THEME.tooltipTextLight : CHART_THEME.tooltipText,
                                }}
                            />
                            <Bar
                                dataKey="A"
                                name="Score"
                                fill="#22c55e"
                                radius={[0, 4, 4, 0]}
                                barSize={20}
                                background={{ fill: isLightMode ? CHART_THEME.barBackgroundLight : CHART_THEME.barBackground }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
