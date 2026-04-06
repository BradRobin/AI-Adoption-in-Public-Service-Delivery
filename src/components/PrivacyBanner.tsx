'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { BarChart3, MapPin, MessageSquare, Shield, ShieldCheck, X } from 'lucide-react'
import Link from 'next/link'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

type ConsentState = {
  consentAnalytics: boolean
  consentChatHistory: boolean
}

type PrivacyConsentContextValue = ConsentState & {
  loading: boolean
  hasSavedConsent: boolean
  updateConsent: (next: ConsentState) => Promise<void>
}

const CONSENT_STORAGE_KEY = 'parp_privacy_v1'
const ANON_ID_STORAGE_KEY = 'parp_anon_id'

const PrivacyConsentContext = createContext<PrivacyConsentContextValue | undefined>(undefined)

type StoredConsent = {
  version: number
  analytics: boolean
  chatHistory: boolean
  timestamp: string
}

function readStoredConsent(): StoredConsent | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as StoredConsent
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.analytics !== 'boolean' ||
      typeof parsed.chatHistory !== 'boolean'
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function getOrCreateAnonymousId() {
  if (typeof window === 'undefined') return ''

  const existing = window.localStorage.getItem(ANON_ID_STORAGE_KEY)
  if (existing) return existing

  const generated = crypto.randomUUID()
  window.localStorage.setItem(ANON_ID_STORAGE_KEY, generated)
  return generated
}

function persistConsentLocally(next: ConsentState) {
  if (typeof window === 'undefined') return

  const payload: StoredConsent = {
    version: 1,
    analytics: next.consentAnalytics,
    chatHistory: next.consentChatHistory,
    timestamp: new Date().toISOString(),
  }

  window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(payload))
}

async function persistConsentRemotely(next: ConsentState) {
  const anonymousId = getOrCreateAnonymousId()
  if (!anonymousId) return

  await fetch('/api/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      anonymous_id: anonymousId,
      analytics: next.consentAnalytics,
      chatHistory: next.consentChatHistory,
    }),
  })
}

export function PrivacyConsentProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [hasSavedConsent, setHasSavedConsent] = useState(false)
  const [consentAnalytics, setConsentAnalytics] = useState(false)
  const [consentChatHistory, setConsentChatHistory] = useState(false)

  useEffect(() => {
    const saved = readStoredConsent()
    if (saved) {
      setConsentAnalytics(saved.analytics)
      setConsentChatHistory(saved.chatHistory)
      setHasSavedConsent(true)
    }

    setLoading(false)
  }, [])

  const updateConsent = async (next: ConsentState) => {
    setConsentAnalytics(next.consentAnalytics)
    setConsentChatHistory(next.consentChatHistory)
    setHasSavedConsent(true)

    persistConsentLocally(next)

    try {
      await persistConsentRemotely(next)
    } catch {
      // localStorage is the source of truth for UX; remote sync is best-effort.
    }
  }

  const value = useMemo<PrivacyConsentContextValue>(
    () => ({
      consentAnalytics,
      consentChatHistory,
      hasSavedConsent,
      loading,
      updateConsent,
    }),
    [consentAnalytics, consentChatHistory, hasSavedConsent, loading],
  )

  return <PrivacyConsentContext.Provider value={value}>{children}</PrivacyConsentContext.Provider>
}

export function usePrivacyConsent() {
  const context = useContext(PrivacyConsentContext)
  if (!context) {
    throw new Error('usePrivacyConsent must be used within PrivacyConsentProvider')
  }

  return context
}

function ToggleRow({
  checked,
  onChange,
  title,
  description,
  icon,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  title: string
  description: string
  icon: ReactNode
}) {
  return (
    <div className="glass-surface flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <div className="mt-0.5 text-green-300">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-tier-1">{title}</p>
        <p className="mt-1 text-xs text-tier-2">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition ${checked ? 'bg-green-500' : 'bg-white/20'
          }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${checked ? 'translate-x-5' : 'translate-x-1'
            }`}
        />
      </button>
    </div>
  )
}

export default function PrivacyBanner() {
  const {
    consentAnalytics,
    consentChatHistory,
    hasSavedConsent,
    loading,
    updateConsent,
  } = usePrivacyConsent()

  const [open, setOpen] = useState(false)
  const [draftAnalytics, setDraftAnalytics] = useState(consentAnalytics)
  const [draftChatHistory, setDraftChatHistory] = useState(consentChatHistory)

  useEffect(() => {
    if (!open) return

    setDraftAnalytics(consentAnalytics)
    setDraftChatHistory(consentChatHistory)
  }, [open, consentAnalytics, consentChatHistory])

  const showBanner = !loading && !hasSavedConsent

  const handleAcceptAll = async () => {
    await updateConsent({ consentAnalytics: true, consentChatHistory: true })
    setOpen(false)
  }

  const handleSavePreferences = async () => {
    await updateConsent({
      consentAnalytics: draftAnalytics,
      consentChatHistory: draftChatHistory,
    })
    setOpen(false)
  }

  return (
    <>
      <AnimatePresence>
        {showBanner ? (
          <motion.aside
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/80 backdrop-blur-md"
          >
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-tier-1">
                <Shield className="h-4 w-4 shrink-0 text-green-300" />
                <p>We respect your privacy. Only anonymous data used to improve the app.</p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="privacy-accept-cta w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-500 sm:w-32"
                >
                  Accept All
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="w-full rounded-lg border border-white/30 bg-transparent px-4 py-2 text-sm font-medium text-tier-1 transition hover:bg-white/10 sm:w-32"
                >
                  Customize
                </button>
              </div>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <AnimatePresence>
          {open ? (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                />
              </Dialog.Overlay>

              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-md"
                >
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <Dialog.Title className="flex items-center gap-2 text-lg font-semibold text-tier-1">
                        <ShieldCheck className="h-5 w-5 text-green-300" />
                        Your Privacy Choices
                      </Dialog.Title>
                      <Dialog.Description className="mt-1 text-sm text-tier-2">
                        Choose what helps you most. You can update this anytime.
                      </Dialog.Description>
                    </div>

                    <Dialog.Close asChild>
                      <button
                        type="button"
                        aria-label="Close privacy preferences"
                        className="rounded-md p-1 text-tier-2 transition hover:bg-white/10 hover:text-tier-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </Dialog.Close>
                  </div>

                  <div className="space-y-3">
                    <ToggleRow
                      checked={draftAnalytics}
                      onChange={setDraftAnalytics}
                      title="Usage analytics"
                      description="Helps us understand which features help Kenyans most."
                      icon={<BarChart3 className="h-4 w-4" />}
                    />
                    <ToggleRow
                      checked={draftChatHistory}
                      onChange={setDraftChatHistory}
                      title="Chat history"
                      description="Your conversations are saved so you can resume them later."
                      icon={<MessageSquare className="h-4 w-4" />}
                    />
                  </div>

                  <div className="mt-4 flex items-center gap-2 rounded-full border border-green-700/60 bg-green-950/50 px-3 py-1.5 text-xs text-green-300">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>Data stays in Kenya</span>
                  </div>

                  <div className="mt-3 text-xs text-tier-2">
                    Learn more in our{' '}
                    <Link href="/privacy" className="text-green-300 underline-offset-4 hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </div>

                  <div className="mt-6 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="flex-1 rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-tier-1 transition hover:bg-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePreferences}
                      className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-500"
                    >
                      Save Preferences
                    </button>
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          ) : null}
        </AnimatePresence>
      </Dialog.Root>
    </>
  )
}
