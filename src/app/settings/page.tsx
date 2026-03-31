'use client'

import { Sun, Moon } from 'lucide-react'
import { ParticleBackground } from '@/components/ParticleBackground'
import { NavigationMenu } from '@/components/NavigationMenu'
import { useTheme } from '@/lib/theme-context'

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden" id="main-content">
      <ParticleBackground />
      <NavigationMenu />

      <div className="relative z-10 flex flex-col items-center justify-start min-h-screen px-4 pt-24 pb-12">
        <div className="w-full max-w-lg">
          {/* Page header */}
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-white/60 text-sm mb-8">Manage your app preferences.</p>

          {/* Display Mode card */}
          <div className="glass-surface rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold text-white mb-1">Display Mode</h2>
            <p className="text-white/50 text-sm mb-6">
              Choose between light and dark appearance. Light mode is the default.
            </p>

            <div className="flex items-center justify-between gap-4">
              {/* Label side */}
              <div className="flex items-center gap-3">
                {isLight ? (
                  <Sun className="h-5 w-5 text-amber-400 shrink-0" />
                ) : (
                  <Moon className="h-5 w-5 text-indigo-400 shrink-0" />
                )}
                <span className="text-white/90 font-medium text-sm">
                  {isLight ? 'Light Mode' : 'Dark Mode'}
                </span>
              </div>

              {/* Toggle pill */}
              <button
                type="button"
                aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
                onClick={toggleTheme}
                className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                  isLight ? 'bg-amber-400' : 'bg-indigo-500'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ${
                    isLight ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
