import { isValidElement, type ReactNode } from 'react'
import {
  clearNotifications,
  pushNotification,
  removeNotification,
  type NotificationType,
} from '@/lib/notification-center'

type ToastRendererContext = { id: string }

type ToastContent = ReactNode | ((context: ToastRendererContext) => ReactNode)

interface ToastOptions {
  id?: string
  duration?: number
  icon?: string
  style?: Record<string, string | number>
}

function toText(content: ReactNode): string {
  if (typeof content === 'string' || typeof content === 'number') {
    return String(content)
  }

  if (Array.isArray(content)) {
    return content.map((item) => toText(item)).join(' ').trim()
  }

  if (isValidElement(content)) {
    const props = content.props as { children?: ReactNode }
    return toText(props.children ?? '').trim()
  }

  return ''
}

function normalizeToastMessage(content: ToastContent, id: string): string {
  if (typeof content === 'function') {
    return toText(content({ id })).replace(/\s+/g, ' ').trim()
  }

  return toText(content).replace(/\s+/g, ' ').trim()
}

function publish(content: ToastContent, type: NotificationType, options?: ToastOptions) {
  const id = options?.id ?? `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const message = normalizeToastMessage(content, id)

  if (!message) return id

  pushNotification({ id, message, type })
  return id
}

type ToastFn = ((content: ToastContent, options?: ToastOptions) => string) & {
  success: (content: ToastContent, options?: ToastOptions) => string
  error: (content: ToastContent, options?: ToastOptions) => string
  dismiss: (id?: string) => void
}

const baseToast = (content: ToastContent, options?: ToastOptions) => {
  return publish(content, 'info', options)
}

const toast = Object.assign(baseToast, {
  success(content: ToastContent, options?: ToastOptions) {
    return publish(content, 'success', options)
  },
  error(content: ToastContent, options?: ToastOptions) {
    return publish(content, 'error', options)
  },
  dismiss(id?: string) {
    if (id) {
      removeNotification(id)
      return
    }

    clearNotifications()
  },
}) as ToastFn

export { toast }
export default toast
