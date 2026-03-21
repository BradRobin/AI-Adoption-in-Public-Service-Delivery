import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const ConsentSchema = z.object({
  anonymous_id: z.uuid(),
  analytics: z.boolean(),
  chatHistory: z.boolean(),
})

export const runtime = 'nodejs'

export async function POST(req: Request) {
  let body: z.infer<typeof ConsentSchema>

  try {
    const json = await req.json()
    body = ConsentSchema.parse(json)
  } catch {
    return NextResponse.json({ error: 'Invalid consent payload.' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Missing Supabase credentials.' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { error } = await supabase
    .from('anonymous_consents')
    .upsert(
      {
        anonymous_id: body.anonymous_id,
        consent_analytics: body.analytics,
        consent_chat_history: body.chatHistory,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'anonymous_id' },
    )

  if (error) {
    return NextResponse.json({ error: 'Failed to persist consent.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
