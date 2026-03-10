import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && session) {
      // 1. Check if Profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single()

      if (!existingProfile) {
        return NextResponse.redirect(`${origin}/setup-profile`)
      }

      // 2. Handle Auto-Login Consent Cookie
      const cookieStore = await cookies()
      const consentCookie = cookieStore.get('temp_auto_login_consent')
      
      if (consentCookie) {
        const consent = consentCookie.value === 'true'
        await supabase
          .from('profiles')
          .update({ auto_login_consent: consent })
          .eq('id', session.user.id)
          
        cookieStore.delete('temp_auto_login_consent')
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
