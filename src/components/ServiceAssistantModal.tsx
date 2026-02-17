'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Bot, AlertTriangle, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export type ServiceAction = 'health_triage' | 'gig_proposal' | 'transport_guide' | 'water_support' | 'education_advisor'

interface ServiceAssistantModalProps {
    isOpen: boolean
    onClose: () => void
    serviceId: string
    serviceTitle: string
}

type Message = {
    role: 'user' | 'assistant'
    content: string
}

// System Prompts for Specific AI Agents
const PROMPTS: Record<string, string> = {
    health: `You are a Maternal Health Triage Assistant for the Social Health Authority (SHA) Kenya.
Your Goal: Help mothers assess symptoms like bleeding, fever, or pain.
Rules:
1. ALWAYS start with a disclaimer: "I am an AI assistant, not a doctor. If this is an emergency, go to the nearest hospital immediately."
2. Ask clarification questions about the symptom severity.
3. Classify urgency: "Emergency" (Hospital NOW), "Urgent" (See doctor today), or "Routine".
4. Be empathetic and clear. Use simple English or Kiswahili if requested.`,

    ajira: `You are a Professional Proposal Writer for the Ajira Digital Program.
Your Goal: Help Kenyan youth write winning proposals for Upwork/Fiverr jobs.
Rules:
1. Ask for: The Job Title, Client Requirements, and User's Skills.
2. Generate a structured proposal: Greeting -> Understanding of Problem -> Proposed Solution -> Relevant Experience -> Call to Action.
3. Tone: Professional, confident, and concise.`,

    transport: `You are an NTSA Transport Guide. Help users understand driving license renewal, vehicle inspection, and road safety rules in Kenya.`,

    water: `You are a Nairobi Water Support Assistant. Help users report leaks, understand bills, and apply for new connections.`,

    education: `You are a HELB Loan Advisor. Help students apply for loans, understand repayment terms, and check bursary eligibility.`
}

// Default prompt if ID not found
const DEFAULT_PROMPT = `You are a helpful assistant for Kenyan public services. Answer questions concisely about this service.`

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

            const reader = res.body?.getReader()
            const decoder = new TextDecoder()
            let assistantMsg = ''

            setMessages(prev => [...prev, { role: 'assistant', content: '' }])

            while (true) {
                const { done, value } = await reader?.read() || {}
                if (done) break

                const chunk = decoder.decode(value, { stream: true })
                // Simple parser for our SSE format (data: ...) or raw stream depending on implementation
                // leveraging the existing parser logic or simple text extraction

                // Quick hack for this modal: we'll rebuild full response or append incrementally
                // The API sends SSE events. Let's parse simply:
                const lines = chunk.split('\n')
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6)
                        // Try to see if it's "token" event logic from api/chat
                        // Actually api/chat sends: event: token\ndata: value\n\n
                    }
                }
                // For simplicity in this modal, let's assume raw text flow or handle the SSE correctly
                // NOTE: Since our API sends SSE, we need a proper parser or use the one from ChatPage. 
                // To keep this component self-contained and small, I will implement a basic version.

                // Re-using the logic from `ChatPage` is best, but let's try a simpler fetch for now 
                // to avoid duplicating the complex parser. 
                // Wait, `api/chat` returns a stream. 
                // Let's just accumulate raw text if the API was simple, but it's SSE.
                // We MUST parse SSE event: token
            }

            // Re-implementing a minimal SSE reader for this modal
            // (Simulated for brevity in this step, practically we'd extract a helper, 
            // but for this file I'll write the loop)

            // Let's refetch with a non-streaming approach? No, API is streaming-only.
            // Okay, let's use a robust reader.

            if (!res.body) return
            const reader2 = res.body.pipeThrough(new TextDecoderStream()).getReader()

            let buffer = ''

            while (true) {
                const { value, done } = await reader2.read()
                if (done) break
                buffer += value

                const parts = buffer.split('\n\n')
                buffer = parts.pop() || ''

                for (const part of parts) {
                    const lines = part.split('\n')
                    let event = ''
                    let data = ''
                    for (const line of lines) {
                        if (line.startsWith('event: ')) event = line.slice(7)
                        if (line.startsWith('data: ')) data = line.slice(6)
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
    const renderIcon = () => {
        // Using a generic Bot icon, but could map specific ones.
        return <Bot className="text-green-400" size={20} />
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
                            <div className="inline-flex items-center justify-center rounded-lg bg-green-500/10 p-2">
                                {renderIcon()}
                            </div>
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
                            <div className="mt-8 flex flex-col items-center text-center text-white/50">
                                <div className="rounded-full bg-white/5 p-4 mb-3">
                                    {serviceId === 'health' && <AlertTriangle size={32} className="text-red-400" />}
                                    {serviceId === 'ajira' && <FileText size={32} className="text-purple-400" />}
                                    {serviceId !== 'health' && serviceId !== 'ajira' && <Bot size={32} />}
                                </div>
                                <p className="text-sm max-w-[80%]">
                                    {serviceId === 'health' && "I can help triage symptoms. NOTE: For emergencies, visit a hospital immediately."}
                                    {serviceId === 'ajira' && "I can help you write winning gig proposals. Tell me about the job!"}
                                    {!['health', 'ajira'].includes(serviceId) && "How can I help you with this service today?"}
                                </p>
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
