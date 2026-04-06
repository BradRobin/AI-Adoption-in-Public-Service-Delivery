/**
 * @file AuthForm.tsx
 * @description Unified authentication form supporting both login and signup modes.
 * Features password strength validation, county selection, and Supabase integration.
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import toast from '@/lib/toast'
import { CountySelect } from '@/components/CountySelect'

type AuthMode = 'login' | 'signup'
type GenderOption = 'male' | 'female' | 'rather_not_say'

type AuthFormProps = {
  initialMode?: AuthMode
  onLoginSuccess?: () => void
}

const GENDER_OPTIONS: Array<{ value: GenderOption; label: string }> = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'rather_not_say', label: 'Rather not say' },
]

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
  const [forgotEmail, setForgotEmail] = useState('')
  const [location, setLocation] = useState('')
  const [gender, setGender] = useState<GenderOption>('rather_not_say')
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotPrompt, setShowForgotPrompt] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [forgotMessage, setForgotMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [isLoggingInTransition, setIsLoggingInTransition] = useState(false)
  const [shouldPulseLoginToggle, setShouldPulseLoginToggle] = useState(false)

  const { score, hasMinLength, hasLetter, hasNumberOrSymbol } = useMemo(
    () => analyzePassword(password),
    [password],
  )

  const passwordStrengthColor =
    score <= 1 ? 'bg-red-500' : score === 2 ? 'bg-yellow-400' : 'bg-green-500'
  const passwordStrengthLabel =
    score <= 1 ? 'Weak' : score === 2 ? 'Medium' : 'Strong'

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const signedOut = new URLSearchParams(window.location.search).get('signed_out') === '1'
    if (!signedOut) {
      return
    }

    setMode('login')
    setShouldPulseLoginToggle(true)

    const timer = window.setTimeout(() => {
      setShouldPulseLoginToggle(false)
    }, 1800)

    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode)
    setError(null)
    setSuccessMessage(null)
    setShowForgotPrompt(false)
    setForgotMessage(null)
  }

  const handleForgotPassword = async (event: FormEvent) => {
    event.preventDefault()
    setForgotMessage(null)

    const trimmedEmail = forgotEmail.trim()
    if (!trimmedEmail || trimmedEmail.length > 50) {
      setForgotMessage('Please enter a valid email address.')
      toast.error('Please enter a valid email address.')
      return
    }

    try {
      setIsSendingReset(true)
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      })

      let data: { message?: string } | null = null
      try {
        data = await response.json()
      } catch {
        data = null
      }

      if (!response.ok) {
        const message = data?.message || 'Unable to send reset link. Please try again.'
        setForgotMessage(message)
        toast.error(message)
        return
      }

      const success =
        data?.message ||
        'If an account exists for that email, a reset link has been sent.'
      setForgotMessage(success)
      toast.success(success)
    } catch {
      setForgotMessage('Unable to send reset link. Please try again.')
      toast.error('Unable to send reset link. Please try again.')
    } finally {
      setIsSendingReset(false)
    }
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
      const signupLocation = location
      const signupGender = gender
      setEmail('')
      setUsername('')
      setPassword('')
      setLocation('')
      setGender('rather_not_say')

      try {
        setIsSubmitting(true)
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: signupEmail,
          password: signupPassword,
          options: {
            data: { username: signupUsername, location: signupLocation, gender: signupGender },
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

        // Update the profile with location if user was created
        if (signUpData.user) {
          await supabase
            .from('profiles')
            .update({
              location: signupLocation,
              gender: signupGender,
            })
            .eq('id', signUpData.user.id)
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

      setIsLoggingInTransition(true)
      onLoginSuccess?.()
    } catch (err) {
      await supabase.auth.signOut()
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      setError(
        message.includes('fetch') || message.includes('network')
          ? 'Unable to reach the server. Check your connection.'
          : message || 'Invalid credentials.',
      )
      toast.error(
        message.includes('fetch') || message.includes('network')
          ? 'Unable to reach the server. Check your connection.'
          : 'Invalid email or password. Please try again.',
      )
      setIsLoggingInTransition(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex w-full max-w-md flex-col rounded-xl bg-black/70 p-6 shadow-lg backdrop-blur min-h-105 max-h-[90vh]">
      {isLoggingInTransition && (
        <div className="absolute inset-0 z-20 flex flex-col justify-between rounded-xl border border-white/15 bg-zinc-950/72 p-6 backdrop-blur-sm">
          <div className="space-y-3">
            <div className="h-10 w-32 animate-pulse rounded-full bg-green-400/35" />
            <div className="h-7 w-48 animate-pulse rounded-full bg-white/16" />
            <div className="h-4 w-40 animate-pulse rounded-full bg-white/12" />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/12 bg-white/8 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <div className="space-y-3">
                <div className="h-4 w-28 animate-pulse rounded-full bg-white/18" />
                <div className="h-3 w-full animate-pulse rounded-full bg-white/14" />
                <div className="h-3 w-5/6 animate-pulse rounded-full bg-white/14" />
                <div className="h-3 w-4/6 animate-pulse rounded-full bg-white/14" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-24 animate-pulse rounded-2xl border border-white/12 bg-white/8 shadow-[0_8px_24px_rgba(0,0,0,0.14)]" />
              <div className="h-24 animate-pulse rounded-2xl border border-white/12 bg-white/8 shadow-[0_8px_24px_rgba(0,0,0,0.14)]" />
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm font-medium text-white/90">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border border-green-300/50 border-t-green-200" />
            Opening your dashboard...
          </div>
        </div>
      )}

      <div className="mb-6 flex min-h-37.5 flex-col items-center justify-start gap-3">
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => handleModeChange('login')}
            className={`h-10 rounded-full px-5 text-sm font-medium transition-all ${mode === 'login'
              ? `bg-green-500 text-white ${shouldPulseLoginToggle ? 'scale-105 shadow-[0_0_0_8px_rgba(34,197,94,0.12)] animate-pulse' : ''}`
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
            className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-0 transition-colors placeholder:text-black/60 focus:border-white/40"
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
                className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-0 transition-colors placeholder:text-black/60 focus:border-white/40"
                placeholder="Your username"
                autoComplete="username"
                required
              />
            </div>

            <div className="relative">
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-white/80"
              >
                Password
              </label>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                maxLength={50}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-0 transition-colors placeholder:text-black/60 focus:border-white/40"
                placeholder="Choose a strong password"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[2.4rem] text-white/50 hover:text-white"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>

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
                        ? 'border-green-400 bg-green-500 text-white'
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
                        ? 'border-green-400 bg-green-500 text-white'
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
                        ? 'border-green-400 bg-green-500 text-white'
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

            <div>
              <label
                htmlFor="location"
                className="mb-1 block text-sm font-medium text-white/80"
              >
                County (Optional)
              </label>
              <CountySelect
                id="location"
                value={location}
                onChange={setLocation}
                placeholder="Select your county"
              />
              <p className="mt-1 text-xs text-white/40">
                Helps personalize AI responses to your region.
              </p>
            </div>

            <fieldset>
              <legend className="mb-1 block text-sm font-medium text-white/80">Gender</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {GENDER_OPTIONS.map((option) => {
                  const isSelected = gender === option.value

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setGender(option.value)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        isSelected
                          ? 'border-green-400 bg-green-500 text-white'
                          : 'border-white/10 bg-black/60 text-white/80 hover:border-white/25 hover:bg-black/50'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
                Used only to keep responses appropriately personalized. You can choose rather not say.
              </p>
            </fieldset>
          </>
        )}

        {mode === 'login' && (
          <div className="relative">
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-white/80"
            >
              Password
            </label>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              maxLength={50}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-0 transition-colors placeholder:text-black/60 focus:border-white/40"
              placeholder="Your password"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[2.4rem] text-white/50 hover:text-white"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>

            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email.trim())
                  setForgotMessage(null)
                  setShowForgotPrompt(true)
                }}
                className="text-xs font-medium text-green-400 hover:underline"
              >
                Forgot password?
              </button>
            </div>
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

      {showForgotPrompt && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-black/90 p-5 shadow-lg backdrop-blur">
            <h2 className="text-lg font-medium text-white">Reset your password</h2>
            <p className="mt-1 text-sm text-white/70">
              Enter your email and we&apos;ll send you a secure reset link.
            </p>

            <form onSubmit={handleForgotPassword} className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="forgot-email"
                  className="mb-1 block text-sm font-medium text-white/80"
                >
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  maxLength={50}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-0 transition-colors placeholder:text-black/60 focus:border-white/40"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              {forgotMessage && (
                <p className="text-xs text-white/80">{forgotMessage}</p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForgotPrompt(false)}
                  className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingReset}
                  className="inline-flex items-center justify-center rounded-lg bg-green-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-500/60"
                >
                  {isSendingReset && (
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border border-white border-t-transparent" />
                  )}
                  {isSendingReset ? 'Sending...' : 'Send reset link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

