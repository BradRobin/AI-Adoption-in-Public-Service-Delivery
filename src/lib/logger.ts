import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { headers } from 'next/headers'

type LogAction = 'login' | 'logout' | 'query' | 'error' | 'assessment' | 'admin_action' | string

interface LogDetails {
    [key: string]: any
}

/**
 * Server-side utility to securely write to the `system_logs` table.
 * Resolves the user session internally if `userId` is not explicitly provided.
 * Attempts to extract an anonymized IP address from headers.
 */
export async function logSysEvent(action: LogAction, details?: LogDetails, userId?: string) {
    try {
        const cookieStore = await cookies()
        const headersList = await headers()

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll() {
                        // read only context in most sub-routines
                    },
                },
            }
        )

        // Resolve generic user if none provided
        let targetUserId = userId
        if (!targetUserId) {
            const { data: { user } } = await supabase.auth.getUser()
            targetUserId = user?.id
        }

        // Attempt IP extraction and anonymization (e.g., masking last octet)
        let ipAddress = 'unknown'
        const rawIp = headersList.get('x-forwarded-for') || headersList.get('x-real-ip')
        if (rawIp) {
            const ipParts = rawIp.split(',')[0].trim().split('.')
            if (ipParts.length === 4) {
                ipAddress = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.xxx`
            } else {
                ipAddress = 'anonymized-ipv6'
            }
        }

        const { error } = await supabase.from('system_logs').insert({
            user_id: targetUserId,
            action: action,
            details: details || {},
            ip_address: ipAddress
        })

        if (error) {
            console.error('[Logger Error] Failed to write log:', error.message)
        }
    } catch (e) {
        console.error('[Logger Error] Infrastructure failure:', e)
    }
}
