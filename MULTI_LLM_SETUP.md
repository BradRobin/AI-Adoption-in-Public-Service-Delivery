# Multi-LLM Configuration Guide

## Overview

PARP AI now supports **multiple free LLM providers** with intelligent fallback. The system:

- ✅ Prioritizes **local Ollama** (completely free, private, no API key needed)
- ✅ Falls back through free API tiers (Groq, Mistral, HuggingFace, Replicate)
- ✅ Works both in Dashboard and Chat page
- ✅ **Never requires payment** if you use free tier services
- ✅ Gracefully handles API failures with fallbacks

## Provider Priority (Auto Mode)

The system tries providers in this order:

```
1. Ollama (local) - FREE, requires local setup
2. Groq API - FREE tier available
3. Mistral API - FREE tier available
4. HuggingFace - FREE tier available
5. Replicate - FREE tier available
6. Together.ai - PAID (requires deposit)
```

If one fails, it automatically tries the next one. No user sees an error unless all fail.

---

## Setup Instructions

### Option 1: Local Ollama (Recommended - 100% Free)

This requires no API keys and runs entirely on your machine.

#### Step 1: Install Ollama
- **Windows/Mac**: https://ollama.ai/download
- **Linux**: `curl https://ollama.ai/install.sh | sh`

#### Step 2: Download a Model
```bash
ollama pull llama2
```

Common models:
- `llama2` - 7B, balanced (recommended)
- `neural-chat` - 7B, fast
- `mistral` - 7B, very fast
- `dolphin-mixtral` - Large, high quality

#### Step 3: Start Ollama Server
```bash
ollama serve
```

This starts on `http://localhost:11434` (automatically configured)

#### Step 4: Update `.env.local` if needed
```env
LLM_PROVIDER=ollama
OLLAMA_MODEL=llama2
PARP_AI_LLM_PROVIDER=ollama
```

**Test**: Go to Dashboard or Chat, try asking a question. Should work immediately!

---

### Option 2: Groq API (Free, Very Fast)

Groq offers **free API access** with excellent inference speed.

#### Step 1: Get Free API Key
1. Go to https://console.groq.com
2. Sign up (free account)
3. Copy your API key

#### Step 2: Update `.env.local`
```env
GROQ_API_KEY=gsk_YOUR_KEY_HERE
GROQ_MODEL=mixtral-8x7b-32768
LLM_PROVIDER=auto  # Will try Ollama first, then Groq
```

#### Step 3: Test
Go to Dashboard or Chat and send a message.

---

### Option 3: Mistral API (Free Tier)

Mistral offers a **free tier** for their models.

#### Step 1: Get Free API Key
1. Go to https://console.mistral.ai
2. Sign up and verify email
3. Copy your API key

#### Step 2: Update `.env.local`
```env
MISTRAL_API_KEY=your_key_here
MISTRAL_MODEL=mistral-medium
LLM_PROVIDER=auto
```

---

### Option 4: HuggingFace (Free)

Use HuggingFace's free inference API.

#### Step 1: Get Free API Key
1. Go to https://huggingface.co/settings/tokens
2. Create new token (read access is fine)
3. Copy token

#### Step 2: Update `.env.local`
```env
HUGGINGFACE_API_KEY=hf_YOUR_TOKEN_HERE
HUGGINGFACE_MODEL=mistralai/Mistral-7B-Instruct-v0.1
LLM_PROVIDER=auto
```

---

### Option 5: Replicate (Free Tier)

Replicate offers free credits for new accounts.

#### Step 1: Get Free API Key
1. Go to https://replicate.com/account/api-tokens
2. Create token
3. Copy it

#### Step 2: Update `.env.local`
```env
REPLICATE_API_KEY=your_token_here
REPLICATE_MODEL=model_version_id_here
LLM_PROVIDER=auto
```

---

## Configuration Examples

### Example 1: Pure Local (No Internet Needed)
```env
LLM_PROVIDER=ollama
PARP_AI_LLM_PROVIDER=ollama
OLLAMA_MODEL=llama2
```
✅ Free, Private, Fast
❌ Requires Ollama installation

### Example 2: Ollama + Groq Fallback
```env
LLM_PROVIDER=auto
PARP_AI_LLM_PROVIDER=auto
OLLAMA_MODEL=llama2
GROQ_API_KEY=gsk_...
GROQ_MODEL=mixtral-8x7b-32768
```
✅ Best of both worlds
✅ Local first, cloud fallback
✅ All free tier
❌ Requires Ollama running

### Example 3: Cloud Only (Groq)
```env
LLM_PROVIDER=groq
PARP_AI_LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_MODEL=mixtral-8x7b-32768
```
✅ No local setup needed
✅ Very fast inference
❌ Requires internet

---

## Restart Application

After updating `.env.local`:

```bash
# Kill all Node processes
Stop-Process -Name node -Force

# Start dev server
npm run dev
```

The app should now use the configured LLM provider automatically.

---

## Testing

### Dashboard Test
1. Go to `http://localhost:3000/dashboard`
2. Scroll to "Chat with PARP AI" card
3. Ask: "How should a Kenyan county structure its first AI pilot?"
4. Should see streamed response

### Chat Page Test
1. Go to `http://localhost:3000/chat`
2. Send a message
3. Should receive response

If one provider fails, you'll see in the terminal which fallback is being used.

---

## Troubleshooting

### "Ollama not reachable"
- Make sure Ollama is running: `ollama serve`
- Check it's on `http://localhost:11434`
- Try: `curl http://localhost:11434/api/tags`

### "API Key invalid"
- Copy key again from provider dashboard
- Restart app: `npm run dev`
- Check for leading/trailing spaces

### "All providers failed"
- Check `.env.local` is saved
- Restart: `npm run dev`
- Check terminal for error messages
- Ensure at least one provider is properly configured

### Dashboard works but not Chat (or vice versa)
- This is fixed now - both use same provider system
- Restart app after .env.local changes

---

## Free Tier Limits

| Provider | Free Tier | Limits |
|----------|-----------|--------|
| **Ollama** | Unlimited | Local machine CPU |
| **Groq** | Unlimited | 30 req/min, 250K tokens/day |
| **Mistral** | ~$4 credit | ~1M tokens free |
| **HuggingFace** | Limited | 30K tokens/month |
| **Replicate** | ~$5 credit | Depends on model |
| **Together.ai** | PAID | Requires deposit |

For most use cases, **Ollama + Groq** is the best free setup.

---

## Advanced: Custom Fallback Order

To change the fallback priority, edit `src/app/api/chat/route.ts` line ~730:

```javascript
const strategies = [tryOllama, tryGroq, tryMistral, tryHuggingFace, tryReplicate, tryTogether]
```

Reorder as needed. For example, prioritize Groq over Ollama:

```javascript
const strategies = [tryGroq, tryOllama, tryMistral]
```

---

## Deployment

For production (Vercel, Railway, etc.), set environment variables:

```
LLM_PROVIDER=auto
GROQ_API_KEY=gsk_...
MISTRAL_API_KEY=...
HUGGINGFACE_API_KEY=...
# And other provider keys as configured
```

Never commit API keys to git. Use your platform's secrets management.

---

## Getting Help

- **Ollama Issues**: https://github.com/jmorganca/ollama
- **Groq API**: https://console.groq.com/docs
- **Mistral**: https://docs.mistral.ai
- **HuggingFace**: https://huggingface.co/docs/hub/api-inference
- **Replicate**: https://replicate.com/docs
