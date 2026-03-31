/**
 * @file ParticleBackground.tsx
 * @description Decorative animated particle background component.
 * Renders floating particles with CSS animations for visual enhancement.
 */

'use client'

/**
 * ParticleBackground Component
 * Renders an animated background with floating particles.
 * Uses pure CSS animations defined in globals.css.
 */
export function ParticleBackground() {
  const particles = [
    'top-[10%] left-[15%] h-3 w-3 bg-red-500/85 shadow-[0_0_12px_rgba(239,68,68,0.55)] [animation-delay:0s]',
    'top-[20%] left-[80%] h-2 w-2 bg-green-400/85 shadow-[0_0_10px_rgba(74,222,128,0.55)] [animation-delay:0.5s]',
    'top-[35%] left-[25%] h-4 w-4 bg-red-400/80 shadow-[0_0_14px_rgba(248,113,113,0.5)] [animation-delay:1s]',
    'top-[45%] left-[60%] h-3 w-3 bg-green-500/80 shadow-[0_0_12px_rgba(34,197,94,0.5)] [animation-delay:0.2s]',
    'top-[55%] left-[10%] h-2 w-2 bg-red-500/85 shadow-[0_0_10px_rgba(239,68,68,0.55)] [animation-delay:0.8s]',
    'top-[65%] left-[90%] h-3 w-3 bg-green-400/85 shadow-[0_0_12px_rgba(74,222,128,0.55)] [animation-delay:0.3s]',
    'top-[75%] left-[40%] h-2 w-2 bg-red-400/85 shadow-[0_0_10px_rgba(248,113,113,0.5)] [animation-delay:0.6s]',
    'top-[85%] left-[70%] h-4 w-4 bg-green-500/80 shadow-[0_0_14px_rgba(34,197,94,0.5)] [animation-delay:0.1s]',
    'top-[15%] left-[50%] h-2 w-2 bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.5)] [animation-delay:0.4s]',
    'top-[30%] left-[5%] h-3 w-3 bg-green-400/85 shadow-[0_0_12px_rgba(74,222,128,0.55)] [animation-delay:0.7s]',
    'top-[50%] left-[35%] h-2 w-2 bg-red-400/80 shadow-[0_0_10px_rgba(248,113,113,0.48)] [animation-delay:0.9s]',
    'top-[70%] left-[55%] h-3 w-3 bg-green-500/85 shadow-[0_0_12px_rgba(34,197,94,0.55)] [animation-delay:0.25s]',
    'top-[25%] left-[95%] h-2 w-2 bg-red-500/85 shadow-[0_0_10px_rgba(239,68,68,0.55)] [animation-delay:0.55s]',
    'top-[60%] left-[20%] h-4 w-4 bg-green-400/80 shadow-[0_0_14px_rgba(74,222,128,0.5)] [animation-delay:0.35s]',
    'top-[40%] left-[85%] h-3 w-3 bg-red-400/85 shadow-[0_0_12px_rgba(248,113,113,0.52)] [animation-delay:0.65s]',
  ]

  return (
    <div
      className="particle-background-layer pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden
    >
      {particles.map((particleClassName, i) => (
        <div
          key={i}
          className={`absolute rounded-full animate-[particle-float_4s_ease-in-out_infinite] ${particleClassName}`}
        />
      ))}
    </div>
  )
}
