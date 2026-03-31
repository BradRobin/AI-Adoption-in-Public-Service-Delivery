/**
 * @file ParticleBackground.tsx
 * @description Decorative animated particle background component.
 * Renders floating particles with CSS animations for visual enhancement.
 */

'use client'

type Particle = {
  x: number
  y: number
  radius: number
  color: string
  opacity: number
  animationClassName: string
}

const PARTICLE_COLORS = ['#ef4444', '#4ade80'] as const
const PARTICLE_ANIMATIONS = [
  'animate-[particle-float_3.8s_ease-in-out_infinite]',
  'animate-[particle-float_4.6s_ease-in-out_infinite]',
  'animate-[particle-float_5.2s_ease-in-out_infinite]',
  'animate-[particle-float_6s_ease-in-out_infinite]',
] as const

function createSeededRandom(seed: number) {
  let currentSeed = seed

  return () => {
    const value = Math.sin(currentSeed) * 10000
    currentSeed += 1
    return value - Math.floor(value)
  }
}

const seededRandom = createSeededRandom(42)

const particles: Particle[] = Array.from({ length: 90 }, (_, index) => ({
  x: Number((2 + seededRandom() * 96).toFixed(2)),
  y: Number((2 + seededRandom() * 96).toFixed(2)),
  radius: Number((0.08 + seededRandom() * 0.16).toFixed(3)),
  color: PARTICLE_COLORS[index % PARTICLE_COLORS.length],
  opacity: Number((0.78 + seededRandom() * 0.2).toFixed(2)),
  animationClassName: PARTICLE_ANIMATIONS[index % PARTICLE_ANIMATIONS.length],
}))

/**
 * ParticleBackground Component
 * Renders an animated background with floating particles.
 * Uses pure CSS animations defined in globals.css.
 */
export function ParticleBackground() {
  return (
    <div
      className="particle-background-layer pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {particles.map((particle, index) => (
          <circle
            key={index}
            cx={particle.x}
            cy={particle.y}
            r={particle.radius}
            fill={particle.color}
            fillOpacity={particle.opacity}
            className={particle.animationClassName}
          />
        ))}
      </svg>
    </div>
  )
}
