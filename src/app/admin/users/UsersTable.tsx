/**
 * @file admin/users/UsersTable.tsx
 * @description Interactive data table component for admin user management.
 * Features search filtering, pagination, and ban/unban actions.
 * Built on TanStack Table for robust data handling and sorting.
 */

'use client'

import { useState } from 'react'
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { Search, ShieldAlert, ShieldCheck } from 'lucide-react'
import { toggleUserBanStatus } from './actions'
import toast from '@/lib/toast'

/**
 * Type definition for user profile data displayed in the table.
 */
export type UserProfile = {
    /** Unique user identifier (UUID) */
    id: string
    /** User's email address */
    email: string
    /** User's role (e.g., 'user', 'admin') */
    role: string
    /** Whether the user is currently banned from the platform */
    is_banned: boolean
    /** ISO timestamp of last login, null if never logged in */
    last_login: string | null
    /** ISO timestamp when the account was created */
    created_at: string
}

/**
 * Props for the UsersTable component.
 */
interface UsersTableProps {
    /** Array of user profiles to display */
    data: UserProfile[]
}

/** TanStack Table column helper for type-safe column definitions */
const columnHelper = createColumnHelper<UserProfile>()

/**
 * UsersTable Component
 * Renders a searchable, paginated table of platform users.
 * Includes confirmation dialog for ban/unban actions.
 *
 * @param {UsersTableProps} props - Table configuration and data
 */
export function UsersTable({ data: initialData }: UsersTableProps) {
    const [globalFilter, setGlobalFilter] = useState('')
    const [isOpenDialog, setIsOpenDialog] = useState(false)
    const [userToModify, setUserToModify] = useState<UserProfile | null>(null)
    const [isUpdating, setIsUpdating] = useState(false)

    // Instead of completely reloading state, we can depend on Server Action revalidation 
    // to pass down new initialData.

    const handleToggleClick = (user: UserProfile) => {
        setUserToModify(user)
        setIsOpenDialog(true)
    }

    const confirmToggleBan = async () => {
        if (!userToModify) return
        setIsUpdating(true)
        try {
            await toggleUserBanStatus(userToModify.id, userToModify.is_banned)
            toast.success(`User successfully ${userToModify.is_banned ? 'activated' : 'banned'}.`)
            setIsOpenDialog(false)
        } catch (error: any) {
            toast.error(error.message || 'Failed to update user.')
        } finally {
            setIsUpdating(false)
        }
    }

    const columns = [
        columnHelper.accessor('email', {
            header: 'Email / User',
            cell: info => (
                <div className="font-medium text-white">
                    {info.getValue()}
                </div>
            ),
        }),
        columnHelper.accessor('role', {
            header: 'Role',
            cell: info => (
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${info.getValue() === 'admin'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}>
                    {info.getValue().toUpperCase()}
                </span>
            )
        }),
        columnHelper.accessor('created_at', {
            header: 'Joined',
            cell: info => new Date(info.getValue()).toLocaleDateString()
        }),
        columnHelper.accessor('is_banned', {
            header: 'Status',
            cell: info => {
                const isBanned = info.getValue()
                return (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${isBanned
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                            : 'bg-green-500/10 text-green-400 border border-green-500/20'
                        }`}>
                        {isBanned ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
                        {isBanned ? 'Banned' : 'Active'}
                    </span>
                )
            }
        }),
        columnHelper.display({
            id: 'actions',
            header: 'Actions',
            cell: props => {
                const user = props.row.original
                // Don't ban other admins easily to prevent accidental lockout
                if (user.role === 'admin') return <span className="text-xs text-white/30">Protected</span>

                return (
                    <button
                        onClick={() => handleToggleClick(user)}
                        className={`text-sm font-medium transition-colors ${user.is_banned
                                ? 'text-green-400 hover:text-green-300'
                                : 'text-red-400 hover:text-red-300'
                            }`}
                    >
                        {user.is_banned ? 'Activate' : 'Ban'}
                    </button>
                )
            }
        })
    ]

    const table = useReactTable({
        data: initialData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        state: {
            globalFilter,
        },
        onGlobalFilterChange: setGlobalFilter,
        initialState: {
            pagination: {
                pageSize: 10,
            }
        }
    })

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-72">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-4 w-4 text-white/40" />
                    </div>
                    <input
                        value={globalFilter ?? ''}
                        onChange={e => setGlobalFilter(e.target.value)}
                        placeholder="Search emails or roles..."
                        className="block w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-3 text-sm text-white placeholder:text-white/40 focus:border-green-500/50 focus:outline-none focus:ring-1 focus:ring-green-500/50"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-white/10 bg-zinc-950 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-white/70">
                        <thead className="bg-white/5 text-xs uppercase text-white/50 border-b border-white/10">
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id} className="px-6 py-4 font-medium">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="px-6 py-8 text-center text-white/40">
                                        No users found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map(row => (
                                    <tr key={row.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id} className="px-6 py-4">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-white/10 px-6 py-3">
                    <div className="flex items-center gap-2 text-xs text-white/50">
                        <span>
                            Page {table.getState().pagination.pageIndex + 1} of{' '}
                            {table.getPageCount() || 1}
                        </span>
                        <span className="hidden sm:inline-block">
                            ({table.getPrePaginationRowModel().rows.length} total users)
                        </span>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog Overlay */}
            {isOpenDialog && userToModify && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
                        <h3 className="mb-2 text-xl font-bold text-white">
                            {userToModify.is_banned ? 'Activate' : 'Ban'} User
                        </h3>
                        <p className="mb-6 text-sm text-white/70">
                            Are you sure you want to {userToModify.is_banned ? 'activate' : 'ban'} the user <strong>{userToModify.email}</strong>?
                            {!userToModify.is_banned && " They will be immediately logged out and unable to access the platform."}
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsOpenDialog(false)}
                                disabled={isUpdating}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmToggleBan}
                                disabled={isUpdating}
                                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 flex items-center gap-2 ${userToModify.is_banned
                                        ? 'bg-green-600 hover:bg-green-500'
                                        : 'bg-red-600 hover:bg-red-500'
                                    }`}
                            >
                                {isUpdating && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                                Confirm {userToModify.is_banned ? 'Activation' : 'Ban'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
