import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Megaphone, Send } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!myProfile || !['master', 'admin'].includes(myProfile.role)) {
    redirect('/')
  }

  async function broadcastAnnouncement(formData: FormData) {
    'use server'
    const s = await createClient()
    const { data: { session: ssn } } = await s.auth.getSession()
    
    if (!ssn) return
    
    // Verify role again securely
    const { data: profile } = await s.from('profiles').select('role').eq('id', ssn.user.id).single()
    if (!profile || !['master', 'admin'].includes(profile.role)) return

    const content = formData.get('content') as string
    if (!content || !content.trim()) return

    // Insert global notification (user_id = null)
    await s.from('notifications').insert({
      user_id: null,
      sender_id: ssn.user.id,
      type: 'announcement',
      content: content.trim(),
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 h-screen overflow-y-auto">
      <header className="mb-10 pb-6 border-b border-slate-200">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Megaphone className="w-8 h-8 text-rose-500" />
          공지사항 발송
        </h1>
        <p className="text-slate-500 mt-2">모든 사용자에게 즉시 전송되는 전체 공지를 작성합니다.</p>
      </header>

      <form action={broadcastAnnouncement} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative group focus-within:ring-2 focus-within:ring-rose-500/20 focus-within:border-rose-400 transition-all">
        <label className="block text-sm font-bold text-slate-700 mb-2">공지 내용</label>
        <textarea 
          name="content"
          required
          placeholder="시스템 점검 안내, 새로운 기능 추가 등 중요한 소식을 전하세요..."
          className="w-full h-40 bg-slate-50 border-none rounded-xl p-4 resize-none outline-none text-slate-800 placeholder:text-slate-400"
        />
        <div className="flex justify-end mt-4">
          <button 
            type="submit"
            className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" />
            전체 발송
          </button>
        </div>
      </form>
    </div>
  )
}
