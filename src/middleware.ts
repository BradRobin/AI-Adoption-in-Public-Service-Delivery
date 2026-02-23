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

    // Protect the /admin route
    if (request.nextUrl.pathname.startsWith('/admin')) {
        if (!user) {
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
            // Logged in but not an admin, redirect to dashboard
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
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
