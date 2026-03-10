import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShieldAlert, ShieldCheck, Mail, AlertTriangle, UserCheck, Trash2 } from 'lucide-react'
import { revalidatePath } from 'next/cache'

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const resolvedParams = await params
  const { id: targetUserId } = resolvedParams
  const supabase = await createClient()

  // 1. Auth & Admin Verify
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', session.user.id)
    .single()

  if (!currentProfile || !['master', 'admin'].includes(currentProfile.role)) {
    redirect('/')
  }

  const isMaster = currentProfile.role === 'master'

  // 2. Fetch Target User Data
  const { data: targetUser } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', targetUserId)
    .single()

  if (!targetUser) return <div className="p-10 text-center">User not found</div>

  // 3. Server Actions for Admin Controls
  async function updateUserRole(formData: FormData) {
    'use server'
    const newRole = formData.get('role') as string
    const targetId = formData.get('targetId') as string
    
    // Security check again
    const supabaseAction = await createClient()
    const { data: { session: actionSession } } = await supabaseAction.auth.getSession()
    if (!actionSession) return

    const { data: actorProfile } = await supabaseAction.from('profiles').select('role').eq('id', actionSession.user.id).single()
    if (actorProfile?.role !== 'master') return // Only Master can change roles like this for now
    
    const adminClient = createAdminClient()
    await adminClient.from('profiles').update({ role: newRole }).eq('id', targetId)
    revalidatePath(`/admin/users/${targetId}`)
  }

  async function banUser(formData: FormData) {
    'use server'
    const days = parseInt(formData.get('days') as string)
    const reason = formData.get('reason') as string
    const targetId = formData.get('targetId') as string
    
    const supabaseAction = await createClient()
    const { data: actorProfile } = await supabaseAction.from('profiles').select('role').eq('id', (await supabaseAction.auth.getSession()).data.session!.user.id).single()
    if (actorProfile?.role !== 'master') return

    let bannedUntil = null
    if (days === 9999) {
      bannedUntil = '9999-12-31T23:59:59.999Z' // Permanent
    } else if (days > 0) {
      const date = new Date()
      date.setDate(date.getDate() + days)
      bannedUntil = date.toISOString()
    }

    const adminClient = createAdminClient()
    await adminClient.from('profiles').update({ 
      banned_until: bannedUntil,
      ban_reason: bannedUntil ? reason : null
    }).eq('id', targetId)

    revalidatePath(`/admin/users/${targetId}`)
    revalidatePath('/admin/users')
  }

  const isBanned = targetUser.banned_until && new Date(targetUser.banned_until) > new Date()

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Link href="/admin/users" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 font-medium transition-colors">
        <ArrowLeft className="w-4 h-4" /> 목록으로 돌아가기
      </Link>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8 p-8 relative">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-full border-4 border-slate-50 shadow-sm bg-slate-100 overflow-hidden flex-shrink-0">
            {targetUser.avatar_url ? (
              <img src={targetUser.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full text-slate-400 flex items-center justify-center text-3xl font-bold bg-slate-200">
                {targetUser.display_name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">{targetUser.display_name}</h1>
              <span className={`px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase tracking-widest ${
                targetUser.role === 'master' ? 'bg-purple-100 text-purple-700' :
                targetUser.role === 'admin' ? 'bg-blue-100 text-blue-700' : ''
              }`}>
                {targetUser.role === 'master' ? '운영자' : targetUser.role === 'admin' ? '개발자' : targetUser.role === 'user' ? '사용자' : '게스트'}
              </span>
              {isBanned && (
                <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> 정지 상태
                </span>
              )}
            </div>
            <p className="text-slate-500 mb-4">{targetUser.email}</p>
            <div className="flex gap-2">
               <Link href={`/messages/${targetUser.id}`} className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2">
                 <Mail className="w-4 h-4" /> 1:1 메시지 
               </Link>
            </div>
          </div>
        </div>

        {/* Ban Info Panel */}
        {isBanned && (
          <div className="mt-8 bg-rose-50 border border-rose-100 rounded-2xl p-5 flex items-start gap-4">
            <div className="bg-rose-100 p-2 rounded-full text-rose-600 mt-0.5">
               <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-rose-900 mb-1">계정 이용 제한 중</h3>
              <p className="text-sm text-rose-700 mb-1">사유: <span className="font-medium">{targetUser.ban_reason || '사유 미기재'}</span></p>
              <p className="text-xs text-rose-500">제한 기한: {targetUser.banned_until === '9999-12-31T23:59:59.999Z' ? '영구 정지' : new Date(targetUser.banned_until).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      {isMaster && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Role Management Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              권한 관리
            </h2>
            <form action={updateUserRole} className="space-y-4">
              <input type="hidden" name="targetId" value={targetUser.id} />
              <select name="role" defaultValue={targetUser.role} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                <option value="user">사용자 (User)</option>
                <option value="admin">개발자 (Admin) - 관리자 부여</option>
                <option value="master">운영자 (Master) - 최고 권한 양도</option>
              </select>
              <button type="submit" className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors">
                권한 변경 적용
              </button>
              {targetUser.role === 'master' && (
                <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg mt-2">
                  경고: 운영자 권한을 양도하면 본 계정은 더 이상 모든 관리 기능을 사용할 수 없게 될 수 있습니다.
                </p>
              )}
            </form>
          </div>

          {/* Ban Management Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 border-t-4 border-t-rose-500">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-rose-500" />
              계정 제재 조치
            </h2>
            <form action={banUser} className="space-y-4">
              <input type="hidden" name="targetId" value={targetUser.id} />
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">제재 기간</label>
                <select name="days" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm">
                  <option value="0">제재 해제 (정상화)</option>
                  <option value="1">1일 (24시간) 차단</option>
                  <option value="3">3일 차단</option>
                  <option value="7">7일 차단</option>
                  <option value="30">30일 차단</option>
                  <option value="9999">영구 차단</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">사유 (선택)</label>
                <input type="text" name="reason" placeholder="운영 원칙 위반 등" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm" />
              </div>

              <button type="submit" className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" />
                제재 실행 / 해제
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
