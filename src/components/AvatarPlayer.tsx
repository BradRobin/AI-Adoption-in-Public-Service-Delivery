'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, VolumeX, Mic, MicOff } from 'lucide-react'

/**
 * AvatarCharacter Component
 * A purely CSS/SVG based rendering of a digital avatar intended to visually simulate "talking".
 * Serves as a cost-effective placeholder for fully rendered video avatars (e.g. D-ID, HeyGen).
 *
 * @param {boolean} isTalking Determines if the mouth and eyes should animate.
 */
// Placeholder "Avatar" states. In a real app, these would be:
// 1. URLs to HeyGen/D-ID API streaming videos
// 2. Or simplified looping MP4s (e.g. /videos/avatar-idle.mp4, /videos/avatar-talking.mp4)
// Here we simulate with CSS/SVG Animation for cost-effectiveness
const AvatarCharacter = ({ isTalking }: { isTalking: boolean }) => {
    return (
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-green-900 via-black to-blue-900">
            {/* Background Gradient Pulse */}
            <div className={`absolute inset-0 bg-gradient-to-t from-black/80 to-transparent ${isTalking ? 'animate-pulse' : ''}`} />

            {/* Simple "Face" Representation */}
            <div className="relative z-10 flex flex-col items-center gap-4">
                {/* Head */}
                <div className="relative h-32 w-32 rounded-full border-4 border-white/10 bg-white/5 shadow-2xl backdrop-blur-sm">
                    {/* Eyes */}
                    <div className="absolute top-10 flex w-full justify-center gap-6">
                        <div className={`h-3 w-8 rounded-full bg-white/80 ${isTalking ? 'animate-bounce' : ''}`} style={{ animationDuration: '2s' }}></div>
                        <div className={`h-3 w-8 rounded-full bg-white/80 ${isTalking ? 'animate-bounce' : ''}`} style={{ animationDuration: '2.1s' }}></div>
                    </div>

                    {/* Mouth (The key element for "talking") */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                        <motion.div
                            animate={{
                                height: isTalking ? [4, 16, 4, 12, 4] : 4,
                                width: isTalking ? [20, 24, 20, 22, 20] : 20,
                                borderRadius: isTalking ? [4, 16, 4] : 4
                            }}
                            transition={{
                                duration: 0.4,
                                repeat: isTalking ? Infinity : 0,
                                ease: "easeInOut"
                            }}
                            className="bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]"
                        />
                    </div>
                </div>

                {/* Shoulders */}
                <div className="h-16 w-48 rounded-t-full bg-white/5 border-t border-white/10"></div>
            </div>
        </div>
    )
}

/**
 * Props for the AvatarPlayer component.
 */
interface AvatarPlayerProps {
    textToSpeak: string | null
    isVisible: boolean
    onClose: () => void
}

/**
 * AvatarPlayer Component
 * Displays a floating digital avatar that visually "speaks" using the browser's Web Speech API.
 * The component synchronizes the text-to-speech audio with simple CSS animations on the avatar.
 *
 * @param {AvatarPlayerProps} props The component props.
 */
export function AvatarPlayer({ textToSpeak, isVisible, onClose }: AvatarPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null)

    // Initialize Speech Synthesis
    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices()
            // Try to find a Kenyan-sounding voice if possible (often English UK or Google UK English Female are closest defaults)
            // Otherwise fallback to first avail
            const preferred = voices.find(v => v.lang.includes('en-KE') || v.lang.includes('sw'))
                || voices.find(v => v.name.includes('Google UK English Female'))
                || voices[0]
            setVoice(preferred || null)
        }

        loadVoices()
        window.speechSynthesis.onvoiceschanged = loadVoices

        return () => {
            window.speechSynthesis.cancel()
        }
    }, [])

    // Handle Text-to-Speech Trigger
    useEffect(() => {
        if (!textToSpeak || !isVisible || !voice || isMuted) {
            if (!isMuted && isPlaying) {
                // If we just got muted or closed, stop talking
                window.speechSynthesis.cancel()
                setIsPlaying(false)
            }
            return
        }

        // Cancel any previous speech
        window.speechSynthesis.cancel()

        const utterance = new SpeechSynthesisUtterance(textToSpeak)
        utterance.voice = voice
        utterance.rate = 1.0
        utterance.pitch = 1.0

        utterance.onstart = () => setIsPlaying(true)
        utterance.onend = () => setIsPlaying(false)
        utterance.onerror = () => setIsPlaying(false)

        window.speechSynthesis.speak(utterance)

    }, [textToSpeak, isVisible, voice, isMuted])

    if (!isVisible) return null

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed bottom-24 right-4 z-40 h-[300px] w-[240px] overflow-hidden rounded-xl border border-white/20 bg-black/90 shadow-2xl sm:bottom-8 sm:right-8"
        >
            {/* Header */}
            <div className="absolute top-0 z-20 flex w-full items-center justify-between bg-black/40 px-3 py-2 backdrop-blur-md">
                <span className="text-xs font-semibold text-white/80">AI Advisor (Live)</span>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            if (isPlaying) window.speechSynthesis.cancel()
                            setIsMuted(!isMuted)
                        }}
                        className="rounded p-1 hover:bg-white/10 text-white/70 hover:text-white"
                    >
                        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                    <button
                        onClick={onClose}
                        className="rounded p-1 hover:bg-white/10 text-white/70 hover:text-white"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Visualizer */}
            <AvatarCharacter isTalking={isPlaying && !isMuted} />

            {/* Status Indicator */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                <span className="text-[10px] text-white/50">
                    {isPlaying ? 'Speaking...' : 'Listening...'}
                </span>
            </div>
        </motion.div>
    )
}
