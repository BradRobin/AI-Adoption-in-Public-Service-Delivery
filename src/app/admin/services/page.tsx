/**
 * @file admin/services/page.tsx
 * @description Admin services management page displaying integrated public services.
 * Shows service cards with status indicators, integration counts, and user statistics.
 * Provides links to external service portals for verification.
 */

import { Briefcase, CheckCircle2, Stethoscope, CarFront, Droplets, GraduationCap, ExternalLink } from 'lucide-react'

/**
 * Static service configuration data.
 * In production, this would be fetched from a database with real-time metrics.
 */
const services = [
    {
        id: 'health',
        title: 'Healthcare (SHA)',
        description: 'Access the Social Health Authority for registration, claims, and universal health coverage services.',
        link: 'https://sha.go.ke/',
        icon: Stethoscope,
        status: 'Active',
        integrations: 3,
        users: 1245
    },
    {
        id: 'transport',
        title: 'NTSA Transport',
        description: 'Manage driving licenses, vehicle inspections, and road safety compliance via NTSA TIMS.',
        link: 'https://timsvirl.ntsa.go.ke/',
        icon: CarFront,
        status: 'Active',
        integrations: 2,
        users: 856
    },
    {
        id: 'water',
        title: 'Water Services',
        description: 'Pay water bills, apply for new connections, and report issues to Nairobi City Water.',
        link: 'https://www.nairobiwater.co.ke/',
        icon: Droplets,
        status: 'Active',
        integrations: 1,
        users: 432
    },
    {
        id: 'education',
        title: 'Education (HELB)',
        description: 'Apply for student loans, bursaries, and manage repayment through the Higher Education Loans Board.',
        link: 'https://portal.helb.co.ke/',
        icon: GraduationCap,
        status: 'Maintenance',
        integrations: 2,
        users: 654
    },
    {
        id: 'ajira',
        title: 'Ajira Digital',
        description: 'Find digital work opportunities, training, and mentorship for Kenyan youth in the gig economy.',
        link: 'https://ajiradigital.go.ke/',
        icon: Briefcase,
        status: 'Active',
        integrations: 4,
        users: 2100
    }
]

export default function AdminServicesPage() {
    return (
        <div className="flex flex-col h-full">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
                        <Briefcase className="text-green-400" size={28} />
                        Supported Public Services
                    </h1>
                    <p className="text-white/60">
                        View and manage the public services integrated with PARP.
                    </p>
                </div>

                <div className="flex gap-4">
                    <div className="flex flex-col items-end rounded-lg border border-white/10 bg-white/5 px-4 py-2">
                        <span className="text-xs font-medium text-white/50">Total Services</span>
                        <span className="text-lg font-bold text-white">{services.length}</span>
                    </div>
                    <div className="flex flex-col items-end rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-2">
                        <span className="text-xs font-medium text-green-400/70">Active</span>
                        <span className="text-lg font-bold text-green-400">{services.filter(s => s.status === 'Active').length}</span>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => (
                    <div key={service.id} className="group flex flex-col rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 transition-all hover:border-white/20 hover:bg-white/10">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center justify-center p-3 rounded-lg bg-white/10 group-hover:bg-green-500/20 transition-colors">
                                <service.icon className="text-white group-hover:text-green-400 transition-colors" size={24} />
                            </div>
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${service.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                                }`}>
                                <CheckCircle2 size={14} />
                                {service.status}
                            </span>
                        </div>

                        <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-green-400 transition-colors">{service.title}</h3>
                        <p className="text-sm text-white/50 mb-6 flex-1 line-clamp-3">{service.description}</p>

                        <div className="flex items-center justify-between pt-4 border-t border-white/10 mb-4">
                            <div className="flex flex-col">
                                <span className="text-xs text-white/40 mb-1">Integrations</span>
                                <span className="font-medium text-white text-sm">{service.integrations} APIs</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-xs text-white/40 mb-1">Active Users</span>
                                <span className="font-medium text-white text-sm">{service.users.toLocaleString()}</span>
                            </div>
                        </div>

                        <a
                            href={service.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full rounded-lg bg-white/5 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                        >
                            Visit Portal
                            <ExternalLink size={14} />
                        </a>
                    </div>
                ))}
            </div>
        </div>
    )
}
