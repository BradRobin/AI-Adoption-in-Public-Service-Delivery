/**
 * @file admin/users/actions.ts
 * @description Server Actions for admin user management operations.
 * Contains secure, server-side functions for modifying user accounts.
 * All actions include permission checks and audit logging.
 */

'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { logAdminAction } from '@/lib/adminLogger'

/**
 * Toggles a user's banned status (ban or unban).
 * Performs authorization checks to ensure only admins can execute this action.
 * Logs the action to the admin audit trail for compliance tracking.
 *
 * @param {string} userId - The UUID of the target user to ban/unban
 * @param {boolean} currentBanStatus - The user's current ban status (true = banned)
 * @returns {Promise<{success: boolean}>} Operation result
 * @throws {Error} If caller is not authenticated or not an admin
 * @throws {Error} If database operation fails
 */
export async function toggleUserBanStatus(userId: string, currentBanStatus: boolean) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    // Read only in server actions unless passed back to response
                },
            },
        }
    )

    // Verify the caller is an admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error('Unauthorized')
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

    if (user.user_metadata?.role !== 'admin' && profile?.role !== 'admin') {
        throw new Error('Forbidden: Admins Only')
    }

    // Attempt the update. 
    // Requires a Service Role Key to bypass RLS if Admins cannot normally update arbitrary profiles. 
    // We assume the DB RLS policy allows admins to update profiles (created in migration).
    const { error } = await supabase
        .from('profiles')
        .update({ is_banned: !currentBanStatus })
        .eq('id', userId)

    if (error) {
        console.error('Failed to toggle ban status:', error)
        throw new Error('Database error updating ban status')
    }

    // Log the action to the audit trail
    const actionName = currentBanStatus ? 'activate_user' : 'ban_user'
    await logAdminAction(user.id, actionName, userId, { previousState: currentBanStatus })

    // Invalidate the users cache so the table refreshes
    revalidatePath('/admin/users')

    return { success: true }
}
