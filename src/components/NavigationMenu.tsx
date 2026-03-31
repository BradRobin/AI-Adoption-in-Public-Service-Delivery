/**
 * @file NavigationMenu.tsx
 * @description Global slide-out navigation menu component with hamburger trigger.
 * Provides navigation links to all major app sections including accessibility toggles.
 * Uses Framer Motion for smooth slide-in/out animations.
 */

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    Menu,
    X,
    MessageSquare,
    ClipboardCheck,
    Shield,
    ShieldAlert,
    LogOut,
    User,
    LayoutDashboard,
    Settings,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import toast from '@/lib/toast'
import { useAccessibility } from './AccessibilityProvider'
import { NotificationsBell } from './NotificationsBell'

/**
 * Props for individual menu items within the navigation drawer.
 */
interface MenuItemProps {
    /** Target navigation URL */
    href: string
    /** Lucide icon component to display */
    icon: React.ElementType
    /** Display text for the menu item */
    label: string
    /** Optional click handler (used for logout action) */
    onClick?: () => void
    /** Visual variant: default, danger (red), or admin (green accent) */
    variant?: 'default' | 'danger' | 'admin'
}

/**
 * MenuItem Component
 * Renders a single navigation link with icon and optional variant styling.
 * Can be a link or a button depending on whether onClick is provided.
 */
function MenuItem({ href, icon: Icon, label, onClick, variant = 'default' }: MenuItemProps) {
    let colorClasses = 'text-white/80 hover:text-white hover:bg-white/5'

    if (variant === 'danger') {
        colorClasses = 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
    } else if (variant === 'admin') {
        colorClasses = 'text-green-400 hover:text-green-300 hover:bg-green-500/10 border border-green-500/10'
    }

    const content = (
        <div className={`mobile-touch-target flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${colorClasses}`}>
            <Icon size={18} />
            <span className="font-medium text-sm">{label}</span>
        </div>
    )

    if (onClick) {
        return <button onClick={onClick} className="w-full text-left">{content}</button>
    }

    return (
        <Link href={href} className="block w-full text-left">
            {content}
        </Link>
    )
}

export function NavigationMenu() {
    const [isOpen, setIsOpen] = useState(false)
    const router = useRouter()
    const { highContrast, toggleHighContrast } = useAccessibility()

    const handleSignOut = async () => {
        setIsOpen(false)
        await supabase.auth.signOut()
        toast.success('You have been safely signed out.')
        router.replace('/login')
    }

    const handleClose = () => setIsOpen(false)

    return (
        <div className="relative flex items-center gap-2">
            <NotificationsBell />

            {/* Hamburger Trigger */}
            <button
                onClick={() => setIsOpen(true)}
                className="mobile-touch-target flex items-center justify-center rounded-lg border border-white/20 bg-white/5 p-3 text-white backdrop-blur-sm transition-colors hover:bg-white/10"
                aria-label="Open menu"
            >
                <Menu size={20} />
            </button>

            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            {/* Slide-out Menu Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ x: '100%', opacity: 0.5 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 bottom-0 z-50 flex w-[280px] flex-col border-l border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur-md"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/10 p-5">
                            <h2 className="text-lg font-bold text-white tracking-widest" id="menu-title">MENU</h2>
                            <button
                                onClick={handleClose}
                                aria-label="Close menu"
                                className="mobile-touch-target rounded-full p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                            >
                                <X size={20} aria-hidden="true" />
                            </button>
                        </div>

                        {/* Navigation Links */}
                        <nav aria-label="Main Navigation" className="flex-1 overflow-y-auto p-4 space-y-1">
                            {/* Accessibility Toggles */}
                            <button
                                onClick={toggleHighContrast}
                                className={`mobile-touch-target mb-4 flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${highContrast
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                        : 'text-white/80 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <span className="font-medium text-sm">High Contrast Mode</span>
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${highContrast ? 'bg-green-500' : 'bg-white/20'}`}>
                                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${highContrast ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                            </button>

                            <div onClick={handleClose}><MenuItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" /></div>
                            <div onClick={handleClose}><MenuItem href="/chat" icon={MessageSquare} label="Chat Assistant" /></div>
                            <div onClick={handleClose}><MenuItem href="/assess" icon={ClipboardCheck} label="Self Assessment" /></div>
                            <div onClick={handleClose}><MenuItem href="/profile" icon={User} label="Profile Settings" /></div>
                            <div onClick={handleClose}><MenuItem href="/settings" icon={Settings} label="App Settings" /></div>

                            <div className="my-4 h-px w-full bg-white/5" />

                            <div onClick={handleClose}><MenuItem href="/privacy" icon={Shield} label="Privacy Policy" /></div>

                            <div className="my-4 h-px w-full bg-white/5" />

                            {/* Admin Gateway forces explicitly to /auth */}
                            <div onClick={handleClose}>
                                <MenuItem
                                    href="/admin/auth"
                                    icon={ShieldAlert}
                                    label="Secure Admin Portal"
                                    variant="admin"
                                />
                            </div>
                        </nav>

                        {/* Footer (Sign Out) */}
                        <div className="border-t border-white/10 p-4">
                            <MenuItem
                                href="#"
                                icon={LogOut}
                                label="Sign Out securely"
                                onClick={handleSignOut}
                                variant="danger"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
