# PARP AI Multi-LLM System - Complete Setup

## What Changed ✅

### Problem Solved
- ❌ **Before**: Dashboard couldn't use local Ollama (only Together.ai with paid API)
- ❌ **Before**: Only one LLM provider supported
- ❌ **Before**: Required paid API key to function
- ✅ **Now**: Both Dashboard and Chat use local Ollama by default
- ✅ **Now**: 6 LLM providers supported (Groq, Mistral, HuggingFace, Replicate, Together, Ollama)
- ✅ **Now**: Intelligent fallback between providers
- ✅ **Now**: 100% free with Ollama local setup

### Backend Changes

**File: `src/app/api/chat/route.ts`**

- ✅ Added Groq streaming and completion functions
- ✅ Added Mistral streaming and completion functions
- ✅ Added HuggingFace API support
- ✅ Added Replicate API support
- ✅ Rewrote `completeFromConfiguredProvider()` with intelligent provider fallback
- ✅ Updated `handleParpAiChat()` to support all 6 providers
- ✅ Updated main POST handler to try Ollama first (not Together)
- ✅ Changed default provider from "together" → "auto" (tries free options)
- ✅ All errors masked with user-friendly messages

### Configuration Changes

**File: `.env.local`**

- ✅ Changed default LLM_PROVIDER from "together" → "auto"
- ✅ Changed default PARP_AI_LLM_PROVIDER from "together" → "auto"
- ✅ Added configuration for all 6 providers
- ✅ Added comments explaining setup for each

---

## Quick Start (Try It Now)

### Option A: Local Ollama (Recommended - Free, Private, Fast)

**Step 1**: Install Ollama
```bash
# Windows/Mac: Download from https://ollama.ai
# Linux: curl https://ollama.ai/install.sh | sh
```

**Step 2**: Start Ollama
```bash
ollama serve
```

**Step 3**: Download a model (in new terminal)
```bash
ollama pull llama2
```

**Step 4**: Restart PARP AI
```bash
Stop-Process -Name node -Force
npm run dev
```

**Step 5**: Test
- Go to Dashboard → Chat with PARP AI
- Ask: "What's my adoption rate?"
- Should respond immediately using local model!

✅ **Done!** Both Dashboard and Chat now use Ollama.

---

### Option B: Use Groq (Free, Very Fast, No Local Setup)

**Step 1**: Get free Groq API key
1. Go to https://console.groq.com
2. Sign up (free account, no credit card)
3. Copy your API key

**Step 2**: Update `.env.local`
```env
GROQ_API_KEY=gsk_YOUR_KEY_HERE
GROQ_MODEL=mixtral-8x7b-32768
LLM_PROVIDER=auto
```

**Step 3**: Restart
```bash
Stop-Process -Name node -Force
npm run dev
```

✅ System will use Groq if Ollama isn't available.

---

## How It Works

### Priority Order (Auto Mode)

```
User sends message
  ↓
Try Ollama (local, fastest)
  ↓ Failed?
Try Groq (free API, very fast)
  ↓ Failed?
Try Mistral (free API)
  ↓ Failed?
Try HuggingFace (free API)
  ↓ Failed?
Try Replicate (free API)
  ↓ Failed?
Try Together (paid, if API key provided)
  ↓ All failed?
Show friendly error message
```

**Result**: User always gets a response if ANY provider is working!

### Example: Ollama + Groq Failover

```
Scenario: Ollama server is down
  ↓
User sends message in dashboard
  ↓
System tries Ollama → Can't connect
  ↓
System tries Groq → SUCCESS!
  ↓
User sees response from Groq, never knows Ollama was down
```

---

## Configuration Cheat Sheet

### Local Only (No Internet Needed)
```env
LLM_PROVIDER=ollama
PARP_AI_LLM_PROVIDER=ollama
OLLAMA_MODEL=llama2
```
Install Ollama, run: `ollama serve`

### Local + Groq Backup
```env
LLM_PROVIDER=auto
PARP_AI_LLM_PROVIDER=auto
OLLAMA_MODEL=llama2
GROQ_API_KEY=gsk_...
```
Tries Ollama first, falls back to Groq if down.

### Cloud Only (No Local Setup)
```env
LLM_PROVIDER=groq
PARP_AI_LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_MODEL=mixtral-8x7b-32768
```
Uses Groq directly, no local installation needed.

### Multi-Provider (Maximum Reliability)
```env
LLM_PROVIDER=auto
PARP_AI_LLM_PROVIDER=auto
OLLAMA_MODEL=llama2
GROQ_API_KEY=gsk_...
MISTRAL_API_KEY=sk-...
HUGGINGFACE_API_KEY=hf_...
```
Tries all free providers in order.

---

## Provider Comparison

| Provider | Setup | Cost | Speed | Quality | Privacy |
|----------|-------|------|-------|---------|---------|
| **Ollama** | 10 min | FREE | Fast | Good | Private ✅ |
| **Groq** | 2 min | FREE | Very Fast | Excellent | Cloud ⚠️ |
| **Mistral** | 2 min | FREE tier | Medium | Excellent | Cloud ⚠️ |
| **HuggingFace** | 2 min | FREE tier | Slow | Medium | Cloud ⚠️ |
| **Replicate** | 2 min | FREE tier | Medium | Good | Cloud ⚠️ |
| **Together** | 2 min | PAID | Fast | Good | Cloud ⚠️ |

**Recommendation**: Use **Ollama** for local work, **Groq** as backup.

---

## Common Issues & Fixes

### Issue 1: Dashboard doesn't respond
**Solution**: 
1. Check terminal for errors
2. Ensure at least one provider is configured
3. If using Ollama: `ollama serve` is running?
4. If using API: Valid API key in `.env.local`?
5. Restart: `npm run dev`

### Issue 2: "I encountered an issue generating a response"
**Solution**: 
1. Check `.env.local` has valid API key or Ollama running
2. Check terminal output for which provider failed
3. Add another provider as fallback

### Issue 3: Ollama very slow on first query
**Expected**: First query takes 5-10s (loading model into memory). Subsequent queries are fast.

### Issue 4: Chat page works but Dashboard doesn't
**Fixed!** Both now use same provider system. Restart app if still seeing issue.

---

## Advanced Configuration

### Use Mistral Instead of Groq
```env
LLM_PROVIDER=mistral
MISTRAL_API_KEY=sk_...
MISTRAL_MODEL=mistral-medium
```

### Change Ollama Model
```env
OLLAMA_MODEL=neural-chat  # Faster
# or
OLLAMA_MODEL=mistral      # Balanced
# or
OLLAMA_MODEL=dolphin-mixtral  # Highest quality
```

Get list: https://ollama.ai/library

### Force Dashboard to Use Specific Provider
In `src/app/api/chat/route.ts` line ~850, change:
```javascript
const provider = (process.env.PARP_AI_LLM_PROVIDER || process.env.LLM_PROVIDER || 'auto').toLowerCase()
```

To:
```javascript
const provider = 'ollama'  // Force Ollama for dashboard
```

---

## Testing Different Providers

### Test Ollama Only
```env
LLM_PROVIDER=ollama
```
No API keys needed. Run `ollama serve` first.

### Test Groq Only
```env
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...
```

### Test Auto (Best)
```env
LLM_PROVIDER=auto
OLLAMA_MODEL=llama2
GROQ_API_KEY=gsk_...
```
Will try Ollama, falls back to Groq.

### Test Fallback Behavior
1. Start with `LLM_PROVIDER=auto`
2. Kill Ollama (if running)
3. Send message in Dashboard
4. Check terminal - should show Groq being used

---

## Getting Free API Keys

### Groq (Recommended)
- URL: https://console.groq.com
- Signup: Free, no credit card
- Limits: 30 req/min, very generous
- Quality: Excellent, very fast

### Mistral
- URL: https://console.mistral.ai
- Signup: Free tier available
- Limits: $4 credit (≈1M tokens)
- Quality: Excellent

### HuggingFace
- URL: https://huggingface.co/settings/tokens
- Signup: Free account
- Limits: 30K tokens/month
- Quality: Good

### Replicate
- URL: https://replicate.com/account/api-tokens
- Signup: Free account, $5 credit
- Limits: Depends on model
- Quality: Good

---

##  Deployment

When deploying to production, set these variables:

```
LLM_PROVIDER=auto
GROQ_API_KEY=gsk_...
MISTRAL_API_KEY=sk_...
HUGGINGFACE_API_KEY=hf_...
# Don't set Ollama - it won't be available in cloud
```

Or if using Ollama in self-hosted:
```
OLLAMA_BASE_URL=http://ollama-service:11434
OLLAMA_MODEL=llama2
LLM_PROVIDER=auto
```

---

## Summary

✅ **Dashboard now works with local Ollama** - just like Chat page  
✅ **6 LLM providers supported** - not locked into one  
✅ **Intelligent fallback** - system tries multiple providers  
✅ **100% free option** - Ollama costs nothing  
✅ **No provider is required** - system finds whatever works  
✅ **Same error handling** - friendly messages for all providers  

**Next Step**: Install Ollama and run `ollama serve`, then test Dashboard! 🚀
