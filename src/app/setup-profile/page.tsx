import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SetupProfileForm } from './SetupProfileForm'

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">거의 다 왔습니다!</h1>
          <p className="text-slate-500">플랫폼에서 사용할 닉네임을 설정해주세요.</p>
        </div>

        <SetupProfileForm />
      </div>
    </div>
  )
}
