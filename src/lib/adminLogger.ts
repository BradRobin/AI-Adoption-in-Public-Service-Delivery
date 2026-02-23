import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

type AdminActionType = 'view_page' | 'ban_user' | 'activate_user' | 'edit_service' | string

export async function logAdminAction(
    adminId: string,
    action: AdminActionType,
    targetId?: string,
    details?: Record<string, any>
) {
    try {
        const cookieStore = await cookies()

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll() { }
                }
            }
        )

        const { error } = await supabase.from('admin_logs').insert({
            admin_id: adminId,
            action: action,
            target_id: targetId || null,
            details: details || {}
        })

        if (error) {
            console.error('[Admin Logger Error] Failed to write audit log:', error.message)
        }
    } catch (e) {
        console.error('[Admin Logger Error] Infrastructure failure:', e)
    }
}
