'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { ParticleBackground } from '@/components/ParticleBackground'
import type { Session } from '@supabase/supabase-js'

export default function LandingPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Effect: Check for active session. If logged in, redirect to dashboard.
  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession()

        setSession(currentSession)

        if (currentSession) {
          router.replace('/dashboard')
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('Error checking session on landing page:', error)
        }
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [router])

  // Show loading spinner while checking auth state to prevent flash of content
  if (isLoading) {
    return (
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black font-sans">
        <ParticleBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      </div>
    )
  }

  // If session exists (and redirect is happening), show nothing or a spinner
  if (session) {
    return (
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black font-sans">
        <ParticleBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <p className="text-white/80">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-black font-sans text-white">
      <ParticleBackground />

      {/* Header / Nav */}
      <header className="relative z-20 flex w-full items-center justify-between px-6 py-4 md:px-12">
        <div className="text-xl font-bold tracking-tight">PARP</div>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-gray-200"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="max-w-3xl space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
            <span className="block text-white">PARP</span>
            <span className="mt-2 block bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-2xl text-transparent sm:text-4xl md:text-5xl">
              AI Readiness Platform
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-gray-300 md:text-xl">
            Assess your organization&apos;s readiness for AI adoption in Kenyan public services.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
            <Link
              href="/signup"
              className="flex h-12 w-full min-w-[160px] items-center justify-center rounded-full bg-green-500 px-8 text-base font-semibold text-black transition hover:bg-green-400 sm:w-auto"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="flex h-12 w-full min-w-[160px] items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 text-base font-medium text-white backdrop-blur-sm transition hover:bg-white/10 sm:w-auto"
            >
              Log In
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 pt-8 text-left sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h3 className="mb-2 font-semibold text-green-400">TOE Framework</h3>
              <p className="text-sm text-gray-400">
                Scientific assessment based on Technological, Organizational, and Environmental contexts.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h3 className="mb-2 font-semibold text-blue-400">Public Value</h3>
              <p className="text-sm text-gray-400">
                Tailored for public service delivery to enhance efficiency and citizen satisfaction.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h3 className="mb-2 font-semibold text-purple-400">Kenyan Context</h3>
              <p className="text-sm text-gray-400">
                Aligned with local strategies and digital transformation goals in Kenya.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/10 bg-black/50 py-6 text-center backdrop-blur-sm">
        <p className="text-xs text-gray-500">
          Powered by Next.js & Supabase · Built by Engineer Brad Robinson
        </p>
      </footer>
    </div>
  )
}
