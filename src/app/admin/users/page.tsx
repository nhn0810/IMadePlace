import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, ShieldAlert, ShieldCheck, Mail, ArrowLeft } from 'lucide-react'

export default async function AdminUsersDashboardPage() {
  const supabase = await createClient()

  // 1. Check Auth 
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect('/login')
  }

  // 2. Check if user is Master or Admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', session.user.id)
    .single()

  if (!profile || (profile.role !== 'master' && profile.role !== 'admin')) {
    redirect('/') // Block unauthorized access
  }

  // 3. Fetch all users
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const isMaster = profile.role === 'master'

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <header className="mb-8 flex items-center justify-between pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3 text-slate-500 mb-2">
            <Link href="/" className="hover:text-slate-900 transition-colors flex items-center gap-1 text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> 홈으로
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-emerald-500" />
            사용자 관리
          </h1>
          <p className="text-slate-500 mt-2">시스템에 등록된 모든 사용자를 조회하고 권한을 관리합니다.</p>
        </div>
        <div className="bg-slate-100 px-4 py-2 rounded-xl text-sm font-bold text-slate-700 uppercase tracking-widest border border-slate-200 shadow-sm">
           {isMaster ? '운영자 권한 (최고 관리자)' : '개발자 권한 (일반 관리자)'}
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-4 px-6 font-semibold text-slate-700 text-sm">사용자 정보</th>
                <th className="py-4 px-6 font-semibold text-slate-700 text-sm">권한 (Role)</th>
                <th className="py-4 px-6 font-semibold text-slate-700 text-sm">가입일</th>
                <th className="py-4 px-6 font-semibold text-slate-700 text-sm">상태</th>
                <th className="py-4 px-6 font-semibold text-slate-700 text-sm text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users?.map(user => {
                const isBanned = user.banned_until && new Date(user.banned_until) > new Date()
                
                return (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold bg-slate-200">
                              {user.display_name?.[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{user.display_name}</div>
                          <div className="text-sm text-slate-500 truncate">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                        user.role === 'master' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {user.role === 'master' ? '운영자' : user.role === 'admin' ? '개발자' : user.role === 'user' ? '사용자' : '게스트'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      {isBanned ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-rose-700 bg-rose-100">
                            <ShieldAlert className="w-3.5 h-3.5" /> 차단됨
                          </span>
                          {user.banned_until === '9999-12-31T23:59:59.999Z' ? (
                            <span className="text-xs text-rose-500 font-medium">영구 정지</span>
                          ) : (
                            <span className="text-xs text-rose-500 font-medium">~{new Date(user.banned_until).toLocaleDateString()} 까지</span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-emerald-700 bg-emerald-100">
                          <ShieldCheck className="w-3.5 h-3.5" /> 정상
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          href={`/messages/${user.id}`}
                          className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="메시지 보내기"
                        >
                          <Mail className="w-4 h-4" />
                        </Link>
                        <Link 
                          href={`/admin/users/${user.id}`}
                          className="px-4 py-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                        >
                          상세 관리
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
              
              {!users || users.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Users className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                    등록된 사용자가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
