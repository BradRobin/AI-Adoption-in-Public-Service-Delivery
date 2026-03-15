/**
 * @file profile/page.tsx
 * @description User profile settings page for managing account details.
 * Allows users to update username, email, password, and location.
 * Changes are synchronized with both Supabase Auth and profiles table.
 */

'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Session } from '@supabase/supabase-js'
import toast from 'react-hot-toast'

import { ParticleBackground } from '@/components/ParticleBackground'
import { NavigationMenu } from '@/components/NavigationMenu'
import { CountySelect } from '@/components/CountySelect'
import { supabase } from '@/lib/supabase/client'

/**
 * ProfilePage Component
 * Provides a form interface for users to view and update their account settings.
 * Fetches current profile data on mount and handles save with proper validation.
 */
export default function ProfilePage() {
    const router = useRouter()
    const [session, setSession] = useState<Session | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const [location, setLocation] = useState('')
    const [role, setRole] = useState('')
    const [email, setEmail] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { session: currentSession } } = await supabase.auth.getSession()

            if (!currentSession) {
                router.replace('/login')
                return
            }

            setSession(currentSession)
            setEmail(currentSession.user.email || '')
            setUsername((currentSession.user.user_metadata?.username as string) || '')

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

        let hasAuthChanges = false
        const authUpdates: any = {}

        if (email !== session.user.email) {
            authUpdates.email = email
            hasAuthChanges = true
        }

        if (password) {
            authUpdates.password = password
            hasAuthChanges = true
        }

        if (username !== (session.user.user_metadata?.username || '')) {
            authUpdates.data = { username }
            hasAuthChanges = true
        }

        let authError = null
        if (hasAuthChanges) {
            const { error } = await supabase.auth.updateUser(authUpdates)
            authError = error
        }

        const { error: profileError } = await supabase
            .from('profiles')
            .update({ location: location.trim() })
            .eq('id', session.user.id)

        if (profileError) {
            toast.error('Failed to update profile location.')
            console.error(profileError)
        } else if (authError) {
            toast.error(authError.message || 'Failed to update account details.')
            console.error(authError)
        } else {
            if (authUpdates.email) {
                toast.success('Profile updated! Please check your new email to confirm the change.')
            } else {
                toast.success('Profile updated successfully!')
            }
            setPassword('') // Clear password field after save
        }

        // Refresh session to get updated metadata locally
        if (hasAuthChanges && !authError) {
            await supabase.auth.getSession()
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
        <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-black font-sans">
            <ParticleBackground />

            <nav className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
                <div className="text-xl font-bold tracking-tight text-white">PARP</div>
                <div className="flex items-center gap-4">
                    <span className="hidden text-sm text-white/60 sm:inline-block">
                        {session.user?.email}
                    </span>
                    <NavigationMenu />
                </div>
            </nav>

            <main id="main-content" className="relative z-10 mx-auto flex w-full max-w-md flex-col px-4 pt-16 pb-24 items-center justify-center">
                <div className="flex w-full flex-col rounded-2xl border border-white/10 bg-black/60 shadow-xl backdrop-blur p-6">
                    <header className="mb-6 text-center">
                        <h1 className="text-2xl font-semibold text-white">Your Profile</h1>
                        <p className="mt-1 text-sm text-white/70">Update your details for personalized AI responses.</p>
                    </header>

                    <form onSubmit={handleSave} className="flex flex-col gap-5">
                        <div>
                            <label htmlFor="username" className="mb-1 block text-sm font-medium text-white/80">Username</label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Your preferred display name"
                                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-white/40 placeholder:text-white/20"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="mb-1 block text-sm font-medium text-white/80">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-white/40"
                            />
                            <p className="mt-1 text-xs text-white/40">Changing your email will require verification.</p>
                        </div>

                        <div>
                            <label htmlFor="password" className="mb-1 block text-sm font-medium text-white/80">New Password</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Leave blank to keep current password"
                                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-white/40 placeholder:text-white/20"
                            />
                        </div>

                        <div>
                            <label htmlFor="location" className="mb-1 block text-sm font-medium text-white/80">Location / County</label>
                            <CountySelect
                                id="location"
                                value={location}
                                onChange={setLocation}
                                placeholder="Select your county"
                            />
                            <p className="mt-1 text-xs text-white/40">Helps personalize AI responses to your region.</p>
                        </div>

                        <div className="pt-2 border-t border-white/10">
                            <label className="mb-1 block text-sm font-medium text-white/80">Role</label>
                            <input type="text" disabled value={role} className="w-full rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-sm text-white/40 cursor-not-allowed uppercase" />
                            <p className="mt-1 text-xs text-white/40">Roles are managed by administrators.</p>
                        </div>

                        <button
                            type="submit"
                            disabled={isSaving}
                            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-green-500 text-sm font-medium text-black transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-500/60"
                        >
                            {isSaving ? 'Saving Changes...' : 'Save Profile'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    )
}

