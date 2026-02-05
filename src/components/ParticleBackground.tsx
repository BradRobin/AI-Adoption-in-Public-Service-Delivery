'use client'

export function ParticleBackground() {
  const particles = [
    { top: '10%', left: '15%', size: 2, delay: 0 },
    { top: '20%', left: '80%', size: 1, delay: 0.5 },
    { top: '35%', left: '25%', size: 3, delay: 1 },
    { top: '45%', left: '60%', size: 2, delay: 0.2 },
    { top: '55%', left: '10%', size: 1, delay: 0.8 },
    { top: '65%', left: '90%', size: 2, delay: 0.3 },
    { top: '75%', left: '40%', size: 1, delay: 0.6 },
    { top: '85%', left: '70%', size: 3, delay: 0.1 },
    { top: '15%', left: '50%', size: 1, delay: 0.4 },
    { top: '30%', left: '5%', size: 2, delay: 0.7 },
    { top: '50%', left: '35%', size: 1, delay: 0.9 },
    { top: '70%', left: '55%', size: 2, delay: 0.25 },
    { top: '25%', left: '95%', size: 1, delay: 0.55 },
    { top: '60%', left: '20%', size: 3, delay: 0.35 },
    { top: '40%', left: '85%', size: 2, delay: 0.65 },
  ]

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden
    >
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white/40"
          style={{
            top: p.top,
            left: p.left,
            width: p.size * 4,
            height: p.size * 4,
            animation: `particle-float 4s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}
