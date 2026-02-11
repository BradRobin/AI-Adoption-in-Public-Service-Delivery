'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Session } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase/client'
import { ParticleBackground } from '@/components/ParticleBackground'

export default function AssessPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()

      if (!currentSession) {
        router.replace('/login')
        return
      }

      setSession(currentSession)
      setIsLoading(false)
    }

    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'SIGNED_OUT' || !newSession) {
        setSession(null)
        router.replace('/login')
        return
      }

      setSession(newSession)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

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

  if (!session) {
    return null
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black px-4 font-sans">
      <ParticleBackground />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur md:p-8">
        <h1 className="text-xl font-semibold text-white md:text-2xl">
          AI Readiness Assessment (TOE Framework)
        </h1>
        <p className="mt-3 text-sm text-white/80 md:text-base">
          Begin exploring your organization&apos;s readiness to adopt AI by
          looking at your Technology, Organization, and Environment (TOE)
          factors. This page will soon guide you through a structured
          assessment.
        </p>
        <p className="mt-4 text-sm font-medium text-white/90">
          Assessment form coming soon
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}

