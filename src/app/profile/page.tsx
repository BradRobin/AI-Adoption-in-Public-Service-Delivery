'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Session } from '@supabase/supabase-js'
import toast from 'react-hot-toast'

import { ParticleBackground } from '@/components/ParticleBackground'
import { supabase } from '@/lib/supabase/client'

export default function ProfilePage() {
    const router = useRouter()
    const [session, setSession] = useState<Session | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const [location, setLocation] = useState('')
    const [role, setRole] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { session: currentSession } } = await supabase.auth.getSession()

            if (!currentSession) {
                router.replace('/login')
                return
            }

            setSession(currentSession)

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('role, location')
                .eq('id', currentSession.user.id)
                .single()

            if (profile) {
                setRole(profile.role || 'user')
                setLocation(profile.location || '')
            } else if (error) {
                console.error('Error fetching profile:', error)
            }

            setIsLoading(false)
        }

        fetchProfile()
    }, [router])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        toast.success('You have been signed out.')
        router.replace('/login')
    }

    const handleSave = async (e: FormEvent) => {
        e.preventDefault()
        if (!session) return

        setIsSaving(true)
        const { error } = await supabase
            .from('profiles')
            .update({ location: location.trim() })
            .eq('id', session.user.id)

        if (error) {
            toast.error('Failed to update profile.')
            console.error(error)
        } else {
            toast.success('Profile updated successfully!')
        }
        setIsSaving(false)
    }

    if (isLoading) {
        return (
            <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black font-sans">
                <ParticleBackground />
                <div className="relative z-10 flex w-full max-w-md flex-col gap-4 px-4">
                    {/* Loader */}
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <p className="text-sm text-white/80">Loading profile...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (!session) return null

    return (
        <div className="relative flex min-h-screen w-full overflow-hidden bg-black font-sans">
            <ParticleBackground />

            <nav className="absolute right-4 top-4 z-20 flex flex-wrap items-center gap-2 text-xs sm:text-sm md:text-base">
                <Link href="/" className="rounded-lg px-3 py-1 text-white/80 transition hover:bg-white/10 hover:text-white">Home</Link>
                <Link href="/assess" className="rounded-lg px-3 py-1 text-white/80 transition hover:bg-white/10 hover:text-white">Assess</Link>
                <Link href="/chat" className="rounded-lg px-3 py-1 text-white/80 transition hover:bg-white/10 hover:text-white">Chat</Link>
                <Link href="/profile" className="rounded-lg px-3 py-1 text-white/80 transition hover:bg-white/10 hover:text-white font-semibold">Profile</Link>
                <Link href="/privacy" className="rounded-lg px-3 py-1 text-white/80 transition hover:bg-white/10 hover:text-white">Privacy</Link>
                <Link href="/report" className="rounded-lg px-3 py-1 text-white/80 transition hover:bg-white/10 hover:text-white">Report</Link>
                <button type="button" onClick={handleSignOut} className="rounded-lg px-3 py-1 text-white/80 transition hover:bg-white/10 hover:text-white">SignOut</button>
            </nav>

            <main className="relative z-10 mx-auto flex w-full max-w-md flex-col px-4 pt-32 pb-24 items-center justify-center">
                <div className="flex w-full flex-col rounded-2xl border border-white/10 bg-black/60 shadow-xl backdrop-blur p-6">
                    <header className="mb-6">
                        <h1 className="text-2xl font-semibold text-white">Your Profile</h1>
                        <p className="mt-1 text-sm text-white/70">Update your details for personalized AI responses.</p>
                    </header>

                    <form onSubmit={handleSave} className="flex flex-col gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-white/80">Email</label>
                            <input type="text" disabled value={session.user.email} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/50 cursor-not-allowed" />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-white/80">Role</label>
                            <input type="text" disabled value={role} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/50 cursor-not-allowed uppercase" />
                            <p className="mt-1 text-xs text-white/40">Roles are managed by administrators.</p>
                        </div>

                        <div>
                            <label htmlFor="location" className="mb-1 block text-sm font-medium text-white/80">Location / County</label>
                            <input
                                id="location"
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="e.g. Nairobi, Mombasa, Kisumu"
                                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-white/40 placeholder:text-white/20"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSaving}
                            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-green-500 text-sm font-medium text-black transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-500/60"
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    )
}
