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
    <div className="relative flex min-h-screen w-full justify-center overflow-hidden bg-black px-4 font-sans">
      <ParticleBackground />
      <main className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-6 pt-16 pb-10">
        <h1 className="text-center text-3xl font-bold text-white md:text-4xl">
          Welcome {displayName}
        </h1>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex h-12 min-w-[140px] items-center justify-center rounded-lg bg-red-500 px-6 font-medium text-white transition-colors hover:bg-red-600"
        >
          Sign Out
        </button>
      </main>
    </div>
  )
}
