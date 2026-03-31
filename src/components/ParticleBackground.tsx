/**
 * @file ParticleBackground.tsx
 * @description Decorative animated particle background component.
 * Particles wander freely with random heading drift and wrap at screen edges.
 * On hover they are attracted toward the cursor; on click they converge on the
 * click point. Both interactions steer the heading so wandering resumes
 * naturally afterward rather than snapping back to a fixed home.
 */

'use client'

import { useCallback, useEffect, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Particle = {
  x: number
  y: number
  /** Dot radius in logical px */
  radius: number
  color: string
  opacity: number
  /** Current heading in radians */
  angle: number
  /** Base wander speed in px/frame */
  speed: number
  /** Maximum heading change per frame – controls how "wobbly" the wander is */
  turnRate: number
}

type ClickTarget = { x: number; y: number; time: number }

// ─── Constants ────────────────────────────────────────────────────────────────

const PARTICLE_COLORS = ['#ef4444', '#4ade80'] as const
const PARTICLE_COUNT = 135
const HOVER_RADIUS_PX = 180
/** Added px/frame of velocity toward the cursor at closest approach */
const HOVER_FORCE = 2.2
/** Added px/frame of velocity toward click at peak */
const CLICK_FORCE = 5.0
const CLICK_DURATION_S = 1.8

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSeededRandom(seed: number) {
  let s = seed
  return (): number => {
    const v = Math.sin(s) * 10000
    s += 1
    return v - Math.floor(v)
  }
}

/** Normalise an angle to the range [-π, π] for smooth turn interpolation */
function normaliseAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

function buildParticles(w: number, h: number): Particle[] {
  const rand = makeSeededRandom(42)
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    x: rand() * w,
    y: rand() * h,
    radius: 0.9 + rand() * 1.2,
    color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
    opacity: 0.65 + rand() * 0.30,
    angle: rand() * Math.PI * 2,
    speed: 0.30 + rand() * 0.55,
    turnRate: 0.04 + rand() * 0.07,
  }))
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * ParticleBackground Component
 * Canvas-based interactive particle system. Particles wander continuously with
 * randomised heading drift and wrap around screen edges. Hover attraction and
 * click-burst both work by steering the particle heading so the free-wander
 * behaviour continues naturally after each interaction ends.
 */
export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef<{ x: number; y: number } | null>(null)
  const clickRef = useRef<ClickTarget | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const sizeRef = useRef({ w: 0, h: 0 })
  const rafRef = useRef<number>(0)

  const resize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const w = window.innerWidth
    const h = window.innerHeight
    sizeRef.current = { w, h }
    canvas.width = w * dpr
    canvas.height = h * dpr
    particlesRef.current = buildParticles(w, h)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    resize()
    window.addEventListener('resize', resize)

    const onMouseMove = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY } }
    const onMouseLeave = () => { mouseRef.current = null }
    const onClick = (e: MouseEvent) => {
      clickRef.current = { x: e.clientX, y: e.clientY, time: performance.now() }
    }

    window.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)
    window.addEventListener('click', onClick)

    const animate = (now: number) => {
      const dpr = window.devicePixelRatio || 1
      const { w, h } = sizeRef.current

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const mouse = mouseRef.current
      const click = clickRef.current
      const clickAge = click ? (now - click.time) / 1000 : Infinity

      for (const p of particlesRef.current) {
        // ── Free wander ───────────────────────────────────────────────────────
        // Gently perturb the heading each frame so every particle steers a
        // unique, unpredictable path around the screen.
        p.angle += normaliseAngle((Math.random() - 0.5) * 2 * p.turnRate)

        // Decompose heading into velocity
        let vx = Math.cos(p.angle) * p.speed
        let vy = Math.sin(p.angle) * p.speed

        // ── Click burst ───────────────────────────────────────────────────────
        // A decaying force pulls every particle toward the click point, then
        // the heading is incrementally steered there so wandering resumes from
        // the new position rather than snapping back.
        if (click && clickAge < CLICK_DURATION_S) {
          const decay = 1 - clickAge / CLICK_DURATION_S
          const dx = click.x - p.x
          const dy = click.y - p.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const pullRadius = Math.min(w, h) * 0.75
          const proximity = Math.max(0, 1 - dist / pullRadius)
          const force = decay * proximity * CLICK_FORCE
          vx += (dx / dist) * force
          vy += (dy / dist) * force
          // Steer heading toward burst center so the post-click wander looks organic
          const towards = Math.atan2(dy, dx)
          p.angle += normaliseAngle(towards - p.angle) * decay * proximity * 0.06
        }

        // ── Hover attraction ──────────────────────────────────────────────────
        // Particles inside HOVER_RADIUS_PX are softly pulled toward the cursor.
        // The heading is also rotated so they continue orbiting rather than
        // stacking on top of the pointer.
        if (mouse) {
          const dx = mouse.x - p.x
          const dy = mouse.y - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < HOVER_RADIUS_PX && dist > 0) {
            const t = 1 - dist / HOVER_RADIUS_PX   // 1 at centre, 0 at edge
            vx += (dx / dist) * t * HOVER_FORCE
            vy += (dy / dist) * t * HOVER_FORCE
            const towards = Math.atan2(dy, dx)
            p.angle += normaliseAngle(towards - p.angle) * t * 0.06
          }
        }

        p.x += vx
        p.y += vy

        // ── Wrap at edges ─────────────────────────────────────────────────────
        if (p.x < -p.radius)       p.x = w + p.radius
        else if (p.x > w + p.radius) p.x = -p.radius
        if (p.y < -p.radius)       p.y = h + p.radius
        else if (p.y > h + p.radius) p.y = -p.radius

        // ── Draw ──────────────────────────────────────────────────────────────
        ctx.globalAlpha = p.opacity
        ctx.shadowBlur = p.radius * 5
        ctx.shadowColor = p.color
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
      ctx.setTransform(1, 0, 0, 1, 0, 0)

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
      window.removeEventListener('click', onClick)
    }
  }, [resize])

  return (
    <canvas
      ref={canvasRef}
      className="particle-background-layer pointer-events-none fixed inset-0 h-full w-full"
      aria-hidden
    />
  )
}
