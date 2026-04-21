# PARP AI Configuration Guide

## Overview

PARP AI now uses **Together.ai**, a publicly available LLM service, instead of requiring API keys from proprietary services. Together.ai offers:

- **Free tier** available at https://www.together.ai
- **No credit card required** for signup
- **Multiple models** including Llama 2, Mistral, and others
- **Fast inference** and reliable uptime

## Setup Steps

### 1. Get a Together.ai API Key

1. Visit https://www.together.ai
2. Click "Sign Up" (free tier available)
3. Go to your account settings
4. Copy your API key

### 2. Update `.env.local`

Add your Together.ai API key to `c:\Users\bradr\my-app\.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://eizznttsyxarkbmegwgl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpenpudHRzeXhhcmtibWVnd2dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNTY5MTksImV4cCI6MjA4NTgzMjkxOX0.k6yKIzrpHAf_nWqSUyIARfzTyWgeXQjfrsZlhYLEDyE
TOGETHER_API_KEY=your_together_api_key_here
LLM_PROVIDER=together
PARP_AI_LLM_PROVIDER=together
```

Replace `your_together_api_key_here` with your actual API key.

### 3. Restart the Application

```bash
npm run dev
```

## Deployment

For production, ensure these environment variables are set in your deployment platform (Vercel, Railway, etc.):

- `TOGETHER_API_KEY` - Your Together.ai API key
- `LLM_PROVIDER=together`
- `PARP_AI_LLM_PROVIDER=together`

## Error Handling

The platform now provides user-friendly error messages instead of exposing raw API errors. If you see a message like:

> "I encountered an issue generating a response. Please try again in a moment."

This means the API had a temporary issue. Check your `.env.local` file for a valid `TOGETHER_API_KEY`.

## Fallback Configuration

If you want to use **Ollama** (local models) as a fallback:

1. Install Ollama: https://ollama.ai
2. Run a model: `ollama run llama2`
3. Set in `.env.local`:
   ```env
   LLM_PROVIDER=auto
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama2
   ```

The app will automatically try Together first, then fall back to Ollama if needed.

## Supported Models (Together.ai)

- `meta-llama/Llama-2-7b-chat-hf` (default, free)
- `mistralai/Mistral-7B-Instruct-v0.1`
- `NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO`
- And many more...

See https://www.together.ai/products#api for the full list.

## Troubleshooting

### Error: "Unable to generate response"

1. Verify your `TOGETHER_API_KEY` is correct
2. Check that you have remaining free tier credits
3. Try a different model in `.env.local`

### Restarting the App

After updating `.env.local`:

```bash
# Windows
Stop-Process -Name node -Force

# Then restart
npm run dev
```
