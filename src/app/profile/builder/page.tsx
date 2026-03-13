import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PortfolioBuilder } from '@/components/profile/PortfolioBuilder'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PortfolioPage() {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect('/login')
  }

  // 1. Fetch Profile for Resume Data (Bio, Skills, History)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!profile) {
    redirect('/setup-profile')
  }

  // 2. Fetch User's Projects for Importing to Portfolio
  // Specifically looking for projects in 'imade' category where they are author
  const { data: projects } = await supabase
    .from('posts')
    .select('*')
    .eq('author_id', session.user.id)
    .eq('category', 'imade')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-slate-900 overflow-hidden">
      <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 z-30 relative">
        <div className="flex items-center gap-4">
          <a href="/profile" className="text-slate-400 hover:text-emerald-500 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </a>
          <h1 className="text-lg font-black text-slate-100 uppercase tracking-tighter flex items-center gap-2">
            <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
            Portfolio Builder v1.0
          </h1>
        </div>
        <div className="flex items-center gap-3">
           <div className="hidden md:flex flex-col items-end">
              <span className="text-xs font-bold text-slate-400">Editing as</span>
              <span className="text-xs text-emerald-500 font-black">{profile.display_name}</span>
           </div>
        </div>
      </header>
      
      <main>
        <PortfolioBuilder profile={profile} userProjects={projects || []} />
      </main>
    </div>
  )
}
