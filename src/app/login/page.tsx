'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ParticleBackground } from '@/components/ParticleBackground'
import { AuthForm } from '@/components/AuthForm'

/**
 * LoginPage
 * Wraps the AuthForm in 'login' mode.
 */
export default function LoginPage() {
  const router = useRouter()
  const [showSkeleton, setShowSkeleton] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSkeleton(false)
    }, 550)

    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black font-sans">
      <ParticleBackground />
      <main id="main-content" className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        {showSkeleton ? (
          <div className="flex w-full max-w-md flex-col rounded-xl border border-white/10 bg-black/70 p-6 shadow-lg backdrop-blur min-h-105">
            <div className="mb-6 flex min-h-37.5 flex-col items-center gap-3">
              <div className="flex gap-3">
                <div className="h-10 w-24 animate-pulse rounded-full bg-green-500/25" />
                <div className="h-10 w-24 animate-pulse rounded-full bg-white/10" />
              </div>
              <div className="h-8 w-52 animate-pulse rounded-full bg-white/10" />
              <div className="h-4 w-32 animate-pulse rounded-full bg-white/8" />
            </div>
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <div className="h-4 w-14 animate-pulse rounded-full bg-white/10" />
                <div className="h-11 w-full animate-pulse rounded-xl bg-white/8" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-20 animate-pulse rounded-full bg-white/10" />
                <div className="h-11 w-full animate-pulse rounded-xl bg-white/8" />
              </div>
              <div className="mt-3 h-11 w-full animate-pulse rounded-xl bg-green-500/20" />
            </div>
          </div>
        ) : (
          <AuthForm initialMode="login" onLoginSuccess={() => router.replace('/dashboard')} />
        )}
      </main>
    </div>
  )
}

