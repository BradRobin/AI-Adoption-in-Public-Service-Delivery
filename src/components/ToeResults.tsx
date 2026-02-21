'use client'

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import type { DimensionScores } from '@/lib/toe-scoring'

/**
 * Props for the ToeResults component.
 */
type ToeResultsProps = {
  overall: number
  dimensionScores: DimensionScores
  interpretation: string
  onRetake: () => void
}

const DIMENSION_LABELS: Record<keyof DimensionScores, string> = {
  technological: 'Technological',
  organizational: 'Organizational',
  environmental: 'Environmental',
}

/**
 * ToeResults Component
 * Displays the assessment results using a bar chart (Recharts).
 * Shows overall score, individual dimension scores, and a text interpretation.
 */
export function ToeResults({
  overall,
  dimensionScores,
  interpretation,
  onRetake,
}: ToeResultsProps) {
  const chartData = (
    ['technological', 'organizational', 'environmental'] as const
  ).map((key) => ({
    name: DIMENSION_LABELS[key],
    value: dimensionScores[key],
  }))

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-white md:text-3xl">
          {overall}% Ready
        </h2>
        <p className="mt-1 text-sm text-white/80">
          Overall AI Readiness Score
        </p>
      </div>

      <div className="h-48 w-full sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              domain={[0, 5]}
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
              tickLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={96}
              tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
            />
            <Bar
              dataKey="value"
              fill="rgba(255,255,255,0.4)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/40 px-4 py-3">
        <p className="text-sm text-white/90 md:text-base">{interpretation}</p>
      </div>

      <button
        type="button"
        onClick={onRetake}
        className="w-full rounded-lg border border-white/30 bg-white/5 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10 md:text-base"
      >
        Retake Assessment
      </button>
    </div>
  )
}
