import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

type ForgotPasswordRequestBody = {
  email?: string
}

function resolveOrigin(request: Request) {
  const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (envSiteUrl) {
    return envSiteUrl.replace(/\/$/, '')
  }

  const forwardedProto = request.headers.get('x-forwarded-proto')
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }

  const host = request.headers.get('host')
  if (host) {
    const protocol = request.headers.get('x-forwarded-proto') ?? 'http'
    return `${protocol}://${host}`
  }

  return new URL(request.url).origin
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { message: 'Server auth configuration is missing.' },
      { status: 500 },
    )
  }

  let body: ForgotPasswordRequestBody
  try {
    body = (await request.json()) as ForgotPasswordRequestBody
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const email = body.email?.trim() ?? ''
  if (!email || email.length > 50) {
    return NextResponse.json(
      { message: 'Please provide a valid email address.' },
      { status: 400 },
    )
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const origin = resolveOrigin(request)
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  })

  if (error) {
    return NextResponse.json(
      { message: 'Unable to send reset link right now. Please try again.' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    message: 'If an account exists for that email, a reset link has been sent.',
  })
}
