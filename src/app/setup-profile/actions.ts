'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createProfile(formData: FormData) {
  const nickname = formData.get('nickname') as string
  if (!nickname || nickname.trim().length < 2) {
    return { error: '닉네임은 최소 2글자 이상이어야 합니다.' }
  }

  const supabaseAuth = await createClient()
  const { data: { session: currentSession } } = await supabaseAuth.auth.getSession()
  if (!currentSession) {
    return { error: '세션이 만료되었습니다. 다시 로그인해주세요.' }
  }

  const adminClient = createAdminClient()
  
  // Check for uniqueness
  const { data: existingUser } = await adminClient
    .from('profiles')
    .select('id')
    .eq('display_name', nickname.trim())
    .maybeSingle()

  if (existingUser && existingUser.id !== currentSession.user.id) {
    return { error: '이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요.' }
  }

  // Check if first user
  const { data: anyProfile } = await adminClient.from('profiles').select('id').limit(1)
  const role = (!anyProfile || anyProfile.length === 0) ? 'master' : 'user'

  const meta = currentSession.user.user_metadata || {}
  const avatarUrl = meta.avatar_url || meta.picture || ''

  // Using upsert in case a profile row magically exists but display_name was null
  const { error: insertError } = await adminClient.from('profiles').upsert({
    id: currentSession.user.id,
    email: currentSession.user.email,
    display_name: nickname.trim(),
    avatar_url: avatarUrl,
    role: role,
    auto_login_consent: false
  }, { onConflict: 'id' })

  if (insertError) {
    return { error: '프로필 생성 중 오류가 발생했습니다: ' + insertError.message }
  }
  
  // Handle Auto-Login Consent Cookie from login page
  const cookieStore = await cookies()
  const consentCookie = cookieStore.get('temp_auto_login_consent')
  
  if (consentCookie) {
    const consent = consentCookie.value === 'true'
    await adminClient
      .from('profiles')
      .update({ auto_login_consent: consent })
      .eq('id', currentSession.user.id)
      
    cookieStore.delete('temp_auto_login_consent')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
