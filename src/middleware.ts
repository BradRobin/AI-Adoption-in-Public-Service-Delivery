/**
 * src/middleware.ts
 * Next.js Middleware for Route Protection
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    // Create an unmodified response client to handle auth state
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Check for global ban status on ANY authenticated route
    if (user) {
        // Query the profile to see if the user is banned
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_banned')
            .eq('id', user.id)
            .single()

        if (profile?.is_banned) {
            // Sign the user out securely
            await supabase.auth.signOut()
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            // Append a query param so the login page can show a specific message if desired
            url.searchParams.set('error', 'banned')
            return NextResponse.redirect(url)
        }
    }

    // Protect the /admin and /api/admin routes
    if (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/api/admin')) {
        if (!user) {
            if (request.nextUrl.pathname.startsWith('/api/admin')) {
                return new NextResponse('Unauthorized: Must be logged in', { status: 401 })
            }
            // User is not logged in, redirect to login
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }

        // Role check logic: We'll assume the role is in user_metadata first
        // Fallback to checking the profile if user_metadata is empty
        let role = user.user_metadata?.role

        if (!role) {
            const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            role = data?.role
        }

        if (role !== 'admin') {
            if (request.nextUrl.pathname.startsWith('/api/admin')) {
                return new NextResponse('Forbidden: Admins Only', { status: 403 })
            }
            // Logged in but not an admin, redirect to dashboard
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }

        // --- Audit Logging ---
        // Log page views if the request is for an HTML page (prevents logging RSC network calls/prefetching twice)
        if (
            request.method === 'GET' &&
            request.nextUrl.pathname.startsWith('/admin') &&
            request.headers.get('accept')?.includes('text/html')
        ) {
            // Log this action asynchronously so it doesn't block the response
            try {
                await supabase.from('admin_logs').insert({
                    admin_id: user.id,
                    action: 'view_page',
                    target_id: request.nextUrl.pathname,
                    details: {
                        search: request.nextUrl.search,
                        userAgent: request.headers.get('user-agent')
                    }
                })
            } catch (e) {
                console.error('Failed to write middleware audit log:', e)
            }
        }
    }

    // Ensure auth context is propagated on all routes
    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
