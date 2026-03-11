import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export default async function SetupProfilePage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', session.user.id)
    .single()

  if (existingProfile) redirect('/') // Already setup

  async function createProfile(formData: FormData) {
    'use server'
    const nickname = formData.get('nickname') as string
    if (!nickname || nickname.trim().length < 2) return

    const supabaseAuth = await createClient()
    const { data: { session: currentSession } } = await supabaseAuth.auth.getSession()
    if (!currentSession) return

    const adminClient = createAdminClient()
    
    // Check if first user
    const { data: anyProfile } = await adminClient.from('profiles').select('id').limit(1)
    const role = (!anyProfile || anyProfile.length === 0) ? 'master' : 'user'

    const meta = currentSession.user.user_metadata || {}
    const avatarUrl = meta.avatar_url || meta.picture || ''

    await adminClient.from('profiles').insert({
      id: currentSession.user.id,
      email: currentSession.user.email,
      display_name: nickname.trim(),
      avatar_url: avatarUrl,
      role: role,
      auto_login_consent: false
    })
    
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">거의 다 왔습니다!</h1>
          <p className="text-slate-500">플랫폼에서 사용할 닉네임을 설정해주세요.</p>
        </div>

        <form action={createProfile} className="space-y-6">
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-slate-700 mb-2">
              닉네임 (최소 2자 이상)
            </label>
            <input
              type="text"
              id="nickname"
              name="nickname"
              required
              minLength={2}
              maxLength={20}
              autoComplete="off"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-900"
              placeholder="예: 홍길동"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors shadow-sm"
          >
            시작하기
          </button>
        </form>
      </div>
    </div>
  )
}
