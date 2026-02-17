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
import { useState } from 'react'
import { ServiceAssistantModal } from './ServiceAssistantModal'

const services = [
    {
        id: 'health',
        title: 'Healthcare (SHA)',
        description: 'Access the Social Health Authority for registration, claims, and universal health coverage services.',
        link: 'https://sha.go.ke/',
        icon: Stethoscope,
        color: 'text-red-400',
        bg: 'bg-red-400/10'
    },
    {
        id: 'transport',
        title: 'NTSA Transport',
        description: 'Manage driving licenses, vehicle inspections, and road safety compliance via NTSA TIMS.',
        link: 'https://timsvirl.ntsa.go.ke/',
        icon: CarFront,
        color: 'text-blue-400',
        bg: 'bg-blue-400/10'
    },
    {
        id: 'water',
        title: 'Water Services',
        description: 'Pay water bills, apply for new connections, and report issues to Nairobi City Water.',
        link: 'https://www.nairobiwater.co.ke/',
        icon: Droplets,
        color: 'text-cyan-400',
        bg: 'bg-cyan-400/10'
    },
    {
        id: 'education',
        title: 'Education (HELB)',
        description: 'Apply for student loans, bursaries, and manage repayment through the Higher Education Loans Board.',
        link: 'https://portal.helb.co.ke/',
        icon: GraduationCap,
        color: 'text-yellow-400',
        bg: 'bg-yellow-400/10'
    },
    {
        id: 'ajira',
        title: 'Ajira Digital',
        description: 'Find digital work opportunities, training, and mentorship for Kenyan youth in the gig economy.',
        link: 'https://ajiradigital.go.ke/',
        icon: Briefcase,
        color: 'text-purple-400',
        bg: 'bg-purple-400/10'
    }
]

export function ServiceHub() {
    const [selectedService, setSelectedService] = useState<{ id: string; title: string } | null>(null)

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Public Services Hub</h2>
            {/* Grid Layout: 1 col mobile, 2 col tablet, 3 col desktop */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {services.map((service, index) => (
                    <motion.div
                        key={service.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-white/5 p-5 transition-all hover:border-white/20 hover:bg-white/10"
                    >
                        {/* Interactive Link Area for Title/Desc */}
                        <a
                            href={service.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block space-y-3 flex-1"
                        >
                            <div className={`inline-flex items-center justify-center rounded-lg p-2 ${service.bg} ${service.color}`}>
                                <service.icon size={24} />
                            </div>
                            <h3 className="text-lg font-medium text-white group-hover:text-green-400 transition-colors">
                                {service.title}
                            </h3>
                            <p className="text-sm text-white/60 line-clamp-3">
                                {service.description}
                            </p>
                        </a>

                        {/* Footer Actions */}
                        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
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
                                onClick={() => setSelectedService({ id: service.id, title: service.title })}
                                className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-500 hover:text-black"
                            >
                                <Bot size={14} />
                                <span>AI Assist</span>
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            <ServiceAssistantModal
                isOpen={!!selectedService}
                onClose={() => setSelectedService(null)}
                serviceId={selectedService?.id || ''}
                serviceTitle={selectedService?.title || ''}
            />
        </div>
    )
}
