'use client'

import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'

/**
 * Custom event interface for the PWA beforeinstallprompt event.
 */
interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * InstallPrompt Component
 * Listens for the browser's PWA install prompt event and displays a custom button
 * allowing the user to install the application to their home screen or desktop.
 */
export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
            // Only show if not already installed (standalone mode check is tricky, but this event only fires if installable)
            setIsVisible(true)
        }

        window.addEventListener('beforeinstallprompt', handler)

        return () => {
            window.removeEventListener('beforeinstallprompt', handler)
        }
    }, [])

    const handleInstallClick = async () => {
        if (!deferredPrompt) return

        setIsVisible(false)
        await deferredPrompt.prompt()

        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
            toast.success('Thank you for installing the app!')
        }
        setDeferredPrompt(null)
    }

    if (!isVisible) return null

    return (
        <button
            onClick={handleInstallClick}
            className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-white/20 bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-lg transition hover:scale-105 hover:bg-green-500"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-5 w-5"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 9.75l-3 3m0 0l3 3m-3-3h7.5M12 9.75V3"
                />
            </svg>
            Install App
        </button>
    )
}
