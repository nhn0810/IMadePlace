import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ResumeForm } from '@/components/profile/ResumeForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ResumeSettingsPage() {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!profile) {
    redirect('/setup-profile')
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-6">
      <ResumeForm initialData={profile} />
    </div>
  )
}
