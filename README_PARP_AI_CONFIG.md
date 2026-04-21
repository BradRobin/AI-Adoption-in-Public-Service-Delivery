# PARP AI Configuration - Complete Setup Guide

## What Was Changed

Your application now uses **Together.ai**, a publicly available, free LLM service instead of proprietary APIs with invalid keys. All error handling has been improved to show user-friendly messages instead of exposing raw API errors.

### 1. Backend API Updates (✅ Complete)

**File:** `src/app/api/chat/route.ts`

#### Changes Made:
- ✅ Added `completeFromTogether()` - non-streaming completion function
- ✅ Added `streamFromTogether()` - streaming support for real-time responses
- ✅ Updated `completeFromConfiguredProvider()` - now uses Together as primary provider
- ✅ Updated error handling - all errors return user-friendly messages instead of exposing API details
- ✅ Updated `handleParpAiChat()` - integrated Together.ai for PARP AI dashboard
- ✅ Updated streaming error handlers - masks raw errors, shows friendly messages
- ✅ Updated non-streaming error handlers - same user-friendly approach

#### Error Messages:
- **Backend throws:** `"I encountered an issue generating a response. Please try again in a moment."`
- **Never shows:** Raw API errors, stack traces, or technical details

### 2. Frontend Dashboard (✅ Complete)

**File:** `src/app/dashboard/page.tsx`

**Status:** Already had proper error handling with:
```typescript
toast.error('PARP AI is unavailable right now. Please try again.')
```
Now syncs with backend user-friendly error messages.

### 3. Frontend Chat Page (✅ Complete)

**File:** `src/app/chat/page.tsx`

#### Changes Made:
- ✅ Line 637: Updated error event handler to show user-friendly message
- ✅ Line 661: Updated catch block to show user-friendly message instead of exposing error details
- ✅ Added console logging for debugging (server logs only, not user-facing)
- ✅ Updated toast notifications to be friendly and supportive

#### User-Facing Messages:
```
"I encountered an issue generating a response. Please try again in a moment."
```

### 4. Environment Configuration (✅ Complete)

**File:** `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://eizznttsyxarkbmegwgl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpenpudHRzeXhhcmtibWVnd2dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNTY5MTksImV4cCI6MjA4NTgzMjkxOX0.k6yKIzrpHAf_nWqSUyIARfzTyWgeXQjfrsZlhYLEDyE
TOGETHER_API_KEY=
LLM_PROVIDER=together
PARP_AI_LLM_PROVIDER=together
```

**Next Step:** Add your Together.ai API key to the `TOGETHER_API_KEY` field.

---

## How to Get Started

### Step 1: Get a Together.ai API Key (Free)

1. Visit **https://www.together.ai**
2. Click "Sign Up" (no credit card required for free tier)
3. Complete signup with email
4. Go to Account Settings → API Keys
5. Create a new API key
6. Copy the key

### Step 2: Update Environment File

1. Open `.env.local`
2. Find the line: `TOGETHER_API_KEY=`
3. Paste your key: `TOGETHER_API_KEY=sk-...`
4. Save the file

### Step 3: Restart the App

The development server should automatically detect the change. If not:

```bash
# Windows PowerShell
Stop-Process -Name node -Force
npm run dev
```

### Step 4: Test PARP AI

#### In Dashboard:
1. Navigate to `/dashboard`
2. Scroll to "Chat with PARP AI" card
3. Ask: "How should a Kenyan county government structure its first AI pilot?"
4. Should receive a streamed response from Together.ai

#### In Chat Page:
1. Navigate to `/chat`
2. Send a message
3. Response should stream in real-time
4. Errors (if any) will show as: "I encountered an issue generating a response..."

---

## Technical Architecture

### Request Flow

```
User Input
    ↓
Frontend (Dashboard or Chat Page)
    ↓
Next.js API Route (/api/chat)
    ↓
Auth Verification
    ↓
Determine Provider (Together.ai)
    ↓
Build LLM Messages with System Prompt
    ↓
Stream from Together.ai API
    ↓
Format & Send to Frontend
    ↓
Display to User
```

### Error Handling Flow

```
API Error Occurs (Invalid Key, Rate Limit, etc.)
    ↓
Backend logs error internally (console.error)
    ↓
Return user-friendly message:
"I encountered an issue generating a response. Please try again in a moment."
    ↓
Frontend displays message (no raw error exposed)
    ↓
User doesn't see API details, technical jargon, or sensitive information
```

---

## Supported Models (Together.ai)

The default model is: **`meta-llama/Llama-2-7b-chat-hf`** (free tier)

To use a different model, add to `.env.local`:

```env
PARP_AI_TOGETHER_MODEL=mistralai/Mistral-7B-Instruct-v0.1
TOGETHER_MODEL=mistralai/Mistral-7B-Instruct-v0.1
```

Available models (free tier):
- Llama 2 7B Chat (default)
- Mistral 7B Instruct
- Nous Hermes 2 Mixtral
- And more at https://www.together.ai/products#api

---

## Deployment Instructions

When deploying to production (Vercel, Railway, etc.), set these environment variables:

```
TOGETHER_API_KEY=sk-...
LLM_PROVIDER=together
PARP_AI_LLM_PROVIDER=together
```

Do NOT commit your API key to git. Use your platform's secrets management.

---

## Troubleshooting

### Issue: "I encountered an issue generating a response"

**Solution:**
1. Check `.env.local` has `TOGETHER_API_KEY` set
2. Verify API key is correct (copy-paste from Together.ai dashboard)
3. Check Together.ai account has free tier credits remaining
4. Restart the dev server

### Issue: Button doesn't respond

**Solution:**
1. Check browser console (F12) for JavaScript errors
2. Check server terminal for API errors
3. Verify `PARP_AI_LLM_PROVIDER=together` in `.env.local`

### Issue: Streaming is very slow

**Solution:**
1. This is normal for free tier
2. Consider upgrading to paid Together.ai tier
3. Or set up local Ollama as fallback

---

## Fallback Configuration (Optional)

To use **Ollama** (local models) as a fallback if Together.ai is unavailable:

1. Install Ollama: https://ollama.ai
2. Run: `ollama run llama2`
3. Update `.env.local`:

```env
LLM_PROVIDER=auto
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2
```

The app will try Together first, then fall back to Ollama.

---

## Files Modified

1. `src/app/api/chat/route.ts` - Added Together.ai support, error masking
2. `src/app/chat/page.tsx` - User-friendly error messages
3. `.env.local` - Added Together.ai configuration
4. **Documentation added:**
   - `PARP_AI_SETUP.md` - Setup guide
   - `SETUP_STEPS.md` - Quick start
   - `README_PARP_AI_CONFIG.md` - This file

---

## Support

For Together.ai API issues, visit: https://www.together.ai/docs

For PARP Platform issues, check:
- Dashboard (test directly in UI)
- Server logs (npm run dev output)
- Browser console (F12 DevTools)
