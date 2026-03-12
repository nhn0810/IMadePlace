import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ChatRoom } from '@/components/messages/ChatRoom'
import Link from 'next/link'
import { ArrowLeft, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProjectGroupChatPage({ params }: { params: { id: string } }) {
  const resolvedParams = await params
  const { id: roomId } = resolvedParams

  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect('/login')
  }

  // Fetch project details
  const { data: project } = await supabase
    .from('posts')
    .select('*, profiles:author_id(display_name, avatar_url)')
    .eq('id', roomId)
    .single()

  if (!project) {
    notFound()
  }

  // Check if user is authorized (author or accepted collaborator)
  const isAuthor = project.author_id === session.user.id
  const isCollaborator = project.collaborator_ids?.includes(session.user.id)

  if (!isAuthor && !isCollaborator) {
    // Optionally check project_participants table for 'accepted' status if collaborator_ids is slightly out of sync
    const { data: membership } = await supabase
      .from('project_participants')
      .select('id')
      .eq('post_id', roomId)
      .eq('user_id', session.user.id)
      .eq('status', 'accepted')
      .single()
    
    if (!membership) {
        return (
          <div className="flex flex-col items-center justify-center h-screen gap-4">
             <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8" />
             </div>
             <p className="font-bold text-slate-800">이 프로젝트 채팅방에 참여 권한이 없습니다.</p>
             <Link href="/messages" className="text-emerald-500 font-bold hover:underline">메시지함으로 돌아가기</Link>
          </div>
        )
    }
  }

  // Auto-mark notifications as read
  async function markAsReadAction() {
    'use server'
    const s = await createClient()
    const { data: { session: ssn } } = await s.auth.getSession()
    if (!ssn) return
    await s.from('notifications')
      .delete()
      .match({ user_id: ssn.user.id, project_id: roomId, type: 'group-message' })
  }

  return (
    <div className="max-w-5xl mx-auto h-[100dvh] flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/messages" className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-50">
               <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 leading-tight truncate max-w-[200px] sm:max-w-xs">
                {project.title}
              </h2>
              <span className="text-[10px] sm:text-xs text-slate-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                Team Collaboration Room
              </span>
            </div>
          </div>
        </div>

        <div className="hidden sm:block">
           <Link href={`/board/${project.category}/${project.id}`} className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
              프로젝트 보기
           </Link>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <ChatRoom 
          currentUserId={session.user.id} 
          roomId={roomId}
          isProjectComplete={project.status === 'completed'}
          markAsReadAction={markAsReadAction}
        />
      </main>
    </div>
  )
}
