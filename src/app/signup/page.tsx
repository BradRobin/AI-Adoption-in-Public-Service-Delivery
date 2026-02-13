'use client'

import { useRouter } from 'next/navigation'
import { ParticleBackground } from '@/components/ParticleBackground'
import { AuthForm } from '@/components/AuthForm'

/**
 * SignupPage
 * Wraps the AuthForm in 'signup' mode.
 */
export default function SignupPage() {
  const router = useRouter()

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black font-sans">
      <ParticleBackground />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <AuthForm initialMode="signup" onLoginSuccess={() => router.replace('/')} />
      </div>
    </div>
  )
}

