'use client'

import { useEffect, useRef, useState } from 'react'

const SCROLL_THRESHOLD_PX = 16

export function TopScrollBlur() {
  const [isTopVisible, setIsTopVisible] = useState(false)
  const [isBottomVisible, setIsBottomVisible] = useState(false)
  const lastScrollYRef = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const currentScrollY = window.scrollY
      const isScrollingUp = currentScrollY < lastScrollYRef.current
      const maxScrollY = document.documentElement.scrollHeight - window.innerHeight
      const canScrollFurtherDown = currentScrollY < maxScrollY - SCROLL_THRESHOLD_PX

      setIsTopVisible(currentScrollY > SCROLL_THRESHOLD_PX)
      setIsBottomVisible(isScrollingUp && canScrollFurtherDown)

      lastScrollYRef.current = currentScrollY
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <>
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-x-0 top-0 z-60 h-20 bg-black/25 backdrop-blur-md transition-opacity duration-300 ${isTopVisible ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-x-0 bottom-0 z-60 h-20 bg-black/25 backdrop-blur-md transition-opacity duration-300 ${isBottomVisible ? 'opacity-100' : 'opacity-0'}`}
      />
    </>
  )
}
