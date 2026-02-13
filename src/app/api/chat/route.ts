import { createClient } from '@supabase/supabase-js'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type ChatRequestBody = {
  messages: ChatMessage[]
}

// System prompt defining the AI's persona and language preferences
const SYSTEM_PROMPT =
  'You are PARP AI - a helpful advisor on AI adoption in Kenyan public services and freelancing. Use simple English, Kiswahili, or Sheng when appropriate. Reference Kenya AI Strategy when relevant.'

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

function getBearerToken(req: Request) {
  const header = req.headers.get('authorization') ?? req.headers.get('Authorization')
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? null
}

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

export const runtime = 'nodejs'

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

  const history = normalizeMessages(body.messages)
  const stitched = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ]

  // Retrieve configuration from environment variables
  const provider = (process.env.LLM_PROVIDER ?? 'auto').toLowerCase()
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
  const ollamaModel = process.env.OLLAMA_MODEL ?? 'llama3.1:8b'
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

