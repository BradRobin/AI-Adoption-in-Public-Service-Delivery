/**
 * @file AccessibilityProvider.tsx
 * @description React Context provider for managing application-wide accessibility settings.
 * Provides high contrast mode toggle functionality with localStorage persistence.
 * Wrap your application root with this provider to enable accessibility features.
 */

'use client'

import { createContext, useContext, useEffect, useState } from 'react'

/**
 * Shape of the accessibility context value.
 */
interface AccessibilityContextType {
    /** Whether high contrast mode is currently enabled */
    highContrast: boolean
    /** Function to toggle high contrast mode on/off */
    toggleHighContrast: () => void
}

/**
 * React Context for accessibility settings.
 * undefined when accessed outside of the provider tree.
 */
const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

/**
 * AccessibilityProvider Component
 * Manages global accessibility state including high contrast mode.
 * Persists user preferences to localStorage and applies CSS class to document root.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap with accessibility context
 */
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

/**
 * Custom hook to access accessibility settings from any component.
 * Must be used within an AccessibilityProvider tree.
 *
 * @returns {AccessibilityContextType} The current accessibility state and controls
 * @throws {Error} If used outside of AccessibilityProvider
 *
 * @example
 * const { highContrast, toggleHighContrast } = useAccessibility()
 */
export function useAccessibility() {
    const context = useContext(AccessibilityContext)
    if (context === undefined) {
        throw new Error('useAccessibility must be used within an AccessibilityProvider')
    }
    return context
}
