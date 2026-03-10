import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AuthButton } from './AuthButton'
import { VisitorStats } from './VisitorStats'
import { PenTool, Target, Compass, MessageCircle, ShieldAlert } from 'lucide-react'

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

  const navItems = [
    { name: 'I made', href: '/board/imade', icon: PenTool, description: '결과물 저장소' },
    { name: 'You make', href: '/board/youmake', icon: Target, description: '요청과 의뢰' },
    { name: 'I use', href: '/board/iuse', icon: Compass, description: '사용경험 공유' },
  ]

  return (
    <aside className="w-64 border-r border-slate-200 h-screen sticky top-0 bg-white/50 backdrop-blur-xl flex flex-col p-6 overflow-y-auto">
      <div className="flex-1 flex flex-col outline-none">
        <Link href="/" className="mb-8 block">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Make Place.</h1>
          <p className="text-sm text-slate-500 font-medium">개인 포스팅 플랫폼</p>
        </Link>

        {/* Auth Top */}
        <div className="mb-4">
          <AuthButton user={profile} />
        </div>
        
        {/* Direct Message Link added below profile */}
        {profile && (
          <Link 
            href="/messages"
            className="flex items-center justify-center gap-2 mb-6 w-full py-2 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-xl text-xs font-bold transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Direct Messages
          </Link>
        )}

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors text-slate-500">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-700 group-hover:text-slate-900 leading-none mb-1 text-sm mt-[6px]">
                    {item.name}
                  </div>
                  <div className="text-xs text-slate-400">{item.description}</div>
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Admin Dashboard Link */}
        {profile && (profile.role === 'master' || profile.role === 'admin') && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <Link
              href="/admin/users"
              className="flex items-center justify-center gap-2 w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors shadow-sm"
            >
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              사용자 관리
            </Link>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-slate-200">
          <VisitorStats />
        </div>

        <Link
          href="/developers"
          className="mt-4 w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 py-3 px-4 rounded-xl font-semibold transition-colors text-sm border border-emerald-100/50"
        >
          <MessageCircle className="w-4 h-4" />
          개발자와 1:1 문의
        </Link>

      </div>
    </aside>
  )
}
