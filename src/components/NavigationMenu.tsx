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
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface MenuItemProps {
    href: string
    icon: React.ElementType
    label: string
    onClick?: () => void
    variant?: 'default' | 'danger' | 'admin'
}

function MenuItem({ href, icon: Icon, label, onClick, variant = 'default' }: MenuItemProps) {
    let colorClasses = 'text-white/80 hover:text-white hover:bg-white/5'

    if (variant === 'danger') {
        colorClasses = 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
    } else if (variant === 'admin') {
        colorClasses = 'text-green-400 hover:text-green-300 hover:bg-green-500/10 border border-green-500/10'
    }

    const content = (
        <div className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${colorClasses}`}>
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

    const handleSignOut = async () => {
        setIsOpen(false)
        await supabase.auth.signOut()
        toast.success('You have been safely signed out.')
        router.replace('/login')
    }

    const handleClose = () => setIsOpen(false)

    return (
        <div className="relative">
            {/* Hamburger Trigger */}
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center justify-center rounded-lg border border-white/20 bg-white/5 p-2 text-white hover:bg-white/10 transition-colors"
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
                            <span className="text-lg font-bold text-white tracking-widest">MENU</span>
                            <button
                                onClick={handleClose}
                                className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Navigation Links */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-1">
                            <div onClick={handleClose}><MenuItem href="/chat" icon={MessageSquare} label="Chat Assistant" /></div>
                            <div onClick={handleClose}><MenuItem href="/assess" icon={ClipboardCheck} label="Self Assessment" /></div>

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
                        </div>

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
