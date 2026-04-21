# Multi-LLM Architecture Documentation

## System Design

### Core Principle
**Decentralized, fallback-based LLM provider system** - no single provider lock-in.

The system tries providers in priority order until one succeeds. If all fail, user sees a friendly error.

## Architecture Diagram

```
Frontend (Dashboard/Chat)
    ↓
API Route (/api/chat)
    ↓
determineProvider()  ← Check env config
    ↓
completeFromConfiguredProvider()
    ↓
    ├─ Strategy 1: Try Ollama
    │   ├─ Success → Return response
    │   └─ Fail → Next strategy
    ├─ Strategy 2: Try Groq
    │   ├─ Success → Return response
    │   └─ Fail → Next strategy
    ├─ Strategy 3: Try Mistral
    │   └─ ...
    └─ ...Strategies continue...
    ↓
Return response to frontend
    ↓
Display to user
```

### Key Components

1. **Provider Functions** (src/app/api/chat/route.ts)
   - `completeFromOllama()` - Non-streaming
   - `completeFromGroq()` - Non-streaming
   - `completeFromMistral()` - Non-streaming
   - `completeFromHuggingFace()` - Non-streaming
   - `completeFromReplicate()` - Non-streaming
   - `completeFromTogether()` - Non-streaming

2. **Streaming Functions**
   - `streamFromOllama()` - Real-time responses
   - `streamFromGroq()` - Real-time responses
   - `streamFromMistral()` - Real-time responses
   - `streamFromTogether()` - Real-time responses

3. **Provider Selection**
   - `completeFromConfiguredProvider()` - Selects & executes strategy
   - Uses fallback loop to try multiple providers

4. **Error Handling**
   - All errors caught and logged internally
   - User sees: "I encountered an issue. Please try again."
   - Never exposes API errors or technical details

---

## Adding a New Provider

To add support for new LLM providers like Claude, Grok, or Kimi:

### Step 1: Create Provider Function

```typescript
// Non-streaming (for PARP AI dashboard)
async function completeFromClaude(opts: {
  apiKey: string
  model: string
  messages: LlmMessage[]
}) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'X-API-Key': opts.apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages.map(m => ({
        role: m.role === 'system' ? 'user' : m.role,
        content: m.content
      })),
      max_tokens: 1024,
      temperature: 0.3,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error(`Claude error (${res.status}):`, text)
    throw new Error('Unable to generate response. Please try again in a moment.')
  }

  const json = (await res.json()) as {
    content?: Array<{ text?: string }>
  }
  return json.content?.[0]?.text?.trim() ?? ''
}

// Streaming (for chat page)
async function streamFromClaude(opts: {
  apiKey: string
  model: string
  messages: LlmMessage[]
  onToken: (token: string) => void
}) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'X-API-Key': opts.apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      stream: true,
      max_tokens: 1024,
      temperature: 0.3,
    }),
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    console.error(`Claude error (${res.status}):`, text)
    throw new Error('Unable to generate response. Please try again in a moment.')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // Parse Claude's SSE format
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice('data: '.length).trim()
      if (!data || data === '[DONE]') continue

      try {
        const obj = JSON.parse(data) as any
        if (obj.type === 'content_block_delta' && obj.delta?.type === 'text_delta') {
          opts.onToken(obj.delta.text)
        }
        if (obj.type === 'message_stop') return
      } catch {
        // Ignore parsing errors
      }
    }
  }
}
```

### Step 2: Add to Provider Config

```typescript
const FREE_LLM_PROVIDERS = {
  GROQ: 'groq',
  MISTRAL: 'mistral',
  CLAUDE: 'claude', // ADD THIS
  OLLAMA: 'ollama',
}
```

### Step 3: Update completeFromConfiguredProvider()

```typescript
async function completeFromConfiguredProvider(opts: {
  // ... existing options ...
  claudeApiKey: string
  claudeModel: string
}) {
  // ... existing code ...

  const tryClaude = async () => {
    if (!opts.claudeApiKey) throw new Error('CLAUDE_API_KEY not configured')
    return completeFromClaude({
      apiKey: opts.claudeApiKey,
      model: opts.claudeModel,
      messages: opts.messages,
    })
  }

  // Add to explicit selection
  if (opts.provider === 'claude') return tryClaude()

  // Add to fallback strategies
  const strategies = [tryOllama, tryGroq, tryClaude, tryMistral, ...]
  // ...rest of function
}
```

### Step 4: Add to handleParpAiChat()

```typescript
const provider = (process.env.PARP_AI_LLM_PROVIDER || process.env.LLM_PROVIDER || 'auto').toLowerCase()
// ... other config ...
const claudeApiKey = process.env.PARP_AI_CLAUDE_API_KEY ?? process.env.CLAUDE_API_KEY ?? ''
const claudeModel = process.env.PARP_AI_CLAUDE_MODEL ?? 'claude-3-haiku-20240307'

try {
  const assistantMessage = await completeFromConfiguredProvider({
    // ... existing options ...
    claudeApiKey,
    claudeModel,
    messages: stitchedMessages,
  })
  // ...rest of function
}
```

### Step 5: Add Streaming Support

```typescript
const tryClaudeStreaming = async () => {
  if (!claudeApiKey) throw new Error('CLAUDE_API_KEY not configured')
  await streamFromClaude({
    apiKey: claudeApiKey,
    model: claudeModel,
    messages: stitched,
    onToken: (t) => send('token', t),
  })
}

// In streaming section
const strategies = [tryOllama, tryGroq, tryClaude, ...]
```

### Step 6: Update .env.local

```env
CLAUDE_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-3-haiku-20240307
PARP_AI_CLAUDE_API_KEY=sk-ant-...
PARP_AI_CLAUDE_MODEL=claude-3-haiku-20240307
```

### Step 7: Test

```bash
npm run dev
# Send message in Dashboard or Chat
# System will try providers in order, use Claude if API key is valid
```

---

## Provider Implementation Checklist

For each new provider, ensure:

- [ ] **Non-streaming completion function** with proper error handling
- [ ] **Streaming function** with SSE parsing
- [ ] **Error messages** are user-friendly (no API details exposed)
- [ ] **API key validation** before making requests
- [ ] **Timeout handling** for slow responses
- [ ] **Added to auto-fallback strategies** in correct priority order
- [ ] **Documentation** with API key retrieval steps
- [ ] **Environment variable configuration** in .env.local
- [ ] **Tests** to verify provider works

---

## Free vs Paid Providers

### Free Providers (No Cost)
- **Ollama**: Local, unlimited, requires installation
- **Groq**: 30 req/min, 250K tokens/day
- **Mistral**: Free tier, ~$4 credit
- **HuggingFace**: 30K tokens/month
- **Replicate**: ~$5 startup credit

### Paid Providers (Requires Deposit)
- **Together.ai**: Pay-as-you-go starting at $1
- **OpenAI**: Large minimum, expensive
- **Anthropic (Claude)**: Pay-as-you-go
- **Google (Gemini)**: Pay-as-you-go
- **Kimi**: Regional (China-focused)

**Current Setup**: All free providers have no usage cost.

---

## Performance Comparison

| Provider | Latency | Cost | Quality |
|----------|---------|------|---------|
| Ollama | 1-5s | FREE | Good |
| Groq | 0.5-1s | FREE | Excellent |
| Mistral | 0.5-1.5s | FREE tier | Excellent |
| Claude | 1-2s | $$$ | Excellent |
| Grok | 1-2s | $$$ | Good |
| Kimi | 1-2s | $$$ (Regional) | Good |

**Best for free use**: Ollama (local) + Groq (backup)

---

## Future Enhancements

Possible improvements:

1. **Load Balancing**: Distribute requests across providers based on speed
2. **Cost Optimization**: Switch providers based on token usage patterns
3. **Quality Scoring**: Track which provider gives best responses, weight accordingly
4. **Caching**: Cache responses for similar queries
5. **Provider Health Monitoring**: Detect provider outages proactively
6. **User Preferences**: Let users pick their preferred provider
7. **Admin Dashboard**: Monitor provider usage and costs

---

## Troubleshooting Provider Issues

### Provider consistently fails
1. Check API key in `.env.local`
2. Verify API key hasn't expired
3. Check rate limits haven't been exceeded
4. Try a different provider
5. Check provider status page for outages

### Streaming stops mid-response
1. Check network connection
2. Increase timeout in request
3. Try non-streaming endpoint
4. Try different provider

### Response quality is poor
1. Check system prompt is being passed correctly
2. Try different model within same provider
3. Adjust temperature parameter (currently 0.3)
4. Try different provider

---

## Code Structure

```
src/app/api/chat/route.ts
  ├─ Provider Functions (non-streaming)
  │  ├─ completeFromOllama()
  │  ├─ completeFromGroq()
  │  ├─ completeFromMistral()
  │  └─ ...more providers...
  ├─ Streaming Functions
  │  ├─ streamFromOllama()
  │  ├─ streamFromGroq()
  │  ├─ streamFromMistral()
  │  └─ ...more providers...
  ├─ Provider Selection
  │  ├─ completeFromConfiguredProvider()
  │  └─ Contains fallback strategies
  ├─ Special Handlers
  │  ├─ handleParpAiChat() - Dashboard
  │  ├─ POST() - Chat page + other routes
  │  └─ Helper functions
  └─ Utilities
     └─ Error handling, message formatting
```

This architecture makes it easy to add new providers without changing core logic!
