'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardCheck, LayoutDashboard, MessageSquare } from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/assess', label: 'Assess', icon: ClipboardCheck },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
]

const MOBILE_NAV_VISIBLE_PATHS = ['/dashboard', '/assess', '/chat', '/profile', '/privacy']

function isVisiblePath(pathname: string) {
  if (pathname.startsWith('/admin')) {
    return false
  }

  return MOBILE_NAV_VISIBLE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function MobileBottomNav() {
  const pathname = usePathname()

  if (!pathname || !isVisiblePath(pathname)) {
    return null
  }

  return (
    <nav
      aria-label="Mobile primary navigation"
      className="fixed inset-x-0 bottom-0 z-40 md:hidden"
    >
      <div className="mobile-safe-bottom mx-auto w-full max-w-3xl px-3">
        <div className="flex items-center justify-between rounded-t-2xl border border-white/15 bg-black/90 px-2 py-2 shadow-[0_-10px_35px_rgba(0,0,0,0.45)]">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActiveRoute(pathname, href)

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`mobile-touch-target flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-green-500/20 text-green-300'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
