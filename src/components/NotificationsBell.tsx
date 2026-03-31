'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Bell } from 'lucide-react'
import {
  getNotificationsSnapshot,
  subscribeNotifications,
  viewNotification,
} from '@/lib/notification-center'

function formatRelativeTime(timestamp: number) {
  const diffMs = Date.now() - timestamp
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

export function NotificationsBell() {
  const notifications = useSyncExternalStore(subscribeNotifications, getNotificationsSnapshot, getNotificationsSnapshot)
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const count = notifications.length

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((previousValue) => !previousValue)}
        className={`mobile-touch-target relative flex items-center justify-center rounded-lg border border-white/20 bg-white/5 p-3 text-white backdrop-blur-sm transition-colors hover:bg-white/10 ${isOpen ? 'z-70' : ''}`}
        aria-label="Open notifications"
      >
        <Bell size={20} />

        {count === 1 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500"
          />
        )}

        {count > 1 && (
          <span
            aria-hidden="true"
            className="absolute -right-2 -top-2 min-w-5 rounded-full bg-red-500 px-1.5 text-center text-[10px] font-bold leading-5 text-white"
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close notifications"
            className="fixed inset-0 z-60 bg-black/25 backdrop-blur-sm"
          />

          <div className="absolute right-0 top-full z-70 mt-2 w-[min(20rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-white/15 bg-zinc-950/95 shadow-2xl backdrop-blur-md">
            <div className="border-b border-white/10 px-4 py-3">
              <h3 className="text-sm font-semibold tracking-wide text-white">Notifications</h3>
              <p className="text-xs text-white/60">Click an item to mark it as viewed.</p>
            </div>

            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-sm text-white/60">No new notifications.</div>
            ) : (
              <ul className="max-h-80 overflow-y-auto">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => viewNotification(notification.id)}
                      className="mobile-touch-target w-full border-b border-white/5 px-4 py-3 text-left transition-colors hover:bg-white/5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-sm text-white">{notification.message}</p>
                        <span className="shrink-0 text-xs text-white/50">{formatRelativeTime(notification.createdAt)}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
