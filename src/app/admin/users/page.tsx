import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { UsersTable, UserProfile } from './UsersTable'
import { Users, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll() {
                    // Handled by middleware
                },
            },
        }
    )

    // Fetch all profiles. 
    // Handled securely on the server via the "Admins can view all profiles" RLS policy.
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center text-center">
                <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
                <h2 className="text-xl font-bold text-white mb-2">Error Loading Users</h2>
                <p className="text-white/60">
                    Failed to communicate with the database. Please ensure the migration for the `profiles` table has been successfully run.
                </p>
                <pre className="mt-4 p-4 rounded bg-red-900/20 text-red-400 text-sm border border-red-500/20">
                    {error.message}
                </pre>
            </div>
        )
    }

    // Typecast or map raw Supabase data to expected UsersTable format
    const users: UserProfile[] = profiles?.map(p => ({
        id: p.id,
        email: p.email,
        role: p.role,
        is_banned: p.is_banned,
        last_login: p.last_login,
        created_at: p.created_at
    })) || []

    const totalUsers = users.length
    const bannedUsers = users.filter(u => u.is_banned).length

    return (
        <div className="flex flex-col h-full">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
                        <Users className="text-green-400" size={28} />
                        User Management
                    </h1>
                    <p className="text-white/60">
                        View all registered users, adjust roles, and manage platform access.
                    </p>
                </div>

                <div className="flex gap-4">
                    <div className="flex flex-col items-end rounded-lg border border-white/10 bg-white/5 px-4 py-2">
                        <span className="text-xs font-medium text-white/50">Total Users</span>
                        <span className="text-lg font-bold text-white">{totalUsers}</span>
                    </div>
                    {(bannedUsers > 0) && (
                        <div className="flex flex-col items-end rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2">
                            <span className="text-xs font-medium text-red-400/70">Banned</span>
                            <span className="text-lg font-bold text-red-400">{bannedUsers}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1">
                <UsersTable data={users} />
            </div>
        </div>
    )
}
