/**
 * @file admin/layout.tsx
 * @description Root layout component for the admin dashboard section.
 * Provides consistent sidebar and topbar navigation across all admin pages.
 * Manages sidebar open/close state for responsive mobile navigation.
 */

'use client'

import { useState } from 'react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminTopbar } from '@/components/admin/AdminTopbar'

/**
 * AdminLayout Component
 * Wraps all admin pages with consistent navigation structure.
 * Features collapsible sidebar, sticky topbar, and scrollable main content area.
 *
 * @param {Object} props - Layout props
 * @param {React.ReactNode} props.children - Nested admin page content
 */
export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    return (
        <div className="flex min-h-screen bg-black font-sans text-white selection:bg-green-500/30">
            {/* Collapsible Sidebar Overlay/Menu */}
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <AdminTopbar onMenuClick={() => setIsSidebarOpen(true)} />

                <main className="flex-1 overflow-y-auto bg-black p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
