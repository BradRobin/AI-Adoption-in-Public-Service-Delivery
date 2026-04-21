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
    gender?: string
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
  gender: string
  adoptionRate: number | null
  adoptionRateLabel: string
}

type UserProfileContext = {
  role?: string | null
  location?: string | null
  gender?: string | null
}

const PARP_AI_FEATURE: ParpAiFeature = 'chat_with_parp_ai'

/**
 * Free LLM Providers Configuration
 * These are completely free tiers with no payment required
 */
const FREE_LLM_PROVIDERS = {
  GROQ: 'groq', // Free API with extremely fast inference
  REPLICATE: 'replicate', // Free tier for various models
  HUGGINGFACE: 'huggingface', // Free inference API
  MISTRAL: 'mistral', // Free API tier available
  OLLAMA: 'ollama', // Local, completely free
}

function generateParpAiSystemInstructions(context: UserChatContext) {
  return `You are PARP AI operating inside the Chat with PARP AI dashboard card for the PARP Platform.

Live user context:
- Username: ${context.username}
- Role: ${context.role}
- Location: ${context.location}
- Gender preference: ${context.gender}
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
- Respect the user's gender preference when it is helpful. If the preference is "Rather not say", avoid gendered assumptions.
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

function normalizeProfileGender(gender: string | null | undefined, user: AuthenticatedUser | undefined | null) {
  const rawGender = gender ?? (typeof user?.user_metadata?.gender === 'string' ? user.user_metadata.gender : null)
  const normalized = rawGender?.trim().toLowerCase()

  if (normalized === 'male') {
    return 'Male'
  }

  if (normalized === 'female') {
    return 'Female'
  }

  return 'Rather not say'
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
  let gender = normalizeProfileGender(undefined, opts.user)
  let adoptionRate: number | null = null

  try {
    let profile: UserProfileContext | null = null
    let profileError: unknown = null

    const profileQueries = ['role, location, gender', 'role, location', 'role, gender', 'role']

    for (const selectClause of profileQueries) {
      const result = await supabase.from('profiles').select(selectClause).eq('id', opts.userId).maybeSingle()

      if (!result.error) {
        profile = result.data as UserProfileContext | null
        profileError = null
        break
      }

      if (isMissingColumnError(result.error, 'gender') || isMissingColumnError(result.error, 'location')) {
        profileError = result.error
        continue
      }

      profileError = result.error
      break
    }

    if (profileError) {
      console.error('Chat context profile lookup failed:', profileError)
    }

    if (profile) {
      role = profile.role?.trim() || role
      location = normalizeProfileLocation(profile.location, opts.user)
      gender = normalizeProfileGender(profile.gender, opts.user)
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
    gender,
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
  - The user's gender preference is: ${context.gender}
   - The user's latest adoption rate is: ${context.adoptionRateLabel}
   Always personalize your advice based on this user context when relevant (e.g. mention local services, location-specific issues, role-specific challenges, or their latest readiness level).
  Respect the user's gender preference only when it genuinely improves the response. If the preference is Rather not say, avoid gendered assumptions.

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
    // Log raw error internally but throw user-friendly message
    console.error(`Ollama error (${res.status}):`, text)
    throw new Error('Unable to generate response. Please try again in a moment.')
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
    // Log raw error internally but throw user-friendly message
    console.error(`OpenAI error (${res.status}):`, text)
    throw new Error('Unable to generate response. Please try again in a moment.')
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
    // Log raw error internally but throw user-friendly message
    console.error(`Ollama error (${res.status}):`, text)
    throw new Error('Unable to generate response. Please try again in a moment.')
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
    // Log raw error internally but throw user-friendly message
    console.error(`OpenAI error (${res.status}):`, text)
    throw new Error('Unable to generate response. Please try again in a moment.')
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return json.choices?.[0]?.message?.content?.trim() ?? ''
}

async function completeFromGroq(opts: {
  apiKey: string
  model: string
  messages: LlmMessage[]
}) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: 0.3,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error(`Groq error (${res.status}):`, text)
    throw new Error('Unable to generate response. Please try again in a moment.')
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return json.choices?.[0]?.message?.content?.trim() ?? ''
}

async function completeFromReplicate(opts: {
  apiKey: string
  model: string
  messages: LlmMessage[]
}) {
  // Replicate uses a different API format - model identifier includes version
  const userMessages = opts.messages.filter((m) => m.role === 'user' || m.role === 'assistant')
  const systemMessage = opts.messages.find((m) => m.role === 'system')?.content ?? ''
  const prompt = userMessages.map((m) => `${m.role}: ${m.content}`).join('\n')

  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Token ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: opts.model,
      input: {
        prompt: `${systemMessage}\n\n${prompt}`,
        max_length: 1024,
        temperature: 0.3,
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error(`Replicate error (${res.status}):`, text)
    throw new Error('Unable to generate response. Please try again in a moment.')
  }

  const json = (await res.json()) as {
    output?: string[] | string
  }

  if (Array.isArray(json.output)) {
    return json.output.join('').trim()
  }
  return typeof json.output === 'string' ? json.output.trim() : ''
}

async function completeFromHuggingFace(opts: {
  apiKey: string
  model: string
  messages: LlmMessage[]
}) {
  const userMessage = opts.messages.find((m) => m.role === 'user')?.content ?? 'Hello'

  const res = await fetch(`https://api-inference.huggingface.co/models/${opts.model}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: userMessage,
      parameters: {
        max_length: 1024,
        temperature: 0.3,
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error(`HuggingFace error (${res.status}):`, text)
    throw new Error('Unable to generate response. Please try again in a moment.')
  }

  const json = (await res.json()) as Array<{
    generated_text?: string
  }>

  if (Array.isArray(json) && json[0]?.generated_text) {
    return json[0].generated_text.trim()
  }

  return ''
}

async function completeFromMistral(opts: {
  apiKey: string
  model: string
  messages: LlmMessage[]
}) {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: 0.3,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error(`Mistral error (${res.status}):`, text)
    throw new Error('Unable to generate response. Please try again in a moment.')
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return json.choices?.[0]?.message?.content?.trim() ?? ''
}

async function completeFromTogether(opts: {
  apiKey: string
  model: string
  messages: LlmMessage[]
}) {
  const res = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: 0.3,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    // Log raw error internally but throw user-friendly message
    console.error(`Together.ai error (${res.status}):`, text)
    throw new Error('Unable to generate response. Please try again in a moment.')
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return json.choices?.[0]?.message?.content?.trim() ?? ''
}

async function streamFromGroq(opts: {
  apiKey: string
  model: string
  messages: LlmMessage[]
  onToken: (token: string) => void
}) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      stream: true,
      temperature: 0.3,
      max_tokens: 1024,
    }),
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    console.error(`Groq error (${res.status}):`, text)
    throw new Error('Unable to generate response. Please try again in a moment.')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

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
          // Ignore malformed JSON
        }
      }
    }
  }
}

async function streamFromMistral(opts: {
  apiKey: string
  model: string
  messages: LlmMessage[]
  onToken: (token: string) => void
}) {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      stream: true,
      temperature: 0.3,
      max_tokens: 1024,
    }),
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    console.error(`Mistral error (${res.status}):`, text)
    throw new Error('Unable to generate response. Please try again in a moment.')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

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
          // Ignore malformed JSON
        }
      }
    }
  }
}

async function streamFromTogether(opts: {
  apiKey: string
  model: string
  messages: LlmMessage[]
  onToken: (token: string) => void
}) {
  const res = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      stream: true,
      temperature: 0.3,
      max_tokens: 1024,
    }),
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    // Log raw error internally but throw user-friendly message
    console.error(`Together.ai error (${res.status}):`, text)
    throw new Error('Unable to generate response. Please try again in a moment.')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // Together.ai streams SSE lines like: "data: {...}\n\n"
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

async function completeFromConfiguredProvider(opts: {
  provider: string
  ollamaBaseUrl: string
  ollamaModel: string
  groqApiKey: string
  groqModel: string
  mistralApiKey: string
  mistralModel: string
  huggingfaceApiKey: string
  huggingfaceModel: string
  replicateApiKey: string
  replicateModel: string
  togetherApiKey: string
  togetherModel: string
  messages: LlmMessage[]
}) {
  const tryOllama = async () =>
    completeFromOllama({
      baseUrl: opts.ollamaBaseUrl,
      model: opts.ollamaModel,
      messages: opts.messages,
    })

  const tryGroq = async () => {
    if (!opts.groqApiKey) throw new Error('GROQ_API_KEY not configured')
    return completeFromGroq({
      apiKey: opts.groqApiKey,
      model: opts.groqModel,
      messages: opts.messages,
    })
  }

  const tryMistral = async () => {
    if (!opts.mistralApiKey) throw new Error('MISTRAL_API_KEY not configured')
    return completeFromMistral({
      apiKey: opts.mistralApiKey,
      model: opts.mistralModel,
      messages: opts.messages,
    })
  }

  const tryHuggingFace = async () => {
    if (!opts.huggingfaceApiKey) throw new Error('HUGGINGFACE_API_KEY not configured')
    return completeFromHuggingFace({
      apiKey: opts.huggingfaceApiKey,
      model: opts.huggingfaceModel,
      messages: opts.messages,
    })
  }

  const tryReplicate = async () => {
    if (!opts.replicateApiKey) throw new Error('REPLICATE_API_KEY not configured')
    return completeFromReplicate({
      apiKey: opts.replicateApiKey,
      model: opts.replicateModel,
      messages: opts.messages,
    })
  }

  const tryTogether = async () => {
    if (!opts.togetherApiKey) throw new Error('TOGETHER_API_KEY not configured')
    return completeFromTogether({
      apiKey: opts.togetherApiKey,
      model: opts.togetherModel,
      messages: opts.messages,
    })
  }

  // Explicit provider selection
  if (opts.provider === 'ollama') return tryOllama()
  if (opts.provider === 'groq') return tryGroq()
  if (opts.provider === 'mistral') return tryMistral()
  if (opts.provider === 'huggingface') return tryHuggingFace()
  if (opts.provider === 'replicate') return tryReplicate()
  if (opts.provider === 'together') return tryTogether()

  // Default 'auto' mode: Try free options first, fall back through them
  // Order: Ollama (local) -> Groq (fastest free) -> Mistral -> HuggingFace -> Replicate
  const strategies = [tryOllama, tryGroq, tryMistral, tryHuggingFace, tryReplicate, tryTogether]

  let lastError: unknown
  for (const strategy of strategies) {
    try {
      return await strategy()
    } catch (err) {
      lastError = err
      console.warn(`Strategy failed:`, err instanceof Error ? err.message : err)
      // Continue to next strategy
    }
  }

  // If all else fails, throw the last error
  throw lastError
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
  const ollamaModel = process.env.PARP_AI_OLLAMA_MODEL ?? process.env.OLLAMA_MODEL ?? 'llama2'
  const groqApiKey = process.env.PARP_AI_GROQ_API_KEY ?? process.env.GROQ_API_KEY ?? ''
  const groqModel = process.env.PARP_AI_GROQ_MODEL ?? 'mixtral-8x7b-32768'
  const mistralApiKey = process.env.PARP_AI_MISTRAL_API_KEY ?? process.env.MISTRAL_API_KEY ?? ''
  const mistralModel = process.env.PARP_AI_MISTRAL_MODEL ?? 'mistral-medium'
  const huggingfaceApiKey = process.env.PARP_AI_HUGGINGFACE_API_KEY ?? process.env.HUGGINGFACE_API_KEY ?? ''
  const huggingfaceModel = process.env.PARP_AI_HUGGINGFACE_MODEL ?? 'mistralai/Mistral-7B-Instruct-v0.1'
  const replicateApiKey = process.env.PARP_AI_REPLICATE_API_KEY ?? process.env.REPLICATE_API_KEY ?? ''
  const replicateModel = process.env.PARP_AI_REPLICATE_MODEL ?? ''
  const togetherApiKey = process.env.PARP_AI_TOGETHER_API_KEY ?? process.env.TOGETHER_API_KEY ?? ''
  const togetherModel = process.env.PARP_AI_TOGETHER_MODEL ?? process.env.TOGETHER_MODEL ?? 'meta-llama/Llama-2-7b-chat-hf'

  try {
    const assistantMessage = await completeFromConfiguredProvider({
      provider,
      ollamaBaseUrl,
      ollamaModel,
      groqApiKey,
      groqModel,
      mistralApiKey,
      mistralModel,
      huggingfaceApiKey,
      huggingfaceModel,
      replicateApiKey,
      replicateModel,
      togetherApiKey,
      togetherModel,
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
    // Log error internally for debugging, return user-friendly message
    console.error('PARP AI response generation failed:', error)
    const userFriendlyMessage = 'I encountered an issue generating a response. Please try again in a moment.'
    return new Response(JSON.stringify({ error: userFriendlyMessage }), {
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
  const ollamaModel = process.env.OLLAMA_MODEL ?? 'llama2'
  const groqApiKey = process.env.GROQ_API_KEY ?? ''
  const groqModel = process.env.GROQ_MODEL ?? 'mixtral-8x7b-32768'
  const mistralApiKey = process.env.MISTRAL_API_KEY ?? ''
  const mistralModel = process.env.MISTRAL_MODEL ?? 'mistral-medium'
  const huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY ?? ''
  const huggingfaceModel = process.env.HUGGINGFACE_MODEL ?? 'mistralai/Mistral-7B-Instruct-v0.1'
  const replicateApiKey = process.env.REPLICATE_API_KEY ?? ''
  const replicateModel = process.env.REPLICATE_MODEL ?? ''
  const togetherApiKey = process.env.TOGETHER_API_KEY ?? ''
  const togetherModel = process.env.TOGETHER_MODEL ?? 'meta-llama/Llama-2-7b-chat-hf'

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

      const tryGroq = async () => {
        if (!groqApiKey) throw new Error('GROQ_API_KEY not configured')
        await streamFromGroq({
          apiKey: groqApiKey,
          model: groqModel,
          messages: stitched,
          onToken: (t) => send('token', t),
        })
      }

      const tryMistral = async () => {
        if (!mistralApiKey) throw new Error('MISTRAL_API_KEY not configured')
        await streamFromMistral({
          apiKey: mistralApiKey,
          model: mistralModel,
          messages: stitched,
          onToken: (t) => send('token', t),
        })
      }

      try {
        if (provider === 'ollama') {
          await tryOllama()
        } else if (provider === 'groq') {
          await tryGroq()
        } else if (provider === 'mistral') {
          await tryMistral()
        } else {
          // auto: prefer Ollama, fall back through free options
          const strategies = [tryOllama, tryGroq, tryMistral]
          let lastErr: unknown
          for (const strategy of strategies) {
            try {
              await strategy()
              send('done', 'ok')
              return
            } catch (err) {
              lastErr = err
            }
          }
          throw lastErr
        }

        send('done', 'ok')
      } catch (err) {
        // Log error for debugging but send user-friendly message to client
        console.error('Chat streaming error:', err)
        const msg = 'Sorry — I couldn\'t reach the AI service. I encountered an issue generating a response. Please try again in a moment.'
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

