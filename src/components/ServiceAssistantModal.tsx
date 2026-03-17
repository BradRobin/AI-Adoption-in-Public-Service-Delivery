/**
 * @file ServiceAssistantModal.tsx
 * @description Specialized chat modal for service-specific AI assistance.
 * Each service (Health, Transport, Education, etc.) has custom system prompts
 * that guide the AI to provide contextually relevant help for that domain.
 */

'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Bot, AlertTriangle, FileText, CarFront, Droplets, GraduationCap, Stethoscope, Briefcase } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import toast from '@/lib/toast'

/**
 * Identifier for the specific type of service action the assistant should handle.
 */
export type ServiceAction = 'health_triage' | 'gig_proposal' | 'transport_guide' | 'water_support' | 'education_advisor'

/**
 * Props for the ServiceAssistantModal component.
 */
interface ServiceAssistantModalProps {
    /** Controls visibility of the modal */
    isOpen: boolean
    /** Callback to close the modal */
    onClose: () => void
    /** Unique identifier for the service (e.g., 'health', 'transport') */
    serviceId: string
    /** Human-readable title of the service */
    serviceTitle: string
}

/**
 * Represents a single standard chat message in the modal context.
 */
type Message = {
    role: 'user' | 'assistant'
    content: string
}

/**
 * Service-specific system prompts for domain-focused AI assistance.
 * Each prompt defines the AI's persona, goals, rules, and response format
 * tailored to the specific government service context.
 */
// System Prompts for Specific AI Agents
const PROMPTS: Record<string, string> = {
    health: `You are a Maternal Health Triage Assistant for the Social Health Authority (SHA) Kenya.
Your Goal: Help mothers assess symptoms like bleeding, fever, or pain, and provide information on SHA maternal care access.
Rules:
1. ALWAYS start with a disclaimer: "I am an AI assistant, not a doctor. If this is an emergency, go to the nearest hospital immediately."
2. Ask clarification questions about the symptom severity.
3. Classify urgency: "Emergency" (Hospital NOW), "Urgent" (See doctor today), or "Routine".
4. Provide factual information on how to access maternal care via SHA if asked.
5. ONLY if the user specifically asks how to register/access, OR if the process strictly requires visiting the official platform, offer the link to the official web portal (https://sha.ecitizen.go.ke/) and provide a 3-step AI-optimized guide on what to do when they get there.
6. Be empathetic and clear. Use simple English or Kiswahili if requested.
7. ALWAYS include this exact sentence at the very bottom of your response: "This assessment is based on public data and may not reflect internal policies. See our [Privacy Policy](/privacy) for limitations."`,

    ajira: `You are a Professional Proposal Writer for the Ajira Digital Program.
Your Goal: Help Kenyan youth write winning proposals for Upwork/Fiverr jobs AND provide info about Ajira programs.
Rules:
1. First, ask for: The Job Title, Client Requirements, and User's Skills.
2. Generate a structured proposal: Greeting -> Understanding of Problem -> Proposed Solution -> Relevant Experience -> Call to Action.
3. If they ask about Ajira, briefly explain the free training available.
4. ONLY if they ask how to sign up, OR if the process strictly requires visiting the official platform, offer the link (https://ajiradigital.go.ke/) and provide a 3-step AI-optimized guide on what to do when they get there.
5. Tone: Professional, confident, and concise.
6. ALWAYS include this exact sentence at the very bottom of your response: "This assessment is based on public data and may not reflect internal policies. See our [Privacy Policy](/privacy) for limitations."`,

    transport: `You are an NTSA Transport Guide. 
Your Goal: Inform users about NTSA services (driving licenses, vehicle inspections) AND help them structure appeals or inquiries.
Rules:
1. Provide accurate information regarding TIMS and eCitizen integration.
2. If they have an issue (e.g., lost license, inspection failure), ask for details and write a professional short email/inquiry for them to send to NTSA.
3. ONLY if they ask where to go, OR if the process strictly requires visiting the official platform, offer the link (https://ntsa.ecitizen.go.ke/) and provide a 3-step AI-optimized guide on what to do when they get there.
4. Keep answers directly related to Kenyan road safety and NTSA processes.
5. ALWAYS include this exact sentence at the very bottom of your response: "This assessment is based on public data and may not reflect internal policies. See our [Privacy Policy](/privacy) for limitations."`,

    water: `You are a Nairobi Water Support Assistant. 
Your Goal: Help users understand procedures AND assist in formatting structured issue reports.
Rules:
1. Explain how to apply for connections or read bills.
2. If they need to report a leak or outage, ask for: Location, Duration, and Severity to format a professional report they can copy-paste.
3. ONLY if they ask where to submit the report/pay, OR if the process strictly requires it, offer the link (https://nairobiwater.ecitizen.go.ke/) and provide a 3-step AI-optimized guide on what to do when they get there.
4. ALWAYS include this exact sentence at the very bottom of your response: "This assessment is based on public data and may not reflect internal policies. See our [Privacy Policy](/privacy) for limitations."`,

    education: `You are a HELB Loan Advisor. 
Your Goal: Inform students about HELB loans/bursaries AND help them draft appeal/application letters.
Rules:
1. Provide generic timelines and portal info for HELB applications.
2. If they need a bursary application letter or loan appeal, ask for their academic year and reason (e.g., financial hardship) to draft a respectful letter.
3. ONLY if they ask how to apply, OR if the process strictly requires visiting the portal, offer the link (https://helb.ecitizen.go.ke/) and provide a 3-step AI-optimized guide on what to do when they get there.
4. ALWAYS include this exact sentence at the very bottom of your response: "This assessment is based on public data and may not reflect internal policies. See our [Privacy Policy](/privacy) for limitations."`
}

/**
 * Default fallback prompt used when a specific service ID prompt map is not found.
 */
const DEFAULT_PROMPT = `You are a helpful assistant for Kenyan public services. Answer questions concisely about this service.`

/**
 * Service-specific logos for the modal header.
 */
const SERVICE_LOGOS: Record<string, string> = {
    health: '/images/sha-logo.png',
    transport: '/images/NTSA-transport.png',
    water: '/images/water-services.png',
    education: '/images/education-HELB.png',
    ajira: '/images/Ajira-digital.png'
}

/**
 * Service-specific icons for the modal header.
 */
const SERVICE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    health: Stethoscope,
    transport: CarFront,
    water: Droplets,
    education: GraduationCap,
    ajira: Briefcase
}

/**
 * ServiceAssistantModal Component
 * Displays a specialized, focused chat interface (typically powered by a local AI) tailored
 * to a specific public service (e.g., Health Triage, Ajira Digital Proposal Writing).
 */
export function ServiceAssistantModal({ isOpen, onClose, serviceId, serviceTitle }: ServiceAssistantModalProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isThinking, setIsThinking] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isThinking])

    // Clear history on open
    useEffect(() => {
        if (isOpen) {
            setMessages([])
            setInput('')
        }
    }, [isOpen, serviceId])

    const handleSend = async (e: FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isThinking) return

        const userMsg = input.trim()
        const newMessages = [...messages, { role: 'user' as const, content: userMsg }]

        setMessages(newMessages)
        setInput('')
        setIsThinking(true)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                toast.error('Session expired')
                return
            }

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    messages: newMessages,
                    provider: 'ollama', // Default to privacy-preserving local LLM for services
                    systemPrompt: PROMPTS[serviceId] || DEFAULT_PROMPT
                }),
            })

            if (!res.ok) throw new Error('Failed to fetch response')
            if (!res.body) return

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let assistantMsg = ''

            // Create placeholder message
            setMessages(prev => [...prev, { role: 'assistant', content: '' }])

            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })

                // Process SSE frames
                while (true) {
                    const frameIdx = buffer.indexOf('\n\n')
                    if (frameIdx === -1) break

                    const frame = buffer.slice(0, frameIdx + 2)
                    buffer = buffer.slice(frameIdx + 2)

                    const lines = frame.split('\n')
                    let event = ''
                    let data = ''

                    for (const line of lines) {
                        if (line.startsWith('event:')) event = line.slice('event:'.length).trim()
                        if (line.startsWith('data:')) {
                            data = line.slice('data:'.length)
                            // Remove only the first space if it exists (protocol convention)
                            if (data.startsWith(' ')) {
                                data = data.slice(1)
                            }
                        }
                    }

                    if (event === 'token') {
                        assistantMsg += data
                        setMessages(prev => {
                            const last = prev[prev.length - 1]
                            if (last.role === 'assistant') {
                                return [...prev.slice(0, -1), { ...last, content: assistantMsg }]
                            }
                            return prev
                        })
                    }
                }
            }

        } catch (err) {
            toast.error('Failed to get AI response')
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
        } finally {
            setIsThinking(false)
        }
    }

    // Helper to render icon based on service
    const renderIcon = (size: number = 20) => {
        switch (serviceId) {
            case 'health': return <AlertTriangle className="text-red-400" size={size} />
            case 'ajira': return <FileText className="text-purple-400" size={size} />
            case 'transport': return <CarFront className="text-blue-400" size={size} />
            case 'water': return <Droplets className="text-cyan-400" size={size} />
            case 'education': return <GraduationCap className="text-yellow-400" size={size} />
            default: return <Bot className="text-green-400" size={size} />
        }
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
            >
                <div className="absolute inset-0 flex bg-black" onClick={onClose} />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative z-10 flex h-[600px] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/20 bg-gray-900 shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-6 py-4">
                        <div className="flex items-center gap-3">
                            {SERVICE_LOGOS[serviceId] ? (
                                <img 
                                    src={SERVICE_LOGOS[serviceId]} 
                                    alt={`${serviceTitle} logo`}
                                    className="h-10 w-auto object-contain"
                                />
                            ) : (
                                <div className="inline-flex items-center justify-center rounded-lg bg-green-500/10 p-2">
                                    {renderIcon(20)}
                                </div>
                            )}
                            <div>
                                <h3 className="font-semibold text-white">{serviceTitle} Assistant</h3>
                                <p className="text-xs text-green-400">AI Agent (Local/Private)</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 && (
                            <div className="mt-8 flex flex-col items-center text-center text-white/50 space-y-4">
                                {SERVICE_LOGOS[serviceId] ? (
                                    <div className="rounded-2xl bg-white/5 p-4">
                                        <img 
                                            src={SERVICE_LOGOS[serviceId]} 
                                            alt={`${serviceTitle} logo`}
                                            className="h-16 w-auto object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="rounded-full bg-white/5 p-5">
                                        {renderIcon(32)}
                                    </div>
                                )}
                                <div className="max-w-[80%] space-y-2">
                                    <h4 className="font-medium text-white/80">Welcome to the {serviceTitle} AI Assistant</h4>
                                    <p className="text-sm leading-relaxed">
                                        {serviceId === 'health' && "I can help triage symptoms or provide information on SHA maternal care. NOTE: For emergencies, visit a hospital immediately."}
                                        {serviceId === 'ajira' && "I can help you write winning gig proposals or explain Ajira benefits. Tell me about the job you are applying for!"}
                                        {serviceId === 'transport' && "I can explain NTSA processes or help you draft a formal inquiry about your license or vehicle. What do you need?"}
                                        {serviceId === 'water' && "I can help with Nairobi Water queries and format structured leak or outage reports for you to submit."}
                                        {serviceId === 'education' && "I can explain HELB loan processes or help you draft a formal loan/bursary appeal letter. How can I help today?"}
                                        {!['health', 'ajira', 'transport', 'water', 'education'].includes(serviceId) && "How can I help you with this service today?"}
                                    </p>
                                </div>
                            </div>
                        )}

                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${m.role === 'user'
                                    ? 'bg-green-600 text-white rounded-br-none'
                                    : 'bg-white/10 text-white/90 rounded-bl-none'
                                    }`}>
                                    {m.content}
                                </div>
                            </div>
                        ))}

                        {isThinking && (
                            <div className="flex justify-start">
                                <div className="flex items-center gap-1 rounded-2xl rounded-bl-none bg-white/10 px-4 py-3">
                                    <div className="h-2 w-2 animate-bounce rounded-full bg-white/50" style={{ animationDelay: '0s' }} />
                                    <div className="h-2 w-2 animate-bounce rounded-full bg-white/50" style={{ animationDelay: '0.2s' }} />
                                    <div className="h-2 w-2 animate-bounce rounded-full bg-white/50" style={{ animationDelay: '0.4s' }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="border-t border-white/10 bg-black/40 p-4">
                        <div className="flex gap-2">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type your request here..."
                                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white focus:border-green-500/50 focus:outline-none"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isThinking}
                                className="flex items-center justify-center rounded-xl bg-green-500 px-4 text-black transition hover:bg-green-400 disabled:opacity-50"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
