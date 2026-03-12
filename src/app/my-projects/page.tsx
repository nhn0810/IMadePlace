'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Target, CalendarDays, Users, Clock, CheckCircle2, UserMinus, LogOut, Loader2, MessageSquare, X as CloseIcon } from 'lucide-react'
import { ApplicantList } from '@/components/board/ApplicantList'
import { ChatRoom } from '@/components/messages/ChatRoom'

export default function MyProjectsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'recruiting'
  const [user, setUser] = useState<any>(null)
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/?login=true')
        return
      }
      setUser(session.user)

      let result: any[] = []

      if (activeTab === 'applying') {
        const { data } = await supabase
          .from('project_participants')
          .select(`
            id, 
            status, 
            created_at,
            post:post_id (
              id, category, title, project_name, recruitment_end_date, created_at, status, post_type,
              profiles:author_id (display_name, avatar_url)
            )
          `)
          .eq('user_id', session.user.id)
          .eq('status', 'waiting')
        result = data || []
      } else if (activeTab === 'recruiting') {
        const { data } = await supabase
          .from('posts')
          .select(`
            *, 
            project_participants (
              id, user_id, status, created_at, 
              profiles (id, display_name, avatar_url)
            )
          `)
          .eq('author_id', session.user.id)
          .eq('post_type', '같이 하자')
          .eq('status', 'waiting')
        result = data || []
      } else if (activeTab === 'in_progress') {
        const { data } = await supabase
          .from('posts')
          .select(`
            *, 
            project_participants (
              id, user_id, status, created_at, 
              profiles (id, display_name, avatar_url)
            )
          `)
          .eq('post_type', '같이 하자')
          .eq('status', 'in_progress')
          .or(`author_id.eq.${session.user.id},collaborator_ids.cs.{"${session.user.id}"}`)
        result = data || []
      } else if (activeTab === 'completed') {
        const { data } = await supabase
          .from('posts')
          .select(`
            *, 
            project_participants (
              id, user_id, status, created_at, 
              profiles (id, display_name, avatar_url)
            )
          `)
          .eq('post_type', '같이 하자')
          .eq('status', 'completed')
          .or(`author_id.eq.${session.user.id},collaborator_ids.cs.{"${session.user.id}"}`)
        result = data || []
      }

      setData(result)
      setIsLoading(false)

      // Auto-clear notifications for this tab
      if (activeTab === 'recruiting') {
        await supabase.from('notifications')
          .delete()
          .match({ user_id: session.user.id, type: 'apply-request' })
      }
    }
    loadData()
  }, [activeTab, supabase, router])

  const handleLeave = async (postId: string) => {
    if (!confirm('정말로 이 프로젝트에서 하차하시겠습니까?')) return
    
    const { error: pError } = await supabase
      .from('project_participants')
      .delete()
      .match({ post_id: postId, user_id: user.id })

    if (pError) {
      alert('하차 처리 중 오류가 발생했습니다.')
      return
    }

    const { data: post } = await supabase.from('posts').select('collaborator_ids').eq('id', postId).single()
    if (post?.collaborator_ids) {
      const newCollabs = post.collaborator_ids.filter((id: string) => id !== user.id)
      await supabase.from('posts').update({ collaborator_ids: newCollabs }).eq('id', postId)
    }

    router.refresh()
    setData(data.filter(item => (item.id !== postId && item.post?.id !== postId)))
  }

  const handleRemoveMember = async (postId: string, memberId: string) => {
     if (!confirm('이 팀원을 프로젝트에서 하차시키겠습니까?')) return

     await supabase.from('project_participants').delete().match({ post_id: postId, user_id: memberId })

     const { data: post } = await supabase.from('posts').select('collaborator_ids').eq('id', postId).single()
     if (post?.collaborator_ids) {
        const newCollabs = post.collaborator_ids.filter((id: string) => id !== memberId)
        await supabase.from('posts').update({ collaborator_ids: newCollabs }).eq('id', postId)
     }

     window.location.reload()
  }

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
      </div>
    )
  }

  const tabs = [
    { id: 'applying', label: '신청 중', icon: Clock },
    { id: 'recruiting', label: '모집 중', icon: Users },
    { id: 'in_progress', label: '진행 중', icon: Target },
    { id: 'completed', label: '완료', icon: CheckCircle2 },
  ]

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.push('/')}
          className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
           <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             <Target className="w-7 h-7 text-emerald-500" />
             나의 프로젝트 관리
           </h1>
           <p className="text-slate-500 mt-1 font-medium text-sm">프로젝트 신청 내역과 모집현황, 진행 상황을 관리합니다.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-8 bg-slate-100 p-1 rounded-2xl">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => router.push(`/my-projects?tab=${tab.id}`)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[13px] transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-emerald-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="space-y-8">
        {data.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <h1 className="text-4xl mb-4 text-slate-300">📂</h1>
            <h3 className="text-lg font-bold text-slate-700 mb-2">항목이 없습니다</h3>
            <p className="text-slate-500 text-sm">해당 카데고리에 활성화된 프로젝트 데이터가 없습니다.</p>
          </div>
        ) : (
          data.map((item: any) => {
            const project = activeTab === 'applying' ? item.post : item
            if (!project) return null
            const applicants = project.project_participants || []
            const acceptedCount = applicants.filter((a: any) => a.status === 'accepted').length
            const isAuthor = project.author_id === user?.id

            return (
              <div key={item.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-emerald-500">
                <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                     <div className="flex-1">
                       <div className="flex items-center gap-2 mb-3 flex-wrap">
                         <span className="text-emerald-700 font-black uppercase tracking-wider text-[10px] bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                           {project.project_name || '이름 없음'}
                         </span>
                         {activeTab === 'applying' && (
                           <span className="text-amber-600 font-bold text-[10px] bg-amber-50 px-3 py-1 rounded-full border border-amber-100">지원 대기 중</span>
                         )}
                         {activeTab === 'recruiting' && (
                           <span className="text-emerald-600 font-bold text-[10px] bg-emerald-50 px-3 py-1 rounded-full animate-pulse border border-emerald-100">팀원 모집 중</span>
                         )}
                         {project.status === 'waiting' && project.recruitment_end_date && (
                           <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${new Date(project.recruitment_end_date) > new Date() ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>
                              {new Date(project.recruitment_end_date) > new Date() ? `~ ${new Date(project.recruitment_end_date).toLocaleDateString()} 까지` : '모집 마감'}
                           </span>
                         )}
                         {project.status === 'waiting' && !project.recruitment_end_date && (
                           <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100">상시 모집</span>
                         )}
                       </div>
                       <Link href={`/board/${project.category}/${project.id}`} className="text-xl sm:text-2xl font-black text-slate-900 hover:text-emerald-600 transition-colors line-clamp-1 block mb-2">
                         {project.title}
                       </Link>
                       {!isAuthor && project.profiles && (
                         <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                            <div className="w-5 h-5 rounded-full bg-slate-200 overflow-hidden">
                                {project.profiles.avatar_url ? <img src={project.profiles.avatar_url} className="w-full h-full object-cover"/> : null}
                            </div>
                            <span>모집자: {project.profiles.display_name}</span>
                         </div>
                       )}
                     </div>

                     <div className="flex items-center gap-2">
                        {project.status === 'in_progress' && (
                          <button 
                            onClick={() => router.push(`/messages/group/${project.id}`)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl text-xs font-bold transition-all shadow-sm"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> 팀 채팅
                          </button>
                        )}
                        <Link href={`/board/${project.category}/${project.id}/edit`} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all">
                          수정
                        </Link>
                        {activeTab === 'in_progress' && !isAuthor && (
                          <button 
                            onClick={() => handleLeave(project.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all"
                          >
                            <LogOut className="w-3.5 h-3.5" /> 프로젝트 하차
                          </button>
                        )}
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-6 mt-4 text-[11px] font-bold text-slate-400">
                     <span className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-emerald-500" /> {new Date(project.created_at).toLocaleDateString()} 작성됨</span>
                     {activeTab !== 'applying' && (
                       <span className="flex items-center gap-2"><Users className="w-4 h-4 text-emerald-500" /> 참여 인원 {acceptedCount}명 (전체 지원 {applicants.length}명)</span>
                     )}
                  </div>
                </div>
                
                {activeTab === 'recruiting' && (
                  <div className="p-6 sm:p-8 bg-slate-50/20">
                     <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between text-sm">
                       팀원 신청 리스트
                       <span className="text-[10px] text-slate-400 font-normal">* 프로젝트 성격에 맞춰 팀원을 선발하세요.</span>
                     </h3>
                     <ApplicantList initialParticipants={applicants} postId={project.id} />
                  </div>
                )}

                {(activeTab === 'in_progress' || activeTab === 'completed') && (
                  <div className="p-6 sm:p-8 bg-white">
                    <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-emerald-500" /> 워킹 중인 팀원
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {applicants.filter((a: any) => a.status === 'accepted').map((member: any) => (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                                {member.profiles?.avatar_url ? <img src={member.profiles.avatar_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-bold">{member.profiles?.display_name?.[0]}</div>}
                              </div>
                              <span className="text-sm font-black text-slate-700">{member.profiles?.display_name}</span>
                              {member.user_id === user.id && <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">ME</span>}
                           </div>
                           {isAuthor && member.user_id !== user.id && activeTab === 'in_progress' && (
                             <button 
                               onClick={() => handleRemoveMember(project.id, member.user_id)}
                               className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                               title="멤버 하차"
                             >
                               <UserMinus className="w-4 h-4" />
                             </button>
                           )}
                        </div>
                      ))}
                      {applicants.filter((a: any) => a.status === 'accepted').length === 0 && (
                        <div className="col-span-full py-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                          아직 참여 중인 팀원이 없습니다.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}
