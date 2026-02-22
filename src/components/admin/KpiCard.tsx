import { ElementType } from 'react'

interface KpiCardProps {
    title: string
    value: string | number
    icon: ElementType
    description?: string
    trend?: {
        value: string
        isPositive: boolean
    }
}

export function KpiCard({ title, value, icon: Icon, description, trend }: KpiCardProps) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white/70">{title}</h3>
                <div className="rounded-lg bg-green-500/10 p-2 text-green-400">
                    <Icon size={20} />
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <span className="text-3xl font-bold text-white">{value}</span>

                {(description || trend) && (
                    <div className="flex items-center gap-2 mt-1">
                        {trend && (
                            <span className={`text-xs font-semibold ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                {trend.isPositive ? '+' : '-'}{trend.value}
                            </span>
                        )}
                        {description && (
                            <span className="text-xs text-white/50">{description}</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
