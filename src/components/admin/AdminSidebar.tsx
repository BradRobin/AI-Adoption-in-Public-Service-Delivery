'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Users,
    Briefcase,
    BarChart3,
    FileText,
    Settings,
    X
} from 'lucide-react'

interface AdminSidebarProps {
    isOpen: boolean
    setIsOpen: (isOpen: boolean) => void
}

const navLinks = [
    { name: 'Overview', href: '/admin', icon: LayoutDashboard },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Services', href: '/admin/services', icon: Briefcase },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: 'Logs', href: '/admin/logs', icon: FileText },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export function AdminSidebar({ isOpen, setIsOpen }: AdminSidebarProps) {
    const pathname = usePathname()

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/80 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 transform flex-col border-r border-white/10 bg-zinc-950 transition-transform duration-300 ease-in-out lg:static lg:flex lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Mobile Close Header */}
                <div className="flex h-16 items-center justify-between px-6 lg:hidden border-b border-white/10">
                    <span className="text-xl font-bold tracking-tight text-white">PARP Admin</span>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-white/50 hover:text-white"
                        aria-label="Close sidebar"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Desktop Logo Header (Hidden on Mobile) */}
                <div className="hidden h-16 items-center px-6 lg:flex border-b border-white/10">
                    <span className="text-xl font-bold tracking-tight text-white uppercase bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">PARP System</span>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
                    {navLinks.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setIsOpen(false)} // Close on mobile navigation
                                className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                                    ? 'bg-white/10 text-white'
                                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <item.icon
                                    className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${isActive ? 'text-green-400' : 'text-white/40 group-hover:text-white'
                                        }`}
                                    aria-hidden="true"
                                />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>

                {/* Optional Footer/Version Info */}
                <div className="border-t border-white/10 p-4">
                    <div className="flex items-center gap-3 rounded-lg bg-black/50 p-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-green-500 to-emerald-700 flex items-center justify-center font-bold text-xs text-black">A</div>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-white">System Admin</span>
                            <span className="text-[10px] text-white/50">v1.2.0</span>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    )
}
