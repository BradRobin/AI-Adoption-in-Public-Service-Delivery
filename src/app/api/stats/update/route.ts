import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Mock Data Source - In a real app, this would fetch from an external API or RSS feed
const MOCK_DATA = [
    {
        id: 'ai_adoption_rate',
        label: 'Kenya AI Adoption',
        value: '42.8%', // Slightly updated to show change
        source: 'Simulated KEPSA Report 2025 (Updated)',
    },
    {
        id: 'policy_update',
        label: 'Latest Policy',
        value: 'AI Bill Passed First Reading',
        source: 'Kenya Parliament News',
    },
]

export const runtime = 'edge'

export async function GET(req: Request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Fetch current stats
    const { data: currentStats } = await supabase.from('market_stats').select('*')

    // 2. Check if update is needed (simple random simulate or time-based)
    // For demo: Always try to update one field randomly to simulate "Live" changes
    // In production: Check `updated_at` < Now - 24h

    const randomUpdate = Math.random() > 0.5 ? MOCK_DATA[0] : MOCK_DATA[1]

    // 3. Upsert the new data
    const { error } = await supabase
        .from('market_stats')
        .upsert({
            ...randomUpdate,
            updated_at: new Date().toISOString(),
        })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
        message: 'Stats checked/updated',
        updated: randomUpdate.id
    })
}
