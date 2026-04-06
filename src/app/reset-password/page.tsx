'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ParticleBackground } from '@/components/ParticleBackground'
import { AppPageSkeleton } from '@/components/AppPageSkeleton'
import { supabase } from '@/lib/supabase/client'
import toast from '@/lib/toast'

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

function ResetPasswordFallback() {
  return <AppPageSkeleton variant="auth" message="Loading reset form..." />
}

function ResetPasswordContent() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isVerifyingLink, setIsVerifyingLink] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { score, hasMinLength, hasLetter, hasNumberOrSymbol } = useMemo(
    () => analyzePassword(password),
    [password],
  )

  const passwordStrengthColor =
    score <= 1 ? 'bg-red-500' : score === 2 ? 'bg-yellow-400' : 'bg-green-500'
  const passwordStrengthLabel =
    score <= 1 ? 'Weak' : score === 2 ? 'Medium' : 'Strong'
  const passwordStrengthWidthClass =
    score === 0 ? 'w-0' : score === 1 ? 'w-1/3' : score === 2 ? 'w-2/3' : 'w-full'

  useEffect(() => {
    let isMounted = true

    const verifyRecoveryLink = async () => {
      try {
        const searchParams =
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search)
            : new URLSearchParams('')
        const code = searchParams.get('code')
        const tokenHash = searchParams.get('token_hash')
        const type = searchParams.get('type')

        if (typeof window !== 'undefined') {
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          const hashType = hashParams.get('type')

          if (accessToken && refreshToken && (hashType === 'recovery' || type === 'recovery')) {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })

            if (setSessionError) {
              throw setSessionError
            }

            window.history.replaceState({}, '', window.location.pathname + window.location.search)

            if (isMounted) {
              setIsReady(true)
              setError(null)
            }
            return
          }
        }

        if (code) {
          const { error: codeError } = await supabase.auth.exchangeCodeForSession(code)
          if (codeError) {
            throw codeError
          }

          if (typeof window !== 'undefined') {
            const nextUrl = new URL(window.location.href)
            nextUrl.searchParams.delete('code')
            nextUrl.searchParams.delete('type')
            window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}`)
          }

          if (isMounted) {
            setIsReady(true)
            setError(null)
          }
          return
        }

        if (tokenHash && type === 'recovery') {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          })

          if (verifyError) {
            throw verifyError
          }

          if (typeof window !== 'undefined') {
            const nextUrl = new URL(window.location.href)
            nextUrl.searchParams.delete('token_hash')
            nextUrl.searchParams.delete('type')
            window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}`)
          }

          if (isMounted) {
            setIsReady(true)
            setError(null)
          }
          return
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          throw new Error('This reset link is invalid or has expired. Please request a new one.')
        }

        if (isMounted) {
          setIsReady(true)
          setError(null)
        }
      } catch (verificationError) {
        const errorMessage =
          verificationError instanceof Error
            ? verificationError.message
            : 'This reset link is invalid or has expired. Please request a new one.'

        if (isMounted) {
          setIsReady(false)
          setError(errorMessage)
          toast.error(errorMessage)
        }
      } finally {
        if (isMounted) {
          setIsVerifyingLink(false)
        }
      }
    }

    void verifyRecoveryLink()

    return () => {
      isMounted = false
    }
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (!isReady) {
      setError('Reset verification is incomplete. Please use the link from your email again.')
      return
    }

    if (!hasMinLength || !hasLetter || !hasNumberOrSymbol) {
      const passwordError = 'Please choose a stronger password that meets all requirements.'
      setError(passwordError)
      toast.error(passwordError)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      toast.error('Passwords do not match.')
      return
    }

    try {
      setIsSubmitting(true)
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setError(updateError.message || 'Unable to update password. Please try again.')
        toast.error(updateError.message || 'Unable to update password. Please try again.')
        return
      }

      await supabase.auth.signOut()

      const success = 'Password updated successfully. Please log in with your new password.'
      setMessage(success)
      toast.success(success)
      router.replace('/login')
    } catch {
      setError('Unable to update password. Please try again.')
      toast.error('Unable to update password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black font-sans">
      <ParticleBackground />
      <main
        id="main-content"
        className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8"
      >
        <div className="flex w-full max-w-md flex-col rounded-xl bg-black/70 p-6 shadow-lg backdrop-blur min-h-115">
          <div className="mb-6 flex flex-col gap-3">
            <h1 className="text-center text-2xl font-medium text-white sm:text-3xl">
              Set a new password
            </h1>
            <p className="text-center text-sm text-white/70">
              Choose a secure password, confirm it, and save to complete account recovery.
            </p>

            {isVerifyingLink && (
              <p className="text-center text-sm text-white/80">Verifying reset link...</p>
            )}
            {error && <p className="text-center text-sm text-red-400">{error}</p>}
            {message && <p className="text-center text-sm text-green-400">{message}</p>}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <label
                htmlFor="new-password"
                className="mb-1 block text-sm font-medium text-white/80"
              >
                New password
              </label>
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                maxLength={50}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-0 transition-colors placeholder:text-white/30 focus:border-white/40"
                placeholder="Choose a strong password"
                autoComplete="new-password"
                disabled={isVerifyingLink || !isReady || isSubmitting}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[2.4rem] text-white/50 hover:text-white"
                disabled={isVerifyingLink || isSubmitting}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="relative">
              <label
                htmlFor="confirm-password"
                className="mb-1 block text-sm font-medium text-white/80"
              >
                Repeat new password
              </label>
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                maxLength={50}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none ring-0 transition-colors placeholder:text-white/30 focus:border-white/40"
                placeholder="Repeat your new password"
                autoComplete="new-password"
                disabled={isVerifyingLink || !isReady || isSubmitting}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-[2.4rem] text-white/50 hover:text-white"
                disabled={isVerifyingLink || isSubmitting}
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <div>
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
                  className={`h-2 rounded-full transition-all ${passwordStrengthColor} ${passwordStrengthWidthClass}`}
                />
              </div>

              <div className="mt-3 space-y-1 text-xs text-white/70">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-4 w-4 items-center justify-center rounded-[3px] border text-[10px] ${
                      hasMinLength
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
                    className={`inline-flex h-4 w-4 items-center justify-center rounded-[3px] border text-[10px] ${
                      hasLetter
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
                    className={`inline-flex h-4 w-4 items-center justify-center rounded-[3px] border text-[10px] ${
                      hasNumberOrSymbol
                        ? 'border-green-400 bg-green-500 text-white'
                        : 'border-white/40 text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <span>Password should include a number(s) or symbol(s).</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isVerifyingLink || !isReady}
              className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-lg bg-green-500 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-500/60"
            >
              {isSubmitting && (
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border border-white border-t-transparent" />
              )}
              {isSubmitting ? 'Saving password...' : 'Save new password'}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-white/70">
            <span>Remembered your password? </span>
            <Link href="/login" className="font-medium text-green-400 hover:underline">
              Back to login
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordContent />
    </Suspense>
  )
}
