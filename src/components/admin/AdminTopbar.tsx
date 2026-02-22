'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, Search, Bell, UserCircle, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface AdminTopbarProps {
    onMenuClick: () => void
}

export function AdminTopbar({ onMenuClick }: AdminTopbarProps) {
    const router = useRouter()
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    const handleLogout = async () => {
        setIsLoggingOut(true)
        try {
            await supabase.auth.signOut()
            toast.success('Admin signed out.')
            router.replace('/login')
        } catch (error) {
            toast.error('Failed to sign out.')
            setIsLoggingOut(false)
        }
    }

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/10 bg-black/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
                {/* Mobile Menu Toggle */}
                <button
                    onClick={onMenuClick}
                    className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
                    aria-label="Toggle sidebar"
                >
                    <Menu size={24} />
                </button>

                {/* Mobile Logo Name */}
                <span className="text-lg font-bold text-white lg:hidden bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent uppercase">
                    PARP Admin
                </span>

                {/* Desktop Search (Static for now) */}
                <div className="hidden lg:flex lg:w-96 lg:items-center">
                    <div className="relative w-full">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search className="h-5 w-5 text-white/40" />
                        </div>
                        <input
                            type="text"
                            placeholder="Type to search..."
                            className="block w-full rounded-full border border-white/10 bg-white/5 py-2 pl-10 pr-3 text-sm text-white placeholder:text-white/40 focus:border-green-500/50 focus:outline-none focus:ring-1 focus:ring-green-500/50"
                        />
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
                {/* Mobile Search Icon (Instead of bar) */}
                <button className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white lg:hidden">
                    <Search size={20} />
                </button>

                {/* Notification Bell (Static) */}
                <button className="relative rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white">
                    <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                    </span>
                    <Bell size={20} />
                </button>

                <div className="h-6 w-px bg-white/10" />

                {/* User Dropdown / Actions */}
                <div className="flex items-center gap-2">
                    <div className="hidden flex-col items-end sm:flex">
                        <span className="text-xs font-semibold text-white">Admin User</span>
                        <span className="text-[10px] text-green-400">System Administrator</span>
                    </div>
                    <button className="rounded-full bg-white/5 p-1 text-white/80 hover:bg-white/10 hover:text-white">
                        <UserCircle size={24} />
                    </button>
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="ml-2 flex items-center justify-center rounded-lg p-2 text-red-400 hover:bg-red-400/10 hover:text-red-300 disabled:opacity-50"
                        title="Sign Out"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </header>
    )
}
