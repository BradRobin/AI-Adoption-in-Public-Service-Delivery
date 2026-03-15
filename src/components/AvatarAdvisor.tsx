/**
 * @file AvatarAdvisor.tsx
 * @description Animated SVG-based AI advisor avatar with text-to-speech capability.
 * Features realistic blinking, lip-sync animation, and emotional expressions.
 * Prioritizes Kenyan/East African voice options when available.
 */

'use client'

import React, { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Volume2, VolumeX, X } from 'lucide-react'

/**
 * Props for the AvatarAdvisor component.
 */
export interface AvatarAdvisorProps {
    /** Whether the avatar is currently "listening" (thinking animation) */
    isListening?: boolean
    /** Whether the avatar is actively speaking */
    isSpeaking?: boolean
    /** Text to be spoken via Web Speech API */
    responseText?: string | null
    /** Callback to close the avatar overlay */
    onClose?: () => void
    /** Controls visibility of the entire component */
    isVisible?: boolean
}

/**
 * AvatarAdvisor Component
 * Renders a sophisticated animated SVG face that speaks AI responses aloud.
 * Uses Web Speech API for text-to-speech with automatic lip-sync animation.
 */
export default function AvatarAdvisor({
    isListening = false,
    isSpeaking = false,
    responseText = null,
    onClose,
    isVisible = true,
}: AvatarAdvisorProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null)

    // Expressions state
    const [blink, setBlink] = useState(false)
    const [mouthOpen, setMouthOpen] = useState(0) // 0 to 1
    const [isSmiling, setIsSmiling] = useState(false)

    // Lipsync interval ref
    const lipSyncRef = useRef<NodeJS.Timeout | null>(null)

    // 1. Initialize Voices (Prioritize Kenyan/East African)
    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices()
            // Prioritize Kenyan/African English or Swahili, fallback to UK, then US
            const preferred =
                voices.find((v) => v.lang.includes('en-KE') || v.lang.includes('sw') || v.name.toLowerCase().includes('kenya')) ||
                voices.find((v) => v.lang.includes('en-GB') || v.name.includes('UK English')) ||
                voices[0]
            setVoice(preferred || null)
        }

        loadVoices()
        window.speechSynthesis.onvoiceschanged = loadVoices

        return () => {
            window.speechSynthesis.cancel()
        }
    }, [])

    // 2. Handle Text-to-Speech (TTS)
    useEffect(() => {
        if (!responseText || !isVisible || !voice || isMuted) {
            if (!isMuted && isPlaying) {
                window.speechSynthesis.cancel()
                setIsPlaying(false)
            }
            return
        }

        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(responseText)
        utterance.voice = voice
        utterance.rate = 1.0
        utterance.pitch = 1.05

        utterance.onstart = () => setIsPlaying(true)
        utterance.onend = () => setIsPlaying(false)
        utterance.onerror = () => setIsPlaying(false)

        // Check for positive sentiment to trigger a smile
        const lowerText = responseText.toLowerCase()
        if (
            lowerText.includes('great') ||
            lowerText.includes('excellent') ||
            lowerText.includes('good') ||
            lowerText.includes('welcome') ||
            lowerText.includes('karibu')
        ) {
            setIsSmiling(true)
            setTimeout(() => setIsSmiling(false), 4000)
        }

        window.speechSynthesis.speak(utterance)
    }, [responseText, isVisible, voice, isMuted])

    // 3. Blinking Logic (Randomized)
    useEffect(() => {
        const blinkInterval = setInterval(() => {
            setBlink(true)
            setTimeout(() => setBlink(false), 150) // Blink duration
        }, Math.random() * 3000 + 2000) // Blink every 2-5 seconds

        return () => clearInterval(blinkInterval)
    }, [])

    // 4. Lip Sync Logic (Simulated waveform via randomized mouth heights)
    const speakingActive = isPlaying || isSpeaking
    useEffect(() => {
        if (speakingActive) {
            lipSyncRef.current = setInterval(() => {
                // Randomize mouth openness between 0.2 and 1.0 when speaking
                setMouthOpen(Math.random() * 0.8 + 0.2)
            }, 100)
        } else {
            if (lipSyncRef.current) clearInterval(lipSyncRef.current)
            setMouthOpen(0)
        }

        return () => {
            if (lipSyncRef.current) clearInterval(lipSyncRef.current)
        }
    }, [speakingActive])

    if (!isVisible) return null

    // --- SVG Path Configurations ---
    // Mouth paths for morphing
    const neutralMouth = "M 35 72 Q 50 74 65 72"
    const smileMouth = "M 32 68 Q 50 82 68 68"

    // When speaking, create a dynamic polygon/path that scales with `mouthOpen`
    const getMouthPath = () => {
        if (speakingActive) {
            const height = 70 + (mouthOpen * 12)
            return `M 40 70 Q 50 ${height} 60 70 Q 50 66 40 70`
        }
        return isSmiling ? smileMouth : neutralMouth
    }

    // Eyebrow paths
    const leftEyebrowNeutral = "M 28 35 Q 35 32 42 35"
    const leftEyebrowThinking = "M 28 30 Q 35 25 42 30" // Raised
    const rightEyebrowNeutral = "M 58 35 Q 65 32 72 35"
    const rightEyebrowThinking = "M 58 35 Q 65 37 72 40" // Furrowed/Thinking

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-4 z-40 flex flex-col items-center w-[260px] overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-slate-900 to-black shadow-2xl sm:bottom-8 sm:right-8"
        >
            {/* Header Controls */}
            <div className="flex w-full items-center justify-between bg-white/5 px-4 py-2 backdrop-blur-md border-b border-white/10 text-white">
                <span className="text-xs font-semibold text-green-400">
                    PARP Advisor {speakingActive ? '(Speaking)' : isListening ? '(Thinking)' : '(Idle)'}
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            if (isPlaying) window.speechSynthesis.cancel()
                            setIsMuted(!isMuted)
                        }}
                        className="rounded-full p-1.5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="rounded-full p-1.5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                            title="Close Advisor"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Avatar Display Container */}
            <div className="relative flex h-[220px] w-full items-center justify-center overflow-hidden bg-gradient-to-t from-green-900/10 to-transparent">
                {/* Background glow when speaking or listening */}
                <motion.div
                    animate={{
                        opacity: speakingActive ? [0.2, 0.4, 0.2] : isListening ? [0.1, 0.3, 0.1] : 0,
                        scale: speakingActive ? [0.9, 1.1, 0.9] : 1
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className={`absolute inset-0 rounded-full blur-3xl ${isListening ? 'bg-blue-500/30' : 'bg-green-500/30'}`}
                />

                {/* Dynamic SVG Face */}
                <svg viewBox="0 0 100 100" className="relative z-10 h-48 w-48 drop-shadow-xl" xmlns="http://www.w3.org/2000/svg">
                    {/* Ears */}
                    <path d="M 22 55 C 16 55 16 65 22 68" fill="#5D4037" />
                    <path d="M 78 55 C 84 55 84 65 78 68" fill="#5D4037" />

                    {/* Face Base (Dark warm skin tone) */}
                    <rect x="22" y="25" width="56" height="65" rx="28" fill="#8D5524" />
                    <path d="M 22 55 Q 50 105 78 55" fill="#8D5524" /> {/* Jaw curvature */}

                    {/* Hair (Short stylish fade) */}
                    <path d="M 22 40 Q 22 15 50 15 Q 78 15 78 40 Q 78 25 50 25 Q 22 25 22 40" fill="#212121" />

                    {/* Glasses (Modern rounded advisor glasses) */}
                    <rect x="26" y="44" width="20" height="14" rx="5" fill="none" stroke="#F5F5F5" strokeWidth="1.5" />
                    <rect x="54" y="44" width="20" height="14" rx="5" fill="none" stroke="#F5F5F5" strokeWidth="1.5" />
                    <path d="M 46 49 L 54 49" stroke="#F5F5F5" strokeWidth="1.5" />

                    {/* Eyes (Blinking animation) */}
                    <motion.ellipse
                        cx="36" cy="51" rx="3.5"
                        animate={{ ry: blink ? 0.2 : 4 }}
                        transition={{ duration: 0.1 }}
                        fill="#212121"
                    />
                    <motion.ellipse
                        cx="64" cy="51" rx="3.5"
                        animate={{ ry: blink ? 0.2 : 4 }}
                        transition={{ duration: 0.1 }}
                        fill="#212121"
                    />

                    {/* Eyebrows (Animated based on listening state) */}
                    <motion.path
                        fill="transparent"
                        stroke="#212121"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        animate={{ d: isListening ? leftEyebrowThinking : leftEyebrowNeutral }}
                        transition={{ type: "spring", stiffness: 100 }}
                    />
                    <motion.path
                        fill="transparent"
                        stroke="#212121"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        animate={{ d: isListening ? rightEyebrowThinking : rightEyebrowNeutral }}
                        transition={{ type: "spring", stiffness: 100 }}
                    />

                    {/* Nose */}
                    <path d="M 50 51 L 47 62 L 53 62" fill="transparent" stroke="#6D4C41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Animated Mouth */}
                    <motion.path
                        fill={speakingActive ? "#3E2723" : "transparent"}
                        stroke={speakingActive ? "none" : "#3E2723"}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        animate={{ d: getMouthPath() }}
                        transition={{ type: "spring", bounce: 0, duration: 0.1 }}
                    />
                </svg>
            </div>
        </motion.div>
    )
}
