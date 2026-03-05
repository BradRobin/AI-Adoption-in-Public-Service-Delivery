'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface AccessibilityContextType {
    highContrast: boolean
    toggleHighContrast: () => void
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
    const [highContrast, setHighContrast] = useState(false)

    useEffect(() => {
        // Load preference from localStorage on mount
        const storedPref = localStorage.getItem('parp_high_contrast')
        if (storedPref === 'true') {
            setHighContrast(true)
            document.documentElement.classList.add('high-contrast')
        }
    }, [])

    const toggleHighContrast = () => {
        setHighContrast(prev => {
            const next = !prev
            localStorage.setItem('parp_high_contrast', String(next))
            if (next) {
                document.documentElement.classList.add('high-contrast')
            } else {
                document.documentElement.classList.remove('high-contrast')
            }
            return next
        })
    }

    return (
        <AccessibilityContext.Provider value={{ highContrast, toggleHighContrast }}>
            {children}
        </AccessibilityContext.Provider>
    )
}

export function useAccessibility() {
    const context = useContext(AccessibilityContext)
    if (context === undefined) {
        throw new Error('useAccessibility must be used within an AccessibilityProvider')
    }
    return context
}
