/**
 * @file admin/auth/page.tsx
 * @description Secure admin re-authentication gateway page.
 * Requires admins to re-enter credentials before accessing the admin dashboard.
 * Provides explicit rejection UI for non-admin users with countdown redirect.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Lock, AlertOctagon, ShieldX } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ParticleBackground } from '@/components/ParticleBackground'

/**
 * Zod validation schema for the re-authentication form.
 */
const reAuthSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
})

/** TypeScript type inferred from the Zod schema */
type ReAuthFormValues = z.infer<typeof reAuthSchema>

/**
 * AdminReAuth Component
 * Secure gateway requiring credential re-entry for admin access.
 * Verifies user role directly from database to prevent stale metadata exploitation.
 */
export default function AdminReAuth() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [authError, setAuthError] = useState<string | null>(null)
    const [isRejected, setIsRejected] = useState(false)
    const [timeLeft, setTimeLeft] = useState(10)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ReAuthFormValues>({
        resolver: zodResolver(reAuthSchema),
    })

    const triggerRejectionTimer = () => {
        setIsRejected(true)
        let timer = 10
        const interval = setInterval(() => {
            timer -= 1
            setTimeLeft(timer)
            if (timer <= 0) {
                clearInterval(interval)
                router.replace('/dashboard')
            }
        }, 1000)
    }

    const onSubmit = async (data: ReAuthFormValues) => {
        setIsLoading(true)
        setAuthError(null)

        try {
            // Re-authenticate user
            const { error: signInError, data: authData } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            })

            if (signInError || !authData.user) {
                throw new Error(signInError?.message || 'Invalid credentials')
            }

            // Verify live DB role after login success
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', authData.user.id)
                .single()

            if (profileError) {
                console.error("Profile fetch error:", profileError)
                throw new Error(`DB Error: ${profileError.message}`)
            }

            if (profile?.role === 'admin') {
                // Access Granted
                router.replace('/admin')
            } else {
                console.warn(`Rejection triggered. Fetched role was: "${profile?.role}"`)
                // Access Denied! Render rejection screen.
                triggerRejectionTimer()
            }
        } catch (error: any) {
            setAuthError(error.message)
            setIsLoading(false)
        }
    }

    return (
        <div className="relative flex min-h-screen w-full items-center justify-center bg-black font-sans text-white p-4">
            <ParticleBackground />

            <div className="relative z-10 w-full max-w-md">
                <AnimatePresence mode="wait">
                    {!isRejected ? (
                        <motion.div
                            key="login-form"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden rounded-2xl border border-white/10 bg-black/50 p-8 shadow-2xl backdrop-blur-xl"
                        >
                            <div className="mb-8 flex flex-col items-center">
                                <div className="mb-4 rounded-full border border-green-500/20 bg-green-500/10 p-3 text-green-400">
                                    <Lock size={32} />
                                </div>
                                <h1 className="text-2xl font-bold">Secure Admin Portal</h1>
                                <p className="mt-2 text-center text-sm text-white/60">
                                    Please re-authenticate to confirm your identity before accessing administrative privileges.
                                </p>
                            </div>

                            {authError && (
                                <div className="mb-6 rounded-lg bg-red-500/10 p-4 text-sm text-red-400 flex items-start gap-3">
                                    <AlertOctagon size={18} className="mt-0.5 shrink-0" />
                                    <p>{authError}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-white/70 uppercase tracking-wider">
                                        Email Address
                                    </label>
                                    <input
                                        {...register('email')}
                                        type="email"
                                        placeholder="admin@parp.gov.ke"
                                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/20 transition focus:border-green-500/50 focus:bg-white/10 focus:outline-none"
                                    />
                                    {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-white/70 uppercase tracking-wider">
                                        Master Password
                                    </label>
                                    <input
                                        {...register('password')}
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/20 transition focus:border-green-500/50 focus:bg-white/10 focus:outline-none"
                                    />
                                    {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex h-12 w-full items-center justify-center rounded-lg bg-green-500 px-4 py-3 font-semibold text-white transition hover:bg-green-400 disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    ) : (
                                        'Authorize'
                                    )}
                                </button>
                            </form>
                            <div className="mt-6 text-center">
                                <button onClick={() => router.back()} className="text-xs text-white/40 hover:text-white transition-colors">
                                    Return to Safety
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="rejection-screen"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-950/20 p-10 text-center shadow-2xl shadow-red-900/20 backdrop-blur-xl"
                        >
                            <motion.div
                                initial={{ rotate: 0 }}
                                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="mb-6 rounded-full bg-red-500/10 p-4 text-red-500"
                            >
                                <ShieldX size={48} />
                            </motion.div>

                            <h2 className="mb-2 text-2xl font-bold tracking-tight text-white">Access Denied.</h2>
                            <p className="mb-8 text-white/70">
                                You do not hold administrative privileges. Any attempt to bypass these bounds is monitored.
                            </p>

                            <div className="relative flex h-16 w-16 items-center justify-center">
                                <svg className="absolute inset-0 h-full w-full -rotate-90 transform">
                                    <circle
                                        cx="32"
                                        cy="32"
                                        r="28"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="transparent"
                                        className="text-white/10"
                                    />
                                    <motion.circle
                                        cx="32"
                                        cy="32"
                                        r="28"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="transparent"
                                        strokeDasharray={176}
                                        initial={{ strokeDashoffset: 0 }}
                                        animate={{ strokeDashoffset: 176 }}
                                        transition={{ duration: 10, ease: "linear" }}
                                        className="text-red-500"
                                    />
                                </svg>
                                <span className="text-sm font-bold text-white">{timeLeft}s</span>
                            </div>
                            <p className="mt-4 text-xs tracking-widest text-white/30 uppercase">Disconnecting...</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
