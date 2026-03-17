export type NotificationType = 'success' | 'error' | 'info'

export interface NotificationItem {
  id: string
  message: string
  type: NotificationType
  createdAt: number
  onView?: () => void
}

type Listener = () => void

const listeners = new Set<Listener>()
let notifications: NotificationItem[] = []

function emitChange() {
  listeners.forEach((listener) => listener())
}

function generateNotificationId() {
  return `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function subscribeNotifications(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getNotificationsSnapshot() {
  return notifications
}

export function pushNotification(input: {
  message: string
  type?: NotificationType
  id?: string
  onView?: () => void
}) {
  const normalizedMessage = input.message.trim()
  if (!normalizedMessage) return

  const id = input.id ?? generateNotificationId()
  const type = input.type ?? 'info'
  const createdAt = Date.now()
  const onView = input.onView

  const existingIndex = notifications.findIndex((notification) => notification.id === id)

  if (existingIndex >= 0) {
    notifications = notifications.map((notification) =>
      notification.id === id ? { ...notification, message: normalizedMessage, type, createdAt, onView } : notification
    )
  } else {
    notifications = [{ id, message: normalizedMessage, type, createdAt, onView }, ...notifications].slice(0, 50)
  }

  emitChange()
  return id
}

export function removeNotification(id: string) {
  notifications = notifications.filter((notification) => notification.id !== id)
  emitChange()
}

export function viewNotification(id: string) {
  const notification = notifications.find((item) => item.id === id)
  if (notification?.onView) {
    notification.onView()
  }
  removeNotification(id)
}

export function clearNotifications() {
  notifications = []
  emitChange()
}
