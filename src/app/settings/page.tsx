import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserX, AlertTriangle, ShieldCheck, Settings } from 'lucide-react'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!profile) {
    redirect('/setup-profile')
  }

  // Check if there are ANY masters in the system
  const { count: masterCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'master')

  const canClaimMaster = masterCount === 0 && profile.role === 'user'

  // Fetch blocked users
  const { data: blockedUsers } = await supabase
    .from('blocks')
    .select(`
      blocked_id,
      profiles:blocked_id (display_name, email, avatar_url)
    `)
    .eq('blocker_id', session.user.id)

  async function unblockUser(formData: FormData) {
    'use server'
    const targetId = formData.get('targetId') as string
    const s = await createClient()
    const { data: { session: ssn } } = await s.auth.getSession()
    if (!ssn) return

    await s.from('blocks').delete().eq('blocker_id', ssn.user.id).eq('blocked_id', targetId)
    revalidatePath('/settings')
  }

  async function claimMasterAction() {
    'use server'
    const s = await createClient()
    const { data: { session: ssn } } = await s.auth.getSession()
    if (!ssn) return

    // Verify 0 masters again
    const { count } = await s.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'master')
    if (count === 0) {
      await s.from('profiles').update({ role: 'master' }).eq('id', ssn.user.id)
    }
    revalidatePath('/settings')
    revalidatePath('/')
  }

  async function deleteAccountAction() {
    'use server'
    const s = await createClient()
    const { data: { session: ssn } } = await s.auth.getSession()
    if (!ssn) return

    // For personal implementation: cascade delete everything via profiles if constraints allow,
    // Note: this deletes the public profile, posts, comments, blocks, likes (if set to cascade).
    // It will log the user out because the profile is missing next time.
    await s.from('profiles').delete().eq('id', ssn.user.id)
    
    // Attempt Admin Auth Deletion if Service Key exists (optional)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceKey && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // Direct REST call to delete auth user using service role
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${ssn.user.id}`, {
        method: 'DELETE',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        }
      })
    }

    await s.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 bg-white min-h-screen">
      <header className="mb-8 flex items-center justify-between pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-slate-400" />
            계정 설정
          </h1>
          <p className="text-slate-500 mt-2">내 계정 정보와 차단 목록, 권한 등을 관리합니다.</p>
        </div>
      </header>

      <div className="space-y-8">
        {/* Profile Info Summary */}
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex items-center gap-6">
          <div className="w-16 h-16 bg-white rounded-full border border-slate-200 shadow-sm overflow-hidden">
            {profile.avatar_url ? (
               <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
               <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-xl bg-emerald-50 text-emerald-600">
                 {profile.display_name?.[0]?.toUpperCase() || 'U'}
               </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{profile.display_name}</h2>
            <div className="text-slate-500">{profile.email}</div>
            <div className="mt-2 text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 inline-block uppercase tracking-wider">
              {profile.role === 'master' ? '운영자 (최고 관리자)' : profile.role === 'admin' ? '개발자 (관리자)' : '사용자'}
            </div>
          </div>
        </div>

        {/* Claim Master (First User Fallback) */}
        {canClaimMaster && (
          <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200">
            <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5" />
              최초 로그인 (관리자 권한 받기)
            </h3>
            <p className="text-emerald-700 text-sm mb-4">
              현재 시스템에 등록된 최고 운영자가 없습니다. 버튼을 눌러 운영자 권한을 즉시 발급받으세요.
            </p>
            <form action={claimMasterAction}>
              <button className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors">
                운영자 권한 가져오기
              </button>
            </form>
          </div>
        )}

        {/* Block List */}
        <section>
          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <UserX className="w-5 h-5 text-slate-400" />
            차단된 사용자 목록
          </h3>
          <div className="bg-white border text-sm border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
            {blockedUsers?.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                차단한 사용자가 없습니다.
              </div>
            ) : (
              blockedUsers?.map((block: any) => (
                <div key={block.blocked_id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden">
                      {block.profiles?.avatar_url ? (
                        <img src={block.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full text-slate-400 flex items-center justify-center font-bold bg-slate-200 text-xs">
                          {block.profiles?.display_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{block.profiles?.display_name}</div>
                      <div className="text-slate-400 text-xs">{block.profiles?.email}</div>
                    </div>
                  </div>
                  <form action={unblockUser}>
                    <input type="hidden" name="targetId" value={block.blocked_id} />
                    <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors">
                      차단 해제
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Account Deletion */}
        <section className="mt-12 pt-8 border-t border-slate-200">
          <div className="bg-rose-50 rounded-2xl p-6 border border-rose-200 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-bold text-rose-900 flex items-center justify-center sm:justify-start gap-2 mb-2">
                <AlertTriangle className="w-5 h-5" />
                회원 탈퇴 (위험)
              </h3>
              <p className="text-rose-700 text-sm">
                탈퇴 시 작성한 게시글, 댓글, 설정 등 <b>모든 데이터가 즉시 삭제되며 절대 복구할 수 없습니다.</b> 계속하시겠습니까?
              </p>
            </div>
            <form action={deleteAccountAction}>
              <button className="px-5 py-2.5 whitespace-nowrap bg-rose-600 hover:bg-rose-700 text-rose-50 rounded-xl text-sm font-bold transition-colors shadow-sm">
                회원 탈퇴하기
              </button>
            </form>
          </div>
        </section>

      </div>
    </div>
  )
}
