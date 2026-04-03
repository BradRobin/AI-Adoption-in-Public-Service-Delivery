'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ParticleBackground } from '@/components/ParticleBackground'
import { AuthForm } from '@/components/AuthForm'
import { AppPageSkeleton } from '@/components/AppPageSkeleton'

/**
 * SignupPage
 * Wraps the AuthForm in 'signup' mode.
 */
export default function SignupPage() {
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
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        {showSkeleton ? (
          <AppPageSkeleton variant="auth" />
        ) : (
          <AuthForm initialMode="signup" onLoginSuccess={() => router.replace('/dashboard')} />
        )}
      </div>
    </div>
  )
}

