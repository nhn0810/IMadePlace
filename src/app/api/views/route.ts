import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// We use the admin/service_role client here because normal users (guests) MIGHT be blocked from updating posts by RLS.
// View tracking should bypass RLS safely.
export async function POST(request: Request) {
  try {
    const { postId } = await request.json()
    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Use service role to bypass RLS for views
    
    // Create standard supabase-js client to bypass RLS tracking
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get current view_count
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('view_count')
      .eq('id', postId)
      .single()
      
    if (fetchError || !post) throw new Error('Post not found')

    // Increment
    const { error: updateError } = await supabase
      .from('posts')
      .update({ view_count: (post.view_count || 0) + 1 })
      .eq('id', postId)

    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('View Tracking Error:', error)
    return NextResponse.json({ error: 'Failed to increment view' }, { status: 500 })
  }
}
