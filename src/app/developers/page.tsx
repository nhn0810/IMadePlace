import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, MessageSquare } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type UserProfile = {
  id: string
  display_name: string | null
  avatar_url: string | null
  role?: string
}

export default async function DevelopersPage() {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect('/login')
  }

  // Fetch all admins/masters safely by bypassing RLS
  const adminClient = createAdminClient()
  const { data: fetchAdmins } = await adminClient
    .from('profiles')
    .select('id, display_name, avatar_url, role')
    .in('role', ['master', 'admin'])
    .order('role', { ascending: false }) // master first

  const adminUsers = (fetchAdmins as UserProfile[]) || []

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 h-screen overflow-y-auto">
      <header className="mb-10 pb-6 border-b border-slate-200">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Users className="w-8 h-8 text-emerald-500" />
          개발자 목록
        </h1>
        <p className="text-slate-500 mt-2">1:1 문의를 남길 운영자나 개발자를 선택해주세요.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {adminUsers.map(admin => (
          <Link 
            key={admin.id} 
            href={`/messages/${admin.id}`}
            className="flex flex-col items-center p-8 bg-white rounded-3xl border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all group text-center"
          >
            <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 mb-4 border-4 border-white shadow-sm group-hover:scale-105 transition-transform">
              {admin.avatar_url ? (
                 <img src={admin.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                 <div className="w-full h-full flex items-center justify-center text-slate-400 text-3xl font-bold bg-slate-200">
                   {admin.display_name?.[0]?.toUpperCase() || 'U'}
                 </div>
              )}
            </div>
            <h3 className="font-bold text-xl text-slate-900 group-hover:text-emerald-600 transition-colors flex items-center gap-2">
              {admin.display_name}
              {admin.id === session.user.id && (
                <span className="text-emerald-500 text-sm font-bold">(나)</span>
              )}
            </h3>
            <span className={`text-xs px-3 py-1 rounded-full uppercase tracking-wider font-bold mt-3 ${
               admin.role === 'master' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {admin.role === 'master' ? '운영자' : '개발자'}
            </span>
            <div className="mt-6 w-full py-3 rounded-2xl bg-slate-50 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
              <MessageSquare className="w-4 h-4" />
              메시지 보내기
            </div>
          </Link>
        ))}
      </div>
      
      {adminUsers.length === 0 && (
        <div className="text-center py-20 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          등록된 개발자가 없습니다.
        </div>
      )}
    </div>
  )
}
