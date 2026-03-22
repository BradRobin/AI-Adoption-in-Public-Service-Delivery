import { getInterpretation, type DimensionScores } from '@/lib/toe-scoring'

export type DemoToeResult = {
  overall: number
  dimensionScores: DimensionScores
  interpretation: string
  generatedAt: string
}

export type DemoChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export type DemoMeta = {
  lastSuggestion?: string
  lastUpdatedAt: string
}

const STORAGE_KEYS = {
  toeResult: 'parp_demo_toe_result',
  chatMessages: 'parp_demo_chat_messages',
  meta: 'parp_demo_meta',
} as const

const DEFAULT_DIMENSION_SCORES: DimensionScores = {
  technological: 3.9,
  organizational: 3.2,
  environmental: 3.6,
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function getNowIso() {
  return new Date().toISOString()
}

function computeOverallFromDimensions(dimensionScores: DimensionScores) {
  const avg =
    (dimensionScores.technological +
      dimensionScores.organizational +
      dimensionScores.environmental) /
    3

  return Math.round(avg * 20)
}

export function createDefaultDemoToeResult(): DemoToeResult {
  return {
    overall: computeOverallFromDimensions(DEFAULT_DIMENSION_SCORES),
    dimensionScores: DEFAULT_DIMENSION_SCORES,
    interpretation: getInterpretation(DEFAULT_DIMENSION_SCORES),
    generatedAt: getNowIso(),
  }
}

export function createDefaultDemoMessages(): DemoChatMessage[] {
  return [
    {
      id: 'demo-welcome',
      role: 'assistant',
      content:
        'Karibu to PARP demo. Ask me about Huduma queues, SHA, NTSA, county AI adoption, or service delivery in Kenya.',
      createdAt: getNowIso(),
    },
  ]
}

export function readDemoToeResult(): DemoToeResult {
  if (typeof window === 'undefined') return createDefaultDemoToeResult()

  const parsed = safeParse<DemoToeResult>(localStorage.getItem(STORAGE_KEYS.toeResult))
  if (!parsed) return createDefaultDemoToeResult()

  if (
    typeof parsed.overall !== 'number' ||
    !parsed.dimensionScores ||
    typeof parsed.interpretation !== 'string'
  ) {
    return createDefaultDemoToeResult()
  }

  return parsed
}

export function writeDemoToeResult(value: DemoToeResult) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.toeResult, JSON.stringify(value))
}

export function readDemoMessages(): DemoChatMessage[] {
  if (typeof window === 'undefined') return createDefaultDemoMessages()

  const parsed = safeParse<DemoChatMessage[]>(localStorage.getItem(STORAGE_KEYS.chatMessages))
  if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
    return createDefaultDemoMessages()
  }

  return parsed
}

export function writeDemoMessages(value: DemoChatMessage[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.chatMessages, JSON.stringify(value))
}

export function readDemoMeta(): DemoMeta {
  if (typeof window === 'undefined') {
    return { lastUpdatedAt: getNowIso() }
  }

  const parsed = safeParse<DemoMeta>(localStorage.getItem(STORAGE_KEYS.meta))
  if (!parsed || typeof parsed.lastUpdatedAt !== 'string') {
    return { lastUpdatedAt: getNowIso() }
  }

  return parsed
}

export function writeDemoMeta(value: DemoMeta) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.meta, JSON.stringify(value))
}

export function clearDemoChatState() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEYS.chatMessages)
  localStorage.removeItem(STORAGE_KEYS.meta)
}
