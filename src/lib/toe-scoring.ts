import type { ToeSection } from '@/data/toe-questions'
import { TOE_QUESTIONS } from '@/data/toe-questions'

const SECTION_ORDER: ToeSection[] = [
  'technological',
  'organizational',
  'environmental',
]

export type DimensionScores = Record<ToeSection, number>

export type ToeScores = {
  overall: number
  dimensionScores: DimensionScores
}

export type ToeFormValues = Record<string, number>

export function computeScores(data: ToeFormValues): ToeScores {
  const dimensionScores: Partial<DimensionScores> = {}
  let totalSum = 0
  let totalCount = 0

  for (const section of SECTION_ORDER) {
    const questions = TOE_QUESTIONS[section]
    const values = questions
      .map((q) => data[q.id])
      .filter((v): v is number => typeof v === 'number')
    const sum = values.reduce((a, b) => a + b, 0)
    const count = values.length
    const avg = count > 0 ? sum / count : 0
    dimensionScores[section] = avg
    totalSum += sum
    totalCount += count
  }

  const overallAvg = totalCount > 0 ? totalSum / totalCount : 0
  const overall = Math.round(overallAvg * 20)

  return {
    overall: Math.min(100, Math.max(0, overall)),
    dimensionScores: dimensionScores as DimensionScores,
  }
}

const DIMENSION_LABELS: Record<ToeSection, string> = {
  technological: 'technology',
  organizational: 'organizational factors',
  environmental: 'environmental readiness',
}

const STRONG_THRESHOLD = 3.5
const MODERATE_THRESHOLD = 2.5

export function getInterpretation(dimensionScores: DimensionScores): string {
  const entries = SECTION_ORDER.map((s) => ({
    section: s,
    score: dimensionScores[s],
    label: DIMENSION_LABELS[s],
  }))

  const strong = entries.filter((e) => e.score >= STRONG_THRESHOLD)
  const moderate = entries.filter(
    (e) => e.score >= MODERATE_THRESHOLD && e.score < STRONG_THRESHOLD,
  )
  const needsImprovement = entries.filter((e) => e.score < MODERATE_THRESHOLD)

  const parts: string[] = []
  if (strong.length > 0) {
    parts.push(
      `Strong in ${strong.map((e) => e.label).join(' and ')}.`,
    )
  }
  if (moderate.length > 0) {
    parts.push(
      `${moderate.map((e) => e.label).join(' and ')} are moderate.`,
    )
  }
  if (needsImprovement.length > 0) {
    parts.push(
      `Needs improvement in ${needsImprovement.map((e) => e.label).join(' and ')}.`,
    )
  }

  return parts.join(' ') || 'Complete the assessment to see your interpretation.'
}
