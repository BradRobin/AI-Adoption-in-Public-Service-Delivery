'use client'

import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type AuthMode = 'login' | 'signup'

type AuthFormProps = {
  initialMode?: AuthMode
  onLoginSuccess?: () => void
}

/**
 * Analyzes password strength based on length, letters, and numbers/symbols.
 * @param password The password string to analyze.
 * @returns An object containing the score (0-3) and specific criteria met.
 */
function analyzePassword(password: string) {
  const hasMinLength = password.length >= 8
  const hasLetter = /[A-Za-z]/.test(password)
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)

  let score = 0
  if (hasMinLength) score += 1
  if (hasLetter) score += 1
  if (hasNumberOrSymbol) score += 1

  return { score, hasMinLength, hasLetter, hasNumberOrSymbol }
}

/**
 * AuthForm Component
 * Renders a login or signup form with Supabase authentication.
 * Includes password strength validation and error handling.
 */
export function AuthForm({ initialMode = 'login', onLoginSuccess }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { score, hasMinLength, hasLetter, hasNumberOrSymbol } = useMemo(
    () => analyzePassword(password),
    [password],
  )

  const passwordStrengthColor =
    score <= 1 ? 'bg-red-500' : score === 2 ? 'bg-yellow-400' : 'bg-green-500'
  const passwordStrengthLabel =
    score <= 1 ? 'Weak' : score === 2 ? 'Medium' : 'Strong'

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode)
    setError(null)
    setSuccessMessage(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccessMessage(null)

    const trimmedEmail = email.trim()
    const trimmedUsername = username.trim()

    if (trimmedEmail.length === 0 || password.length === 0) {
      setError('Email and password are required.')
      toast.error('Email and password are required.')
      return
    }

    if (trimmedEmail.length > 50 || password.length > 50) {
      setError('Email and password must be at most 50 characters.')
      toast.error('Email and password must be at most 50 characters.')
      return
    }

    if (mode === 'signup') {
      if (trimmedUsername.length === 0) {
        setError('Username is required.')
        toast.error('Username is required.')
        return
      }

      if (!hasMinLength || !hasLetter || !hasNumberOrSymbol) {
        setError(
          'Please choose a stronger password that meets all requirements.',
        )
        toast.error('Please choose a stronger password that meets all requirements.')
        return
      }

      // Keep copies for the request but immediately clear the inputs
      const signupEmail = trimmedEmail
      const signupUsername = trimmedUsername
      const signupPassword = password
      setEmail('')
      setUsername('')
      setPassword('')

      try {
        setIsSubmitting(true)
        const { error: signUpError } = await supabase.auth.signUp({
          email: signupEmail,
          password: signupPassword,
          options: {
            data: { username: signupUsername },
            emailRedirectTo:
              typeof window !== 'undefined'
                ? `${window.location.origin}/login`
                : undefined,
          },
        })

        if (signUpError) {
          setError(signUpError.message || 'Unable to sign up. Please try again.')
          toast.error(signUpError.message || 'Unable to sign up. Please try again.')
          return
        }

        // Ensure there is no active session so the user is prompted to log in.
        await supabase.auth.signOut()

        setSuccessMessage('Sign up successful. Please log in.')
        toast.success('Account created. Please check your email, then log in.')
        setMode('login')
      } catch {
        setError('Unable to sign up. Please try again.')
        toast.error('Unable to sign up. Please try again.')
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // Login mode
    const loginPassword = password
    // Immediately clear the password field but keep the email
    setPassword('')

    try {
      setIsSubmitting(true)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: loginPassword,
      })

      if (signInError) {
        await supabase.auth.signOut()
        // For any auth error, keep the email and prompt user to re‑enter password
        setError('Incorrect Password')
        toast.error('Incorrect password. Please try again.')
        return
      }

      onLoginSuccess?.()
    } catch (err) {
      await supabase.auth.signOut()
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      setError(
        message.includes('fetch') || message.includes('network')
          ? 'Unable to reach the server. Check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set correctly in .env.local.'
          : message || 'Credentials not found. Please sign up to create an account.',
      )
      toast.error(
        message.includes('fetch') || message.includes('network')
          ? 'Unable to reach Supabase. Check your connection and configuration.'
          : 'Sign in failed. Please check your details and try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col rounded-xl bg-black/70 p-6 shadow-lg backdrop-blur min-h-[420px] max-h-[90vh]">
      <div className="mb-6 flex min-h-[150px] flex-col items-center justify-start gap-3">
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => handleModeChange('login')}
            className={`h-10 rounded-full px-5 text-sm font-medium transition-colors ${mode === 'login'
                ? 'bg-green-500 text-white'
                : 'bg-transparent text-white/70 hover:bg-white/10'
              }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('signup')}
            className={`h-10 rounded-full px-5 text-sm font-medium transition-colors ${mode === 'signup'
                ? 'bg-white text-black'
                : 'bg-transparent text-white/70 hover:bg-white/10'
              }`}
          >
            Sign up
          </button>
        </div>

        <h1 className="text-center text-2xl font-medium text-white sm:text-3xl">
          {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
        </h1>

        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        {successMessage && (
          <p className="text-center text-sm text-green-400">{successMessage}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto">
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-white/80"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            maxLength={50}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-0 transition-colors placeholder:text-white/30 focus:border-white/40"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        {mode === 'signup' && (
          <>
            <div>
              <label
                htmlFor="username"
                className="mb-1 block text-sm font-medium text-white/80"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                maxLength={50}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-0 transition-colors placeholder:text-white/30 focus:border-white/40"
                placeholder="Your username"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-white/80"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                maxLength={50}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-0 transition-colors placeholder:text-white/30 focus:border-white/40"
                placeholder="Choose a strong password"
                autoComplete="new-password"
                required
              />

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs text-white/60">
                  <span>Password strength</span>
                  <span
                    className={
                      score <= 1
                        ? 'text-red-400'
                        : score === 2
                          ? 'text-yellow-300'
                          : 'text-green-400'
                    }
                  >
                    {password ? passwordStrengthLabel : '—'}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10">
                  <div
                    className={`h-2 rounded-full transition-all ${passwordStrengthColor}`}
                    style={{
                      width:
                        score === 0
                          ? '0%'
                          : score === 1
                            ? '33%'
                            : score === 2
                              ? '66%'
                              : '100%',
                    }}
                  />
                </div>

                <div className="mt-3 space-y-1 text-xs text-white/70">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-4 w-4 items-center justify-center rounded-[3px] border text-[10px] ${hasMinLength
                          ? 'border-green-400 bg-green-500 text-black'
                          : 'border-white/40 text-transparent'
                        }`}
                    >
                      ✓
                    </span>
                    <span>Password should be no less than 8 characters.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-4 w-4 items-center justify-center rounded-[3px] border text-[10px] ${hasLetter
                          ? 'border-green-400 bg-green-500 text-black'
                          : 'border-white/40 text-transparent'
                        }`}
                    >
                      ✓
                    </span>
                    <span>Password should include a letter(s).</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-4 w-4 items-center justify-center rounded-[3px] border text-[10px] ${hasNumberOrSymbol
                          ? 'border-green-400 bg-green-500 text-black'
                          : 'border-white/40 text-transparent'
                        }`}
                    >
                      ✓
                    </span>
                    <span>
                      Password should include a number(s) or symbol(s).
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {mode === 'login' && (
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-white/80"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              maxLength={50}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-0 transition-colors placeholder:text-white/30 focus:border-white/40"
              placeholder="Your password"
              autoComplete="current-password"
              required
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`mt-2 inline-flex h-11 w-full items-center justify-center rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed ${mode === 'login'
              ? 'bg-green-500 text-white hover:bg-green-600 disabled:bg-green-500/60'
              : 'border border-white bg-white text-black hover:bg-gray-100 disabled:bg-white/70'
            }`}
        >
          {isSubmitting && (
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border border-white border-t-transparent" />
          )}
          {mode === 'login'
            ? isSubmitting
              ? 'Signing in...'
              : 'Login'
            : isSubmitting
              ? 'Creating account...'
              : 'Sign up'}
        </button>

        <div className="mt-4 text-center text-xs text-white/70">
          {mode === 'login' ? (
            <>
              <span>Don&apos;t have an account? </span>
              <Link
                href="/signup"
                className="font-medium text-green-400 hover:underline"
              >
                Sign up
              </Link>
            </>
          ) : (
            <>
              <span>Already have an account? </span>
              <Link
                href="/login"
                className="font-medium text-green-400 hover:underline"
              >
                Log in
              </Link>
            </>
          )}
        </div>
      </form>
    </div>
  )
}

