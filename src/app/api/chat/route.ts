/**
 * @file api/chat/route.ts
 * @description Streaming chat API endpoint for AI assistant conversations.
 * Supports both local Ollama models and cloud providers via Server-Sent Events (SSE).
 * Includes user context personalization based on role and location.
 */

import { createClient } from '@supabase/supabase-js'

type AuthenticatedUser = {
  id: string
  email?: string | null
  user_metadata?: {
    username?: string
    location?: string
    [key: string]: unknown
  }
}

/**
 * Represents a single message in the chat conversation.
 */
type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type LlmMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Defines the expected JSON payload for the chat endpoint.
 */
type ChatRequestBody = {
  /** Array of conversation messages */
  messages: ChatMessage[]
  /** AI provider selection ('local' for Ollama, 'cloud' for external) */
  provider?: string
  /** Optional custom system prompt override */
  systemPrompt?: string
}

type ParpAiFeature = 'chat_with_parp_ai'

type ParpAiChatRequestBody = {
  session_id: string
  user_message: string
  feature: ParpAiFeature
}

type ParpAiChatResponseBody = {
  session_id: string
  assistant_message: string
  feature: ParpAiFeature
}

type UserChatContext = {
  username: string
  role: string
  location: string
  adoptionRate: number | null
  adoptionRateLabel: string
}

const PARP_AI_FEATURE: ParpAiFeature = 'chat_with_parp_ai'

function generateParpAiSystemInstructions(context: UserChatContext) {
  return `You are PARP AI operating inside the Chat with PARP AI dashboard card for the PARP Platform.

Live user context:
- Username: ${context.username}
- Role: ${context.role}
- Location: ${context.location}
- Latest adoption rate: ${context.adoptionRateLabel}

Mode requirements:
- Answer questions about AI adoption, AI governance, implementation strategy, procurement, regulation, risk management, and rollout planning in Kenya.
- Provide Kenya-specific, practical guidance that a public sector, nonprofit, or private sector team can act on.
- Maintain a professional, advisory tone.
- Ask one focused follow-up question when missing context would materially improve the advice.

Response requirements:
- Return clean, markdown-safe output suitable for direct dashboard rendering.
- Prefer short sections and bullets when they make the answer easier to act on.
- Give actionable next steps, likely stakeholders, implementation risks, and sequencing guidance when relevant.
- Use the live user context when relevant.
- If the user asks for their adoption rate, readiness score, or current score, use the live adoption rate above and do not invent another number.
- Be explicit when you are uncertain.

Safety and policy requirements:
- Do not provide legal advice.
- Do not invent Kenyan laws, regulations, standards, regulators, circulars, or government programs.
- If the user needs legal interpretation or compliance confirmation, say that you are not providing legal advice and recommend checking the latest official Kenyan legal or regulatory source.
- Stay in Chat with PARP AI mode unless the backend changes the feature.`
}

function isParpAiChatRequestBody(body: unknown): body is ParpAiChatRequestBody {
  if (!body || typeof body !== 'object') {
    return false
  }

  const candidate = body as Partial<ParpAiChatRequestBody>
  return (
    candidate.feature === PARP_AI_FEATURE &&
    typeof candidate.session_id === 'string' &&
    typeof candidate.user_message === 'string'
  )
}

function buildLlmMessages(systemPrompt: string, history: ChatMessage[]) {
  return [
    { role: 'system' as const, content: systemPrompt },
    ...history.map((message) => ({ role: message.role, content: message.content })),
  ] satisfies LlmMessage[]
}

/**
 * System prompt defining the AI's persona, language preferences, and base context.
 * Used when no custom system prompt is provided.
 */
function formatUsername(user: AuthenticatedUser | undefined | null) {
  const rawUsername = user?.user_metadata?.username?.trim()
  if (rawUsername) {
    return rawUsername
  }

  const email = user?.email?.trim()
  if (!email) {
    return 'User'
  }

  return email.split('@')[0] || 'User'
}

function normalizeProfileLocation(location: string | null | undefined, user: AuthenticatedUser | undefined | null) {
  if (location && location.trim()) {
    return location.trim()
  }

  const metadataLocation = user?.user_metadata?.location
  if (typeof metadataLocation === 'string' && metadataLocation.trim()) {
    return metadataLocation.trim()
  }

  return 'Kenya'
}

function formatAdoptionRateLabel(adoptionRate: number | null) {
  return adoptionRate === null ? 'No recorded assessment yet' : `${adoptionRate}%`
}

function isMissingColumnError(error: unknown, columnName: string) {
  if (!error || typeof error !== 'object') {
    return false
  }

  const candidate = error as { code?: string; message?: string; details?: string; hint?: string }
  const haystack = [candidate.message, candidate.details, candidate.hint].filter(Boolean).join(' ')

  return candidate.code === '42703' || new RegExp(`\b${columnName}\b`, 'i').test(haystack)
}

function isAdoptionRateQuestion(message: string) {
  return /(what(?:'s| is)?\s+my\s+(?:ai\s+)?(?:adoption|readiness)\s+(?:rate|score)|my\s+(?:ai\s+)?(?:adoption|readiness)\s+(?:rate|score)|current\s+(?:ai\s+)?(?:adoption|readiness)\s+(?:rate|score))/i.test(
    message,
  )
}

function buildAdoptionRateResponse(context: UserChatContext) {
  if (context.adoptionRate === null) {
    return `${context.username}, I do not have a recorded adoption rate for your account yet. Complete your latest assessment and I will be able to report your current adoption rate in real time.`
  }

  return `${context.username}, your current adoption rate is ${context.adoptionRate}%. This is pulled from your latest recorded assessment in real time.`
}

async function fetchUserChatContext(opts: {
  token: string
  userId: string
  user?: AuthenticatedUser | null
}) {
  const supabase = createAuthenticatedSupabaseClient(opts.token)

  let role = 'Citizen/User'
  let location = normalizeProfileLocation(undefined, opts.user)
  let adoptionRate: number | null = null

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, location')
      .eq('id', opts.userId)
      .maybeSingle()

    if (profileError) {
      if (isMissingColumnError(profileError, 'location')) {
        const { data: fallbackProfile, error: fallbackProfileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', opts.userId)
          .maybeSingle()

        if (fallbackProfileError) {
          console.error('Chat context profile fallback failed:', fallbackProfileError)
        } else {
          role = fallbackProfile?.role?.trim() || role
        }
      } else {
        console.error('Chat context profile lookup failed:', profileError)
      }
    } else {
      role = profile?.role?.trim() || role
      location = normalizeProfileLocation(profile?.location, opts.user)
    }
  } catch (error) {
    console.error('Unexpected chat context profile error:', error)
  }

  try {
    const { data: latestAssessment, error: assessmentError } = await supabase
      .from('assessments')
      .select('score')
      .eq('user_id', opts.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (assessmentError) {
      console.error('Chat context assessment lookup failed:', assessmentError)
    } else if (typeof latestAssessment?.score === 'number') {
      adoptionRate = latestAssessment.score
    }
  } catch (error) {
    console.error('Unexpected chat context assessment error:', error)
  }

  return {
    username: formatUsername(opts.user),
    role,
    location,
    adoptionRate,
    adoptionRateLabel: formatAdoptionRateLabel(adoptionRate),
  } satisfies UserChatContext
}

// Function generating the system prompt with dynamic user context
function generateSystemPrompt(context: UserChatContext) {
  return `You are PARP AI - a savvy, knowledgeable Kenyan digital advisor. You specialize in AI adoption for public services, freelancing (online writing, coding), and the digital economy in Kenya.
   
   Your Persona:
   - Friendly, professional but approachable.
   - Code-switch naturally between English, Kiswahili, and Sheng slang (e.g., using terms like "buda", "maneno", "ganji", "kujijenga").
   - Match the user's language. If they speak formally, reply formally. If they use Sheng, reply in Sheng.
   
   User Context:
   - The user's username is: ${context.username}
   - The user's role is: ${context.role}
   - The user's location is: ${context.location}
   - The user's latest adoption rate is: ${context.adoptionRateLabel}
   Always personalize your advice based on this user context when relevant (e.g. mention local services, location-specific issues, role-specific challenges, or their latest readiness level).

  First Interaction (Critical):
  - Your very first response in a chat must create instant wow.
  - Start with a warm Kenyan greeting, then immediately offer value in this order: quick readiness score insight, practical gigs direction, and relevant public-service help.
  - Explicitly invite the user to continue in Sheng or English.
  - Keep this first response personal by referencing the user context (role/location) naturally when useful.
  - End the first response with one short, actionable follow-up question.
   
   Features & Capabilities:
   1. Predictive Analytics: If the user asks for estimates (e.g., "Estimate queue time for Huduma Center"), creatively provide realistic-sounding predictive analytics based on their location and the current general context. Provide a specific estimated time and suggest the best hours to visit.
   2. Report Issue / Feedback Loop: If the user starts a message with "Report issue:" or clearly wants to file a complaint, immediately categorize the issue, state that it will be routed to the appropriate smart city/public service department, and provide a realistic mock Ticket Number (e.g., "TKT-NBO-8492").
   3. Organizational AI Use Assessment: If a user asks you to assess a specific organization's AI usage (e.g., "Assess Safaricom" or "How does Equity Bank use AI"), act as an analyzer using your broad training knowledge to simulate a web/news search.
      - Output your findings strictly in this format: "Your org uses AI in X/5 areas - [suggestions to bolster]".
      - Create a realistic X/5 score based on the entity's public visibility regarding AI.
   
   CRITICAL INSTRUCTIONS:
   - Keep your responses concise and to the point. Limit standard responses to 1-3 short sentences maximum.
  - Avoid generic corporate tone. Sound human, warm, and confident.
  - If the user asks for their adoption rate, readiness score, or current score, answer using the latest adoption rate above and do not invent another number.
   - When performing an Organizational AI Use Assessment, you may use bullet points and be slightly longer to fulfill the X/5 formatting requirement.
   - For simple greetings like "hello", just reply with a brief, friendly greeting.
   - If providing an Organizational AI Use Assessment, you MUST include this exact sentence at the very bottom of your response: "This assessment is based on public data and may not reflect internal policies. See our [Privacy Policy](/privacy) for limitations."`
}

/**
 * Encodes an event and data object into Server-Sent Events (SSE) format.
 * @param event The event name (e.g. 'token', 'error').
 * @param data The data payload.
 */
function sseEncode(event: string, data: string) {
  // SSE format: event + data lines + blank line
  // For multi-line data, each line must be prefixed with "data: "
  const safeData = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = safeData.split('\n')
  const dataLines = lines.map(line => `data: ${line}`).join('\n')
  return `event: ${event}\n${dataLines}\n\n`
}

/**
 * Extracts the user's bearer token from the 'Authorization' header.
 *
 * @param {Request} req The incoming request.
 * @returns {string | null} The extracted token or null if not found.
 */
function getBearerToken(req: Request) {
  const header = req.headers.get('authorization') ?? req.headers.get('Authorization')
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? null
}

/**
 * Validates the presence of an active user session by checking the provided auth token against Supabase.
 *
 * @param {Request} req The incoming API request.
 * @returns {Promise<{ ok: boolean, status?: number, message?: string, token?: string, userId?: string }>} Validation result.
 */
async function requireUser(req: Request) {
  const token = getBearerToken(req)
  if (!token) return { ok: false as const, status: 401, message: 'Missing auth token.' }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return {
      ok: false as const,
      status: 500,
      message: 'Supabase environment variables are not configured on the server.',
    }
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    return { ok: false as const, status: 401, message: 'Invalid session.' }
  }

  return { ok: true as const, token, userId: data.user.id, user: data.user as AuthenticatedUser }
}

function createAuthenticatedSupabaseClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Supabase environment variables are not configured on the server.')
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
}

/**
 * Validates and normalizes chat messages from the client.
 * filtering out invalid roles or empty content.
 */
function normalizeMessages(messages: ChatMessage[]) {
  const cleaned = (messages ?? [])
    .filter((m): m is ChatMessage => !!m && (m.role === 'user' || m.role === 'assistant'))
    .map((m) => ({ role: m.role, content: String(m.content ?? '').trim() }))
    .filter((m) => m.content.length > 0)

  // Keep a small rolling context window for MVP.
  const MAX_TURNS = 20
  return cleaned.slice(Math.max(0, cleaned.length - MAX_TURNS))
}

/**
 * Initiates an interaction with an Ollama-compatible LLM endpoint and streams the response.
 *
 * @param {Object} opts Configuration options for streaming from Ollama.
 * @param {string} opts.baseUrl The URL base path for the Ollama inference server.
 * @param {string} opts.model The model identifier to use (e.g. `gemma2:2b`).
 * @param {Array} opts.messages The conversation history including system prompt.
 * @param {Function} opts.onToken Callback function triggered per received text chunk.
 * @returns {Promise<void>} Resolves when streaming is complete.
 */
async function streamFromOllama(opts: {
  baseUrl: string
  model: string
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
  onToken: (token: string) => void
}) {
  const res = await fetch(`${opts.baseUrl.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      stream: true,
    }),
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ollama error (${res.status}): ${text || res.statusText}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // Ollama streams JSON objects per line.
    while (true) {
      const newlineIdx = buffer.indexOf('\n')
      if (newlineIdx === -1) break
      const line = buffer.slice(0, newlineIdx).trim()
      buffer = buffer.slice(newlineIdx + 1)
      if (!line) continue

      try {
        const obj = JSON.parse(line) as any
        const token = obj?.message?.content
        if (typeof token === 'string' && token.length > 0) {
          opts.onToken(token)
        }
        if (obj?.done === true) {
          return
        }
      } catch {
        // Ignore malformed streaming lines.
      }
    }
  }
}

/**
 * Initiates an interaction with an OpenAI-compatible API endpoint and streams the response via SSE.
 *
 * @param {Object} opts Configuration options for streaming from OpenAI.
 * @param {string} opts.apiKey The authorization API key for OpenAI.
 * @param {string} opts.model The model identifier to use (e.g. `gpt-4o-mini`).
 * @param {Array} opts.messages The conversation history.
 * @param {Function} opts.onToken Callback function triggered for each received text chunk.
 * @returns {Promise<void>} Resolves when the stream reaches completion.
 */
async function streamFromOpenAI(opts: {
  baseUrl: string
  apiKey: string
  model: string
  messages: LlmMessage[]
  onToken: (token: string) => void
}) {
  const res = await fetch(`${opts.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      stream: true,
      temperature: 0.4,
    }),
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    throw new Error(`OpenAI error (${res.status}): ${text || res.statusText}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // OpenAI streams SSE lines like: "data: {...}\n\n"
    while (true) {
      const sepIdx = buffer.indexOf('\n\n')
      if (sepIdx === -1) break
      const chunk = buffer.slice(0, sepIdx)
      buffer = buffer.slice(sepIdx + 2)

      const lines = chunk.split('\n').map((l) => l.trim())
      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const data = line.slice('data:'.length).trim()
        if (data === '[DONE]') return
        try {
          const obj = JSON.parse(data) as any
          const token = obj?.choices?.[0]?.delta?.content
          if (typeof token === 'string' && token.length > 0) {
            opts.onToken(token)
          }
        } catch {
          // Ignore malformed JSON.
        }
      }
    }
  }
}

async function completeFromOllama(opts: {
  baseUrl: string
  model: string
  messages: LlmMessage[]
}) {
  const res = await fetch(`${opts.baseUrl.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      stream: false,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ollama error (${res.status}): ${text || res.statusText}`)
  }

  const json = (await res.json()) as {
    message?: { content?: string }
  }
  return json.message?.content?.trim() ?? ''
}

async function completeFromOpenAI(opts: {
  apiKey: string
  baseUrl: string
  model: string
  messages: LlmMessage[]
}) {
  const res = await fetch(`${opts.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: 0.3,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`OpenAI error (${res.status}): ${text || res.statusText}`)
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return json.choices?.[0]?.message?.content?.trim() ?? ''
}

async function completeFromConfiguredProvider(opts: {
  provider: string
  ollamaBaseUrl: string
  ollamaModel: string
  openAiBaseUrl: string
  openAiKey: string
  openAiModel: string
  messages: LlmMessage[]
}) {
  const tryOllama = async () =>
    completeFromOllama({
      baseUrl: opts.ollamaBaseUrl,
      model: opts.ollamaModel,
      messages: opts.messages,
    })

  const tryOpenAICompatible = async () => {
    if (!opts.openAiKey) {
      throw new Error('OPENAI_API_KEY is not set.')
    }

    return completeFromOpenAI({
      apiKey: opts.openAiKey,
      baseUrl: opts.openAiBaseUrl,
      model: opts.openAiModel,
      messages: opts.messages,
    })
  }

  if (opts.provider === 'openai' || opts.provider === 'groq') {
    return tryOpenAICompatible()
  }

  if (opts.provider === 'ollama') {
    return tryOllama()
  }

  if (opts.provider === 'anthropic') {
    throw new Error('Configured provider "anthropic" is not supported by this route yet.')
  }

  try {
    return await tryOllama()
  } catch {
    return tryOpenAICompatible()
  }
}

async function handleParpAiChat(auth: { token?: string; userId?: string; user?: AuthenticatedUser | null }, body: ParpAiChatRequestBody) {
  const sessionId = body.session_id.trim()
  const userMessage = body.user_message.trim()

  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'session_id is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!userMessage) {
    return new Response(JSON.stringify({ error: 'user_message is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!auth.token || !auth.userId) {
    return new Response(JSON.stringify({ error: 'Invalid session.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let sessionHistory: ChatMessage[] = []
  let userContext: UserChatContext

  try {
    const supabase = createAuthenticatedSupabaseClient(auth.token)
    const { data, error } = await supabase
      .from('conversations')
      .select('messages')
      .eq('id', sessionId)
      .eq('user_id', auth.userId)
      .maybeSingle()

    if (error) {
      throw error
    }

    const storedMessages = Array.isArray(data?.messages) ? (data.messages as ChatMessage[]) : []
    sessionHistory = normalizeMessages(storedMessages)
    userContext = await fetchUserChatContext({
      token: auth.token,
      userId: auth.userId,
      user: auth.user,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load conversation history.'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (isAdoptionRateQuestion(userMessage)) {
    const responseBody: ParpAiChatResponseBody = {
      session_id: sessionId,
      assistant_message: buildAdoptionRateResponse(userContext),
      feature: PARP_AI_FEATURE,
    }

    return new Response(JSON.stringify(responseBody), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const stitchedMessages = buildLlmMessages(generateParpAiSystemInstructions(userContext), [
    ...sessionHistory,
    { role: 'user', content: userMessage },
  ])

  const provider = (process.env.PARP_AI_LLM_PROVIDER || process.env.LLM_PROVIDER || 'auto').toLowerCase()
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
  const ollamaModel = process.env.PARP_AI_OLLAMA_MODEL ?? process.env.OLLAMA_MODEL ?? 'gemma2:2b'
  const openAiBaseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'
  const openAiKey = process.env.PARP_AI_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY ?? ''
  const openAiModel = process.env.PARP_AI_OPENAI_MODEL ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

  try {
    const assistantMessage = await completeFromConfiguredProvider({
      provider,
      ollamaBaseUrl,
      ollamaModel,
      openAiBaseUrl,
      openAiKey,
      openAiModel,
      messages: stitchedMessages,
    })

    const responseBody: ParpAiChatResponseBody = {
      session_id: sessionId,
      assistant_message: assistantMessage || 'I could not generate a response just now. Please try again.',
      feature: PARP_AI_FEATURE,
    }

    return new Response(JSON.stringify(responseBody), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error.'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

/**
 * Hint to Next.js that this API route benefits from Node.js runtime bindings.
 */
export const runtime = 'nodejs'

/**
 * Main POST handler for the chat inference API endpoint.
 * It authenticates the user, reads the requested chat history, provisions either
 * Ollama or OpenAI as an LLM backend based on user request/fallback configuration,
 * and streams the tokens back to the client using Server-Sent Events (SSE).
 *
 * @param {Request} req The incoming HTTP POST request.
 * @returns {Promise<Response>} The streaming response data or an error construct.
 */
export async function POST(req: Request) {
  const auth = await requireUser(req)
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.message }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: ChatRequestBody | ParpAiChatRequestBody
  try {
    body = (await req.json()) as ChatRequestBody | ParpAiChatRequestBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (isParpAiChatRequestBody(body)) {
    return handleParpAiChat(auth, body)
  }

  let userContext: UserChatContext
  try {
    userContext = await fetchUserChatContext({
      token: auth.token!,
      userId: auth.userId!,
      user: auth.user,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load user chat context.'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const latestUserMessage = normalizeMessages(body.messages).filter((message) => message.role === 'user').at(-1)?.content ?? ''

  if (isAdoptionRateQuestion(latestUserMessage)) {
    const directResponse = buildAdoptionRateResponse(userContext)
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode(sseEncode('open', 'ok')))
        controller.enqueue(encoder.encode(sseEncode('token', directResponse)))
        controller.enqueue(encoder.encode(sseEncode('done', 'ok')))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  }

  const generatedPrompt = generateSystemPrompt(userContext)
  const activeSystemPrompt = body.systemPrompt ? body.systemPrompt : generatedPrompt

  const history = normalizeMessages(body.messages)
  const stitched = buildLlmMessages(activeSystemPrompt, history)

  // Retrieve configuration from environment variables
  const provider = (body.provider || process.env.LLM_PROVIDER || 'auto').toLowerCase()
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
  const ollamaModel = process.env.OLLAMA_MODEL ?? 'gemma2:2b'
  const openAiBaseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'
  const openAiKey = process.env.OPENAI_API_KEY ?? ''
  const openAiModel = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

  // Stream response back to the client using ReadableStream
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()
      const send = (event: string, data: string) => {
        controller.enqueue(encoder.encode(sseEncode(event, data)))
      }

      // Immediately acknowledge stream open to help the client UI.
      send('open', 'ok')

      const tryOllama = async () => {
        await streamFromOllama({
          baseUrl: ollamaBaseUrl,
          model: ollamaModel,
          messages: stitched,
          onToken: (t) => send('token', t),
        })
      }

      const tryOpenAI = async () => {
        if (!openAiKey) throw new Error('OPENAI_API_KEY is not set.')
        await streamFromOpenAI({
          baseUrl: openAiBaseUrl,
          apiKey: openAiKey,
          model: openAiModel,
          messages: stitched,
          onToken: (t) => send('token', t),
        })
      }

      try {
        if (provider === 'openai') {
          await tryOpenAI()
        } else if (provider === 'ollama') {
          await tryOllama()
        } else {
          // auto: prefer ollama, fall back to openai
          try {
            await tryOllama()
          } catch (err) {
            send('info', 'Ollama unavailable, falling back to OpenAI.')
            await tryOpenAI()
          }
        }

        send('done', 'ok')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error.'
        send('error', msg)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

