'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

type TypingTaglineProps = {
  text?: string
  className?: string
  typingSpeedMs?: number
  pauseAfterTypingMs?: number
  loop?: boolean
}

/**
 * Premium, low-noise typewriter animation for short brand taglines.
 * Defaults to a subtle loop and gracefully degrades when reduced motion is enabled.
 */
export function TypingTagline({
  text = 'Know Your AI Future in Kenya',
  className,
  typingSpeedMs = 52,
  pauseAfterTypingMs = 3200,
  loop = true,
}: TypingTaglineProps) {
  const prefersReducedMotion = useReducedMotion()
  const [visibleChars, setVisibleChars] = useState(prefersReducedMotion ? text.length : 0)

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisibleChars(text.length)
      return
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined

    if (visibleChars < text.length) {
      timeoutId = setTimeout(() => {
        setVisibleChars((value) => value + 1)
      }, typingSpeedMs)
    } else if (loop) {
      timeoutId = setTimeout(() => {
        setVisibleChars(0)
      }, pauseAfterTypingMs)
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [loop, pauseAfterTypingMs, prefersReducedMotion, text.length, typingSpeedMs, visibleChars])

  const shownText = text.slice(0, visibleChars)

  return (
    <p
      className={
        className ??
        'min-h-[1.1rem] text-[11px] font-medium tracking-[0.02em] text-white/65 sm:text-xs'
      }
      aria-label={text}
    >
      <span aria-hidden="true">{shownText}</span>
      {!prefersReducedMotion && (
        <motion.span
          aria-hidden="true"
          className="ml-0.5 inline-block h-3 w-px bg-white/75 align-[-1px]"
          animate={{ opacity: [1, 0.25, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </p>
  )
}