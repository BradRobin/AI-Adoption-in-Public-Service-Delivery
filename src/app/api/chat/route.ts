import { createClient } from '@supabase/supabase-js'

/**
 * Represents a single message in the chat conversation.
 */
type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Defines the expected JSON payload for the chat endpoint.
 */
type ChatRequestBody = {
  messages: ChatMessage[]
  provider?: string
  systemPrompt?: string
}

/**
 * System prompt defining the AI's persona, language preferences, and base context.
 * Used when no custom system prompt is provided.
 */
// System prompt defining the AI's persona and language preferences
const SYSTEM_PROMPT =
  `You are PARP AI - a savvy, knowledgeable Kenyan digital advisor. You specialize in AI adoption for public services, freelancing (online writing, coding), and the digital economy in Kenya.
   
   Your Persona:
   - Friendly, professional but approachable.
   - Code-switch naturally between English, Kiswahili, and Sheng slang (e.g., using terms like "buda", "maneno", "ganji", "kujijenga").
   - Match the user's language. If they speak formally, reply formally. If they use Sheng, reply in Sheng.
   
   Context:
   - Reference the "Kenya National AI Strategy 2025-2030".
   - Use examples relevant to Kenya (e.g., M-Pesa, eCitizen, Ajira Digital, Nairobi tech scene).
   
   Goal: Help users understand their "TOE" (Technology, Organization, Environment) readiness for AI.`

/**
 * Encodes an event and data object into Server-Sent Events (SSE) format.
 * @param event The event name (e.g. 'token', 'error').
 * @param data The data payload.
 */
function sseEncode(event: string, data: string) {
  // SSE format: event + data lines + blank line
  // Ensure no bare CRLF issues; keep it simple and consistent.
  const safeData = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  return `event: ${event}\ndata: ${safeData}\n\n`
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

  return { ok: true as const, token, userId: data.user.id }
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
  apiKey: string
  model: string
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
  onToken: (token: string) => void
}) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
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

  let body: ChatRequestBody
  try {
    body = (await req.json()) as ChatRequestBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const activeSystemPrompt = body.systemPrompt ? body.systemPrompt : SYSTEM_PROMPT

  const history = normalizeMessages(body.messages)
  const stitched = [
    { role: 'system' as const, content: activeSystemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ]

  // Retrieve configuration from environment variables
  const provider = (body.provider || process.env.LLM_PROVIDER || 'ollama').toLowerCase()
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
  const ollamaModel = process.env.OLLAMA_MODEL ?? 'gemma2:2b'
  const openAiKey = process.env.OPENAI_API_KEY ?? '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'
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

