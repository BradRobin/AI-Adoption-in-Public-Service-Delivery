/**
 * @file privacy/page.tsx
 * @description Privacy Policy and Terms of Service page with animated sections.
 * Displays legal information, data collection practices, and security measures.
 * Styled with gradient backgrounds and hover effects for visual appeal.
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
    Shield,
    Lock,
    Scale,
    UserCheck,
    Database,
    Gavel,
    FileText,
    Settings,
    EyeOff
} from 'lucide-react'
import { NavigationMenu } from '@/components/NavigationMenu'

/**
 * Props for individual policy section cards.
 */
interface PolicySectionProps {
    /** Section heading text */
    title: string
    /** Lucide icon component for visual identification */
    icon: React.ElementType
    /** Section content (paragraphs and lists) */
    children: React.ReactNode
    /** Animation delay in seconds for staggered entrance */
    delay?: number
}

/**
 * PolicySection Component
 * Renders a styled card containing a privacy/legal policy section.
 * Features animated entrance and hover effects.
 */
function PolicySection({ title, icon: Icon, children, delay = 0 }: PolicySectionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="mb-12 rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 backdrop-blur-md relative overflow-hidden group"
        >
            <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-5 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none">
                <Icon size={160} />
            </div>

            <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-linear-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400">
                    <Icon size={24} />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
            </div>
            <div className="space-y-4 text-zinc-300 leading-relaxed relative z-10">
                {children}
            </div>
        </motion.div>
    )
}

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-zinc-950 text-white selection:bg-indigo-500/30">
            {/* Navigation Overlay */}
            <div className="fixed top-4 right-4 z-50 md:top-6 md:right-6">
                <NavigationMenu />
            </div>

            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden hidden md:block">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
            </div>

            <main id="main-content" className="mobile-page-with-bottom-nav relative z-10 mx-auto max-w-4xl px-4 pt-20 md:px-6 md:py-32">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 mb-6 text-indigo-400">
                        <Shield size={32} />
                    </div>
                    <h1 className="mb-6 bg-linear-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-5xl lg:text-6xl">
                        Privacy & Security Policy
                    </h1>
                    <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto">
                        We are committed to protecting your data, ensuring transparency, and providing robust security measures for your peace of mind.
                    </p>
                </motion.div>

                <div className="space-y-8">
                    <PolicySection title="Legal & Terms of Service" icon={Scale} delay={0.1}>
                        <p>
                            By utilizing our AI Adoption in Public Service Delivery platform, you agree to comply with our general usage terms. This service is designed to facilitate organizational assessment and provide AI assistance in navigating public service resources.
                        </p>
                        <p>
                            Users must ensure that the information provided during the self-assessment and profile creation is accurate. Misuse of the platform, including unauthorized access attempts or exploitation of the AI assistant, is strictly prohibited and may result in immediate account termination.
                        </p>
                        <ul className="list-disc pl-5 mt-4 space-y-2 marker:text-indigo-400">
                            <li><strong>Acceptable Use:</strong> The platform should be used for its intended purpose of assessing AI readiness and seeking public service guidance.</li>
                            <li><strong>Liability:</strong> While we strive for accuracy, AI-generated guidance should be cross-referenced with official sources. We are not liable for decisions made based solely on AI recommendations.</li>
                        </ul>
                    </PolicySection>

                    <PolicySection title="Privacy & Data Collection" icon={EyeOff} delay={0.2}>
                        <p>
                            Your privacy is our paramount concern. We collect only the data necessary to provide and improve our services to you.
                        </p>
                        <ul className="list-disc pl-5 mt-4 space-y-2 marker:text-indigo-400">
                            <li><strong>Profile Data:</strong> We collect your name, email, and designated location to personalize your experience and route relevant localized service information.</li>
                            <li><strong>Assessment Data:</strong> Data submitted during the AI Self-Assessment is stored securely to provide you with historical readiness scores and comparative industry insights.</li>
                            <li><strong>Interaction Logs:</strong> Chatbot interactions are processed to provide immediate assistance. Anonymized aggregates may be used to improve the AI's contextual understanding.</li>
                        </ul>
                        <p className="mt-4">
                            We <strong className="text-white">do not</strong> sell your personal data to third parties. Data sharing is limited to essential service providers (e.g., authentication services) governed by strict confidentiality agreements.
                        </p>
                    </PolicySection>

                    <PolicySection title="Security Measures" icon={Lock} delay={0.3}>
                        <p>
                            We employ industry-standard security protocols to safeguard your information from unauthorized access, disclosure, or destruction.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4 mt-6">
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-black/20 border border-white/5">
                                <UserCheck className="mt-1 shrink-0 text-green-400" size={20} />
                                <div>
                                    <h4 className="font-medium text-white mb-1">Secure Authentication</h4>
                                    <p className="text-sm text-zinc-400">Powered by Supabase Auth, ensuring encrypted identity verification and secure session management.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-black/20 border border-white/5">
                                <Database className="mt-1 shrink-0 text-blue-400" size={20} />
                                <div>
                                    <h4 className="font-medium text-white mb-1">Data Encryption</h4>
                                    <p className="text-sm text-zinc-400">All sensitive data is encrypted at rest and in transit using modern cryptographic standards.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-black/20 border border-white/5 sm:col-span-2">
                                <Shield className="mt-1 shrink-0 text-indigo-400" size={20} />
                                <div>
                                    <h4 className="font-medium text-white mb-1">Secure Admin Portals</h4>
                                    <p className="text-sm text-zinc-400">Administrative access is strictly gated, requiring separate authentication and comprehensive audit logging for all system-level actions.</p>
                                </div>
                            </div>
                        </div>
                    </PolicySection>

                    <PolicySection title="User Data Controls" icon={Settings} delay={0.4}>
                        <p>
                            You maintain complete control over your personal data. We provide tools within the platform to manage your information effectively.
                        </p>
                        <ul className="list-disc pl-5 mt-4 space-y-2 marker:text-indigo-400">
                            <li><strong>Profile Management:</strong> You can view and edit your profile details, including your location, at any time via the Profile Settings page.</li>
                            <li><strong>Data Portability:</strong> You may request a cumulative export of your assessment scores and profile data.</li>
                            <li><strong>Account Deletion:</strong> You have the right to be forgotten. Deleting your account will permanently remove your profile, assessment history, and associated chat logs from our active databases.</li>
                        </ul>
                    </PolicySection>
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 1 }}
                    className="mt-16 text-center text-sm text-zinc-500"
                >
                    <p>Last updated: March 2026</p>
                    <p className="mt-2 text-zinc-600">
                        If you have any questions regarding this policy, please contact our Data Protection Officer through the platform's feedback mechanism.
                    </p>
                </motion.div>
            </main>
        </div>
    )
}
