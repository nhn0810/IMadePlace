import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ChatRoom } from '@/components/messages/ChatRoom'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DMPage({ params }: { params: { userId: string } }) {
  const resolvedParams = await params
  const { userId } = resolvedParams

  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect('/login')
  }


  // Auto-mark messages from this user as read using Service Role
  async function markAsReadAction() {
    'use server'
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const adminClient = (await import('@supabase/supabase-js')).createClient(supabaseUrl, supabaseServiceKey)
    if (!session) return
    await adminClient
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', session.user.id)
      .eq('sender_id', userId)
      .eq('is_read', false)
  }

  // Mark on initial server render
  await markAsReadAction()

  // Fetch target user 
  const { data: otherUser } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (!otherUser) {
    notFound()
  }

  // Fetch my profile to check roles and blocks
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', session.user.id)
    .single()

  // Check blocks
  const { data: iBlockedThem } = await supabase
    .from('blocks')
    .select('id')
    .eq('blocker_id', session.user.id)
    .eq('blocked_id', userId)
    .single()

  const { data: theyBlockedMe } = await supabase
    .from('blocks')
    .select('id')
    .eq('blocker_id', userId)
    .eq('blocked_id', session.user.id)
    .single()

  const canBlockThem = myProfile?.role !== 'guest' && !['master', 'admin'].includes(otherUser.role)
  const isBlockedByThem = theyBlockedMe && !['master', 'admin'].includes(myProfile?.role || 'user')

  async function blockUserAction() {
    'use server'
    const s = await createClient()
    const { data: { session: ssn } } = await s.auth.getSession()
    if (!ssn) return
    await s.from('blocks').insert({ blocker_id: ssn.user.id, blocked_id: userId })
  }

  async function unblockUserAction() {
    'use server'
    const s = await createClient()
    const { data: { session: ssn } } = await s.auth.getSession()
    if (!ssn) return
    await s.from('blocks').delete().eq('blocker_id', ssn.user.id).eq('blocked_id', userId)
  }

  return (
    <div className="max-w-3xl mx-auto h-[100dvh] flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/messages" className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
               {otherUser.avatar_url ? (
                 <img src={otherUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                   {otherUser.display_name?.[0]?.toUpperCase() || 'U'}
                 </div>
               )}
            </div>
            <div>
              <h2 className="font-bold text-slate-900 leading-tight">
                {otherUser.display_name}
                {otherUser.role && !['user', 'guest'].includes(otherUser.role) && (
                   <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider">{otherUser.role === 'master' ? '마스터' : '개발자'}</span>
                )}
              </h2>
              <span className="text-xs text-slate-400">1:1 Secure Chat</span>
            </div>
          </div>
        </div>

        {canBlockThem && (
          <div>
            {iBlockedThem ? (
              <form action={unblockUserAction}>
                <button className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                  차단 해제
                </button>
              </form>
            ) : (
              <form action={blockUserAction}>
                <button className="px-3 py-1.5 text-xs font-bold text-rose-500 hover:text-white bg-rose-50 hover:bg-rose-500 rounded-lg transition-colors">
                  사용자 차단
                </button>
              </form>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 overflow-hidden">
        <ChatRoom 
          currentUserId={session.user.id} 
          otherUserId={otherUser.id} 
          isBlockedByMe={!!iBlockedThem}
          isBlockedByThem={!!isBlockedByThem}
          markAsReadAction={markAsReadAction}
        />
      </main>
    </div>
  )
}
