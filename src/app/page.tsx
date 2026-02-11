'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { ParticleBackground } from '@/components/ParticleBackground'
import type { Session } from '@supabase/supabase-js'

export default function Home() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)
  const greetings = ['Hi', 'Sasa', 'Rada'] as const
  const [greetingIndex, setGreetingIndex] = useState(0)
  const [isGreetingVisible, setIsGreetingVisible] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()
      setSession(currentSession)
      setIsLoading(false)

      if (!currentSession) {
        router.replace('/login')
        return
      }
    }

    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      if (event === 'SIGNED_OUT' && !newSession) {
        setSessionExpired(true)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  useEffect(() => {
    const DISPLAY_MS = 2500
    const FADE_MS = 500

    const hideTimeout = setTimeout(() => {
      setIsGreetingVisible(false)
    }, DISPLAY_MS)

    const showTimeout = setTimeout(() => {
      setGreetingIndex((prev) => (prev + 1) % greetings.length)
      setIsGreetingVisible(true)
    }, DISPLAY_MS + FADE_MS)

    return () => {
      clearTimeout(hideTimeout)
      clearTimeout(showTimeout)
    }
  }, [greetings.length, greetingIndex])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (isLoading) {
    return (
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black font-sans">
        <ParticleBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <p className="text-white/80">Checking session...</p>
        </div>
      </div>
    )
  }

  if (sessionExpired) {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black px-4 font-sans">
        <ParticleBackground />
        <div className="relative z-10 flex max-w-md flex-col items-center gap-6 text-center">
          <p className="text-lg text-red-400 md:text-xl">
            Your session has ended. Please sign in again.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/login"
              className="flex h-12 min-w-[140px] items-center justify-center rounded-lg bg-green-500 px-6 font-medium text-white transition-colors hover:bg-green-600"
            >
              Login
            </Link>
            <Link
              href="/login"
              className="flex h-12 min-w-[140px] items-center justify-center rounded-lg border border-white bg-white px-6 font-medium text-black transition-colors hover:bg-gray-100"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const rawUsername =
    (session.user?.user_metadata as { username?: string } | null | undefined)
      ?.username

  const formatName = (name?: string | null) => {
    if (!name || typeof name !== 'string') return undefined
    return name.charAt(0).toUpperCase() + name.slice(1)
  }

  const displayName =
    formatName(rawUsername) ?? session.user?.email ?? 'User'

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-black font-sans">
      <ParticleBackground />
      <nav className="absolute right-4 top-4 z-20 flex items-center gap-3 text-sm md:text-base">
        <Link
          href="/"
          className="rounded-lg px-3 py-1 text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Home
        </Link>
        <Link
          href="/assess"
          className="rounded-lg px-3 py-1 text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Assess
        </Link>
        <Link
          href="/chat"
          className="rounded-lg px-3 py-1 text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Chat
        </Link>
        <Link
          href="/privacy"
          className="rounded-lg px-3 py-1 text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Privacy
        </Link>
        <Link
          href="/report"
          className="rounded-lg px-3 py-1 text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Report
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-lg px-3 py-1 text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          SignOut
        </button>
      </nav>
      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-4 pt-20 pb-24 text-center">
        <div className="flex min-h-[4rem] items-center justify-center md:min-h-[5rem]">
          <h1
            className={`text-center text-6xl font-bold text-white transition-all duration-500 ease-out md:text-7xl ${
              isGreetingVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-2'
            }`}
          >
            {greetings[greetingIndex]} {displayName}
          </h1>
        </div>
        <p className="mt-4 max-w-xl text-base text-white/80 md:text-lg">
          Assess your Technology–Organization–Environment (TOE) readiness and
          understand how your capabilities create meaningful public value.
        </p>
      </main>
      <div className="absolute bottom-4 right-4 z-20">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex h-10 min-w-[120px] items-center justify-center rounded-lg bg-red-500 px-5 text-sm font-medium text-white transition-colors hover:bg-red-600 md:h-11 md:min-w-[140px] md:px-6 md:text-base"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
