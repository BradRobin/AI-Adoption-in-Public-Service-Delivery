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
import toast from '@/lib/toast'

import { ParticleBackground } from '@/components/ParticleBackground'
import { AppPageSkeleton } from '@/components/AppPageSkeleton'
import { NavigationMenu } from '@/components/NavigationMenu'
import { TypingTagline } from '@/components/TypingTagline'
import { CountySelect } from '@/components/CountySelect'
import { supabase } from '@/lib/supabase/client'

type GenderOption = 'male' | 'female' | 'rather_not_say'

const GENDER_OPTIONS: Array<{ value: GenderOption; label: string }> = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'rather_not_say', label: 'Rather not say' },
]

function isMissingColumnError(error: unknown, columnName: string) {
    if (!error || typeof error !== 'object') {
        return false
    }

    const candidate = error as { code?: string; message?: string; details?: string; hint?: string }
    const haystack = [candidate.message, candidate.details, candidate.hint].filter(Boolean).join(' ')

    return candidate.code === '42703' || new RegExp(`\\b${columnName}\\b`, 'i').test(haystack)
}

async function fetchProfileDetails(userId: string) {
    const primaryResult = await supabase
        .from('profiles')
        .select('location, gender')
        .eq('id', userId)
        .maybeSingle()

    if (!primaryResult.error) {
        return {
            location: primaryResult.data?.location || '',
            gender: (primaryResult.data?.gender as GenderOption | null) || 'rather_not_say',
        }
    }

    if (!isMissingColumnError(primaryResult.error, 'gender')) {
        throw primaryResult.error
    }

    const fallbackResult = await supabase
        .from('profiles')
        .select('location')
        .eq('id', userId)
        .maybeSingle()

    if (fallbackResult.error) {
        throw fallbackResult.error
    }

    return {
        location: fallbackResult.data?.location || '',
        gender: 'rather_not_say' as GenderOption,
    }
}

async function persistProfileDetails(opts: {
    userId: string
    email: string
    location: string
    gender: GenderOption
}) {
    const normalizedLocation = opts.location.trim()

    const primaryResult = await supabase
        .from('profiles')
        .upsert(
            {
                id: opts.userId,
                email: opts.email,
                location: normalizedLocation,
                gender: opts.gender,
            },
            { onConflict: 'id' },
        )

    if (!primaryResult.error) {
        return { ok: true as const, degraded: false as const }
    }

    if (!isMissingColumnError(primaryResult.error, 'gender')) {
        return { ok: false as const, degraded: false as const, error: primaryResult.error }
    }

    const fallbackResult = await supabase
        .from('profiles')
        .upsert(
            {
                id: opts.userId,
                email: opts.email,
                location: normalizedLocation,
            },
            { onConflict: 'id' },
        )

    if (fallbackResult.error) {
        return { ok: false as const, degraded: false as const, error: fallbackResult.error }
    }

    return { ok: true as const, degraded: true as const }
}

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
    const [gender, setGender] = useState<GenderOption>('rather_not_say')
    const [email, setEmail] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    const [statusTone, setStatusTone] = useState<'success' | 'error'>('success')

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
            setGender(((currentSession.user.user_metadata?.gender as GenderOption | undefined) ?? 'rather_not_say'))

            try {
                const profile = await fetchProfileDetails(currentSession.user.id)
                setLocation(profile.location)
                setGender(profile.gender)
            } catch (error) {
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
        setStatusMessage(null)
        setStatusTone('success')

        const normalizedEmail = email.trim()
        const normalizedUsername = username.trim()
        const normalizedLocation = location.trim()

        let hasAuthChanges = false
        const authUpdates: any = {}

        if (normalizedEmail !== (session.user.email || '')) {
            authUpdates.email = normalizedEmail
            hasAuthChanges = true
        }

        if (password) {
            authUpdates.password = password
            hasAuthChanges = true
        }

        const currentMetadata = session.user.user_metadata || {}
        const currentGender = (currentMetadata.gender as GenderOption | undefined) ?? 'rather_not_say'
        const currentLocation = (currentMetadata.location as string | undefined) || ''
        const currentUsername = (currentMetadata.username as string | undefined) || ''

        if (normalizedUsername !== currentUsername || gender !== currentGender || normalizedLocation !== currentLocation) {
            authUpdates.data = { ...currentMetadata, username: normalizedUsername, gender, location: normalizedLocation }
            hasAuthChanges = true
        }

        let authError = null
        if (hasAuthChanges) {
            const { error } = await supabase.auth.updateUser(authUpdates)
            authError = error
        }

        const profileResult = await persistProfileDetails({
            userId: session.user.id,
            email: normalizedEmail,
            location: normalizedLocation,
            gender,
        })

        if (authError) {
            toast.error(authError.message || 'Failed to update account details.')
            console.error(authError)
            setStatusMessage(authError.message || 'Failed to update account details.')
            setStatusTone('error')
        } else if (!profileResult.ok) {
            const fallbackMessage = 'Failed to save your profile details. Please try again.'
            toast.error(fallbackMessage)
            console.error(profileResult.error)
            setStatusMessage(fallbackMessage)
            setStatusTone('error')
        } else {
            const successMessage = authUpdates.email
                ? 'Profile updated. Please check your new email to confirm the change.'
                : 'Profile updated successfully!'

            const degradedMessage = profileResult.degraded
                ? ' Gender is stored in your account metadata and will continue to personalize chat replies.'
                : ''

            const finalMessage = `${successMessage}${degradedMessage}`

            toast.success(finalMessage)
            setStatusMessage(finalMessage)
            setStatusTone('success')

            if (authUpdates.email) {
                toast.success('Confirmation email sent for your updated address.')
            }

            setUsername(normalizedUsername)
            setEmail(normalizedEmail)
            setLocation(normalizedLocation)
            setPassword('')

            const { data: refreshedSession } = await supabase.auth.getSession()
            if (refreshedSession.session) {
                setSession(refreshedSession.session)
                setUsername((refreshedSession.session.user.user_metadata?.username as string) || normalizedUsername)
                setGender(((refreshedSession.session.user.user_metadata?.gender as GenderOption | undefined) ?? gender))
                setLocation(((refreshedSession.session.user.user_metadata?.location as string | undefined) ?? normalizedLocation))
            } else {
                setGender(gender)
            }
        }

        setIsSaving(false)
    }

    if (isLoading) {
        return <AppPageSkeleton variant="form" message="Loading profile..." />
    }

    if (!session) return null

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-black font-sans">
            <ParticleBackground />

            <nav className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
                <div className="flex flex-col items-start gap-0.5">
                    <Link
                        href="/dashboard"
                        className="text-xl font-bold tracking-tight text-white transition-opacity hover:opacity-80"
                    >
                        PARP
                    </Link>
                    <TypingTagline className="min-h-[1.1rem] text-[11px] font-medium text-white/70 sm:text-xs" />
                </div>
                <div className="flex items-center gap-4">
                    <span className="hidden text-sm text-white/60 sm:inline-block">
                        {session.user?.email}
                    </span>
                    <NavigationMenu />
                </div>
            </nav>

            <main id="main-content" className="mobile-page-with-bottom-nav relative z-10 mx-auto flex w-full max-w-md flex-col items-center justify-center px-4 pt-12 md:pt-16 md:pb-24">
                <div className="flex w-full flex-col rounded-2xl border border-white/10 bg-black/60 shadow-xl backdrop-blur p-6">
                    <header className="mb-6 text-center">
                        <h1 className="text-2xl font-semibold text-white">Your Profile</h1>
                        <p className="mt-1 text-sm text-white/70">Update your details for personalized AI responses.</p>
                        {statusMessage && (
                            <p className={`mt-3 text-sm ${statusTone === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                {statusMessage}
                            </p>
                        )}
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
                                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-white/40 placeholder:text-black/45"
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
                                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-white/40 placeholder:text-black/45"
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

                        <fieldset>
                            <legend className="mb-1 block text-sm font-medium text-white/80">Gender</legend>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                {GENDER_OPTIONS.map((option) => {
                                    const isSelected = gender === option.value

                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setGender(option.value)}
                                            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                                                isSelected
                                                    ? 'border-green-400 bg-green-500 text-white'
                                                    : 'border-white/10 bg-black/50 text-white/80 hover:border-white/25 hover:bg-black/40'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    )
                                })}
                            </div>
                            <p className="mt-1 text-xs text-white/40">Used to keep chatbot replies appropriately personalized.</p>
                        </fieldset>

                        <button
                            type="submit"
                            disabled={isSaving}
                            className="mobile-touch-target mt-4 inline-flex h-12 w-full items-center justify-center rounded-lg bg-green-500 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-500/60"
                        >
                            {isSaving ? 'Saving Changes...' : 'Save Profile'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    )
}

