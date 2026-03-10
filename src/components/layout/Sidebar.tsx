import { createClient } from '@/lib/supabase/server'
import { SidebarClient } from './SidebarClient'

export async function Sidebar() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  let profile = null;
  if (session) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    profile = data
  }

  return <SidebarClient profile={profile} />
}
