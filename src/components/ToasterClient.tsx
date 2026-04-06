/**
 * @file ToasterClient.tsx
 * @description Lightweight popup toast renderer backed by the shared notification center.
 */

'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { CheckCircle2, Info, XCircle } from 'lucide-react'
import {
  getNotificationsSnapshot,
  removeNotification,
  subscribeNotifications,
  type NotificationItem,
} from '@/lib/notification-center'

const TOAST_DURATION_MS = 4200

function getToastIcon(notification: NotificationItem) {
  if (notification.type === 'success') {
    return <CheckCircle2 size={18} className="shrink-0 text-green-400" />
  }

  if (notification.type === 'error') {
    return <XCircle size={18} className="shrink-0 text-red-400" />
  }

  return <Info size={18} className="shrink-0 text-blue-400" />
}

function getToastStyles(notification: NotificationItem) {
  if (notification.type === 'success') {
    return 'border-green-400/20 bg-zinc-950/96'
  }

  if (notification.type === 'error') {
    return 'border-red-400/20 bg-zinc-950/96'
  }

  return 'border-white/15 bg-zinc-950/96'
}

export function ToasterClient() {
  const notifications = useSyncExternalStore(subscribeNotifications, getNotificationsSnapshot, getNotificationsSnapshot)
  const toastNotifications = useMemo(() => notifications.slice(0, 3), [notifications])
  const [mountedIds, setMountedIds] = useState<string[]>([])

  useEffect(() => {
    setMountedIds((previousIds) => {
      const nextIds = toastNotifications.map((notification) => notification.id)
      const stableIds = previousIds.filter((id) => nextIds.includes(id))

      for (const id of nextIds) {
        if (!stableIds.includes(id)) {
          stableIds.push(id)
        }
      }

      return stableIds
    })
  }, [toastNotifications])

  useEffect(() => {
    const timers = toastNotifications.map((notification) =>
      window.setTimeout(() => {
        setMountedIds((previousIds) => previousIds.filter((id) => id !== notification.id))
      }, TOAST_DURATION_MS),
    )

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [toastNotifications])

  const visibleToasts = toastNotifications.filter((notification) => mountedIds.includes(notification.id))

  if (visibleToasts.length === 0) {
    return null
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[90] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3 sm:right-6 sm:top-6">
      {visibleToasts.map((notification) => (
        <div
          key={notification.id}
          className={`pointer-events-auto overflow-hidden rounded-2xl border px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.22)] backdrop-blur-md transition-all ${getToastStyles(notification)}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            {getToastIcon(notification)}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">
                {notification.type === 'success'
                  ? 'Success'
                  : notification.type === 'error'
                    ? 'Error'
                    : 'Notification'}
              </p>
              <p className="mt-1 text-sm text-white/80">{notification.message}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setMountedIds((previousIds) => previousIds.filter((id) => id !== notification.id))
                removeNotification(notification.id)
              }}
              className="rounded-full p-1 text-white/65 transition hover:bg-white/10 hover:text-white"
              aria-label="Dismiss notification"
            >
              <span aria-hidden="true">x</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

