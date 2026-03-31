'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
})

function applyTheme(theme: Theme) {
  if (theme === 'light') {
    document.documentElement.classList.add('light-mode')
  } else {
    document.documentElement.classList.remove('light-mode')
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to light — the FOWT inline script also defaults to light
  const [theme, setTheme] = useState<Theme>(() => {
    // Lazy initializer: read localStorage once on mount (client only)
    if (typeof window === 'undefined') return 'light'
    const stored = localStorage.getItem('parp-theme') as Theme | null
    return stored === 'dark' ? 'dark' : 'light'
  })

  // Apply the DOM class after hydration to stay in sync
  useEffect(() => {
    applyTheme(theme)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem('parp-theme', next)
      applyTheme(next)
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
