/**
 * @file adminLogger.ts
 * @description Server-side admin audit logging utility for tracking administrative actions.
 * This module provides secure, server-only logging of admin activities to the admin_logs table.
 * All admin actions (user bans, role changes, page views) are recorded for compliance and security monitoring.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Union type representing all possible admin action categories.
 * Can be extended with additional string values for custom admin actions.
 */
type AdminActionType = 'view_page' | 'ban_user' | 'activate_user' | 'edit_service' | string

/**
 * Logs an administrative action to the admin_logs table for audit trail purposes.
 * Creates a server-side Supabase client using HTTP-only cookies for authentication.
 * Failures are logged to console but do not throw to prevent disruption of admin workflows.
 *
 * @param {string} adminId - The UUID of the admin user performing the action.
 * @param {AdminActionType} action - The type of action being performed.
 * @param {string} [targetId] - Optional ID of the entity being acted upon (e.g., user ID being banned).
 * @param {Record<string, any>} [details] - Optional additional metadata about the action.
 * @returns {Promise<void>} Resolves when the log entry is written or fails silently.
 *
 * @example
 * // Log a user ban action
 * await logAdminAction(adminUserId, 'ban_user', targetUserId, { reason: 'violation' })
 */
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
            // Log to console for server-side debugging; does not block admin operations
            console.error('[Admin Logger Error] Failed to write audit log:', error.message)
        }
    } catch (e) {
        // Catch-all for unexpected errors (network issues, configuration problems)
        console.error('[Admin Logger Error] Infrastructure failure:', e)
    }
}
