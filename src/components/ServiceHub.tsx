/**
 * @file ServiceHub.tsx
 * @description Public services grid component displaying integrated Kenyan government services.
 * Each service card provides quick access to external portals and AI-powered assistance.
 * Serves as the main entry point for citizens to interact with public services.
 */

'use client'

import { motion } from 'framer-motion'
import {
    Stethoscope, // Healthcare
    CarFront,    // Transport
    Droplets,    // Water
    GraduationCap, // Education
    Briefcase,    // Gig/Employment
    ExternalLink,
    Bot
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ServiceAssistantModal } from './ServiceAssistantModal'

/**
 * Defines the static list of public services available in the hub.
 * Each entry configures the display title, description, external link, UI styling, and optional logo.
 */
const services = [
    {
        id: 'health',
        title: 'Healthcare (SHA)',
        description: 'Access the Social Health Authority for registration, claims, and universal health coverage services.',
        link: 'https://sha.ecitizen.go.ke/',
        icon: Stethoscope,
        color: 'text-red-400',
        bg: 'bg-red-400/10',
        logo: '/images/sha-logo.png'
    },
    {
        id: 'transport',
        title: 'NTSA Transport',
        description: 'Manage driving licenses, vehicle inspections, and road safety compliance via NTSA TIMS.',
        link: 'https://ntsa.ecitizen.go.ke/',
        icon: CarFront,
        color: 'text-blue-400',
        bg: 'bg-blue-400/10',
        logo: '/images/NTSA-transport.png'
    },
    {
        id: 'water',
        title: 'Water Services',
        description: 'Pay water bills, apply for new connections, and report issues to Nairobi City Water.',
        link: 'https://nairobiwater.ecitizen.go.ke/',
        icon: Droplets,
        color: 'text-cyan-400',
        bg: 'bg-cyan-400/10',
        logo: '/images/water-services.png'
    },
    {
        id: 'education',
        title: 'Education (HELB)',
        description: 'Apply for student loans, bursaries, and manage repayment through the Higher Education Loans Board.',
        link: 'https://helb.ecitizen.go.ke/',
        icon: GraduationCap,
        color: 'text-yellow-400',
        bg: 'bg-yellow-400/10',
        logo: '/images/education-HELB.png'
    },
    {
        id: 'ajira',
        title: 'Ajira Digital',
        description: 'Find digital work opportunities, training, and mentorship for Kenyan youth in the gig economy.',
        link: 'https://ajiradigital.go.ke/',
        icon: Briefcase,
        color: 'text-purple-400',
        bg: 'bg-purple-400/10',
        logo: '/images/Ajira-digital.png'
    }
]

type ServiceHubProps = {
    demoMode?: boolean
    onDemoAssist?: (service: { id: string; title: string }) => void
}

/**
 * ServiceHub Component
 * Displays a grid of available Kenyan public services.
 * Allows users to either visit the external portal directly or open a specialized AI assistant.
 */
export function ServiceHub({ demoMode = false, onDemoAssist }: ServiceHubProps) {
    const [selectedService, setSelectedService] = useState<{ id: string; title: string } | null>(null)
    const [cardsPerView, setCardsPerView] = useState(1)
    const [currentIndex, setCurrentIndex] = useState(1)
    const [enableTrackAnimation, setEnableTrackAnimation] = useState(true)
    const [cardStep, setCardStep] = useState(0)
    const [pausedUntil, setPausedUntil] = useState(0)
    const pointerStartX = useRef<number | null>(null)
    const loopTimeoutRef = useRef<number | null>(null)
    const animationFrameRef = useRef<number | null>(null)

    useEffect(() => {
        const updateCardsPerView = () => {
            let nextCardsPerView = 1

            if (window.innerWidth < 640) {
                nextCardsPerView = 1
            } else if (window.innerWidth <= 1024) {
                nextCardsPerView = 2
            } else {
                nextCardsPerView = 3
            }

            setCardsPerView((prev) => {
                if (prev === nextCardsPerView) {
                    return prev
                }

                setEnableTrackAnimation(false)
                setCurrentIndex(nextCardsPerView)
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current)
                }
                animationFrameRef.current = requestAnimationFrame(() => setEnableTrackAnimation(true))
                return nextCardsPerView
            })
        }

        updateCardsPerView()
        window.addEventListener('resize', updateCardsPerView)
        return () => {
            window.removeEventListener('resize', updateCardsPerView)
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
        }
    }, [])

    const extendedServices = useMemo(() => {
        const headClones = services.slice(0, cardsPerView)
        const tailClones = services.slice(-cardsPerView)
        return [...tailClones, ...services, ...headClones]
    }, [cardsPerView])

    const pauseAutoplay = () => {
        setPausedUntil(Date.now() + 5000)
    }

    const scheduleLoopReset = useCallback((index: number) => {
        if (loopTimeoutRef.current) {
            window.clearTimeout(loopTimeoutRef.current)
        }

        loopTimeoutRef.current = window.setTimeout(() => {
            if (index >= services.length + cardsPerView) {
                setEnableTrackAnimation(false)
                setCurrentIndex(cardsPerView)
                requestAnimationFrame(() => setEnableTrackAnimation(true))
                return
            }

            if (index < cardsPerView) {
                setEnableTrackAnimation(false)
                setCurrentIndex(services.length + cardsPerView - 1)
                requestAnimationFrame(() => setEnableTrackAnimation(true))
            }
        }, 420)
    }, [cardsPerView])

    const goToNext = useCallback((manual = false) => {
        if (manual) {
            pauseAutoplay()
        }

        setCurrentIndex((prev) => {
            const next = prev + 1
            scheduleLoopReset(next)
            return next
        })
    }, [scheduleLoopReset])

    const goToPrevious = useCallback((manual = false) => {
        if (manual) {
            pauseAutoplay()
        }

        setCurrentIndex((prev) => {
            const next = prev - 1
            scheduleLoopReset(next)
            return next
        })
    }, [scheduleLoopReset])

    useEffect(() => {
        const measureCardStep = () => {
            const card = document.querySelector<HTMLElement>('[data-service-card]')
            if (!card) {
                return
            }

            setCardStep(card.getBoundingClientRect().width + 16)
        }

        const frame = requestAnimationFrame(measureCardStep)
        window.addEventListener('resize', measureCardStep)

        return () => {
            cancelAnimationFrame(frame)
            window.removeEventListener('resize', measureCardStep)
        }
    }, [cardsPerView, extendedServices.length])

    useEffect(() => {
        const timer = window.setInterval(() => {
            if (Date.now() < pausedUntil) {
                return
            }
            goToNext()
        }, 2000)

        return () => window.clearInterval(timer)
    }, [goToNext, pausedUntil])

    useEffect(() => {
        return () => {
            if (loopTimeoutRef.current) {
                window.clearTimeout(loopTimeoutRef.current)
            }
        }
    }, [])

    const onPointerDown = (x: number) => {
        pointerStartX.current = x
    }

    const onPointerUp = (x: number) => {
        if (pointerStartX.current === null) {
            return
        }

        const deltaX = x - pointerStartX.current
        pointerStartX.current = null

        if (Math.abs(deltaX) < 40) {
            return
        }

        if (deltaX < 0) {
            goToNext(true)
        } else {
            goToPrevious(true)
        }
    }

    const activeDot = (currentIndex - cardsPerView + services.length) % services.length

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Public Services Hub</h2>
            <div className="space-y-4">
                <div
                    className="overflow-x-hidden"
                    onMouseDown={(event) => onPointerDown(event.clientX)}
                    onMouseUp={(event) => onPointerUp(event.clientX)}
                    onMouseLeave={(event) => onPointerUp(event.clientX)}
                    onTouchStart={(event) => onPointerDown(event.touches[0].clientX)}
                    onTouchEnd={(event) => onPointerUp(event.changedTouches[0].clientX)}
                >
                    <motion.div
                        className="flex gap-4"
                        animate={{ x: -(currentIndex * cardStep) }}
                        transition={enableTrackAnimation ? { duration: 0.4, ease: 'easeInOut' } : { duration: 0 }}
                    >
                        {extendedServices.map((service, index) => (
                            <div
                                key={`${service.id}-${index}`}
                                data-service-card
                                className="group relative shrink-0 basis-full sm:basis-[calc((100%-16px)/2)] lg:basis-[calc((100%-32px)/3)] flex flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 shadow-sm shadow-black/25 transition-all hover:border-white/20 hover:bg-white/10"
                            >
                        {/* Background logo with fade effect for services with logos */}
                        {service.logo && (
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                                <img
                                    src={service.logo}
                                    alt=""
                                    className="h-full w-full object-cover opacity-25 transition-opacity duration-300 group-hover:opacity-50 mask-[linear-gradient(to_left,rgba(0,0,0,1)_0%,rgba(0,0,0,0.5)_50%,rgba(0,0,0,0)_100%)]"
                                />
                            </div>
                        )}

                        {/* Interactive Link Area for Title/Desc */}
                        <a
                            href={service.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative z-10 block space-y-3 flex-1"
                        >
                            <div className="flex items-center gap-3">
                                {!service.logo && (
                                    <div className={`inline-flex items-center justify-center rounded-lg p-2 ${service.bg} ${service.color}`}>
                                        <service.icon size={24} />
                                    </div>
                                )}
                            </div>
                            <h3 className="text-lg font-medium text-white group-hover:text-green-400 transition-colors">
                                {service.title}
                            </h3>
                            <p className="text-sm text-white/60 line-clamp-3">
                                {service.description}
                            </p>
                        </a>

                        {/* Footer Actions */}
                        <div className="relative z-10 mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                            <a
                                href={service.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs font-medium text-white/40 transition-colors hover:text-white"
                            >
                                <span>Visit Portal</span>
                                <ExternalLink size={12} />
                            </a>

                            <button
                                onClick={() => {
                                    if (demoMode) {
                                        onDemoAssist?.({ id: service.id, title: service.title })
                                        return
                                    }
                                    setSelectedService({ id: service.id, title: service.title })
                                }}
                                className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-500 hover:text-black"
                            >
                                <Bot size={14} />
                                <span>{demoMode ? 'Ask Demo Bot' : 'AI Assist'}</span>
                            </button>
                        </div>
                            </div>
                        ))}
                    </motion.div>
                </div>

                <div className="flex justify-center gap-2">
                    {services.map((service, index) => (
                        <button
                            key={service.id}
                            type="button"
                            aria-label={`Go to ${service.title}`}
                            onClick={() => {
                                pauseAutoplay()
                                setEnableTrackAnimation(true)
                                setCurrentIndex(cardsPerView + index)
                            }}
                            className={`h-2 rounded-full transition-all ${activeDot === index ? 'w-6 bg-green-400' : 'w-2 bg-white/30 hover:bg-white/60'}`}
                        />
                    ))}
                </div>
            </div>

            {!demoMode && (
                <ServiceAssistantModal
                    isOpen={!!selectedService}
                    onClose={() => setSelectedService(null)}
                    serviceId={selectedService?.id || ''}
                    serviceTitle={selectedService?.title || ''}
                />
            )}
        </div>
    )
}
