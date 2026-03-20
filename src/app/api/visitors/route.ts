import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const shouldIncrement = searchParams.get('increment') === 'true'

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const todayStr = new Date().toISOString().split('T')[0]

    // 1. Get today's row
    const { data: todayRow } = await supabase
      .from('visit_stats')
      .select('total_visits')
      .eq('visit_date', todayStr)
      .single()

    if (shouldIncrement) {
      if (todayRow) {
        // Increment existing
        await supabase
          .from('visit_stats')
          .update({ total_visits: todayRow.total_visits + 1 })
          .eq('visit_date', todayStr)
      } else {
        // Create new day
        await supabase
          .from('visit_stats')
          .insert({ visit_date: todayStr, total_visits: 1 })
      }
    }

    // 2. Compute final actuals after increment
    const { data: finalToday } = await supabase
      .from('visit_stats')
      .select('total_visits')
      .eq('visit_date', todayStr)
      .single()

    const { data: allStats } = await supabase
      .from('visit_stats')
      .select('total_visits')

    const total = allStats ? allStats.reduce((sum, row) => sum + row.total_visits, 0) : 0
    const today = finalToday ? finalToday.total_visits : (shouldIncrement ? 1 : 0)

    return NextResponse.json({ today: today || 0, total: total || 0 })
  } catch (error) {
    console.error('Visitor API Error:', error)
    return NextResponse.json({ today: 0, total: 0 }, { status: 200 })
  }
}
