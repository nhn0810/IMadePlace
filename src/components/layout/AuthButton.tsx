'use client'

import { createClient } from '@/lib/supabase/client'
import { LogOut, LogIn } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function AuthButton({ user }: { user: any }) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  if (user) {
    return (
      <div className="flex items-center justify-between pb-6 border-b border-slate-200">
        <Link 
          href="/profile" 
          className="flex flex-col min-w-0 flex-1 hover:bg-slate-50 p-2 rounded-xl transition-colors -ml-2 group cursor-pointer"
        >
          <span className="text-sm font-bold text-slate-900 truncate group-hover:text-emerald-500 transition-colors">
            {user.display_name || user.email}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {user.role === 'master' ? '운영자' : user.role === 'admin' ? '개발자' : user.role === 'user' ? '사용자' : '게스트'}
          </span>
        </Link>
        <button
          onClick={handleSignOut}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0 z-10 ml-2"
          title="로그아웃"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="pb-6 border-b border-slate-200">
      <button
        onClick={() => router.push('/login')}
        className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white hover:bg-slate-800 py-2.5 px-4 rounded-xl font-medium transition-colors text-sm"
      >
        <LogIn className="w-4 h-4" />
        로그인
      </button>
    </div>
  )
}
