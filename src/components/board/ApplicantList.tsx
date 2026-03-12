'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, X, Clock, UserIcon, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

type Participant = {
  id: string
  user_id: string
  status: string
  status_message?: string
  created_at: string
  profiles: {
    id: string
    display_name: string
    avatar_url: string
  }
}

export function ApplicantList({ 
  initialParticipants, 
  postId 
}: { 
  initialParticipants: Participant[]
  postId: string 
}) {
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants || [])
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [actionState, setActionState] = useState<{id: string, newStatus: 'accepted' | 'rejected'} | null>(null)
  const [reason, setReason] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClient()

  const openAction = (id: string, newStatus: 'accepted' | 'rejected') => {
    setActionState({ id, newStatus })
    setReason('')
  }

  const cancelAction = () => {
    setActionState(null)
    setReason('')
  }

  const handleUpdateStatus = async () => {
    if (!actionState) return
    const { id: participantId, newStatus } = actionState
    
    // Validate reason
    if (!reason.trim()) {
      alert('수락/거절 사유를 입력해주세요.')
      return
    }

    setLoadingId(participantId)
    
    if (newStatus === 'accepted') {
      // Update participant status and reason
      const { error } = await supabase
        .from('project_participants')
        .update({ status: newStatus, status_message: reason.trim() })
        .eq('id', participantId)

      if (!error) {
         setParticipants(prev => 
           prev.map(p => p.id === participantId ? { ...p, status: newStatus, status_message: reason.trim() } : p)
         )
         
         // Fetch the current post to get collaborator_ids
         const { data: post } = await supabase.from('posts').select('collaborator_ids, title').eq('id', postId).single()
         if (post) {
             const pList = participants.find(p => p.id === participantId)
             const currentIds = post.collaborator_ids || []
             if (pList && !currentIds.includes(pList.user_id)) {
                 await supabase.from('posts').update({
                     collaborator_ids: [...currentIds, pList.user_id]
                 }).eq('id', postId)
             }
         }
      }
    } else {
      // REJECTED: Delete and notify
      const pList = participants.find(p => p.id === participantId)
      if (pList) {
        // 1. Create rejection notification
        const { data: post } = await supabase.from('posts').select('title').eq('id', postId).single()
        await supabase.from('notifications').insert({
          user_id: pList.user_id,
          sender_id: (await supabase.auth.getUser()).data.user?.id,
          type: 'apply-rejected',
          content: `[${post?.title || '프로젝트'}] 신청이 거절되었습니다. 사유: ${reason.trim()}`,
          link: null // Popup handled via notification bell
        })

        // 2. Delete entry
        const { error } = await supabase
          .from('project_participants')
          .delete()
          .eq('id', participantId)

        if (!error) {
          setParticipants(prev => prev.filter(p => p.id !== participantId))
        }
      }
    }

    setLoadingId(null)
    setActionState(null)
    setReason('')
  }

  if (participants.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 bg-slate-50 border border-slate-100 rounded-xl font-medium">
        아직 지원자가 없습니다.
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-transparent data-[open=true]:border-slate-100"
        data-open={isOpen}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">신청자 목록</span>
          <span className="bg-slate-100 text-slate-500 text-xs py-0.5 px-2 rounded-full font-bold">
            {participants.length}
          </span>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>

      {isOpen && (
        <ul className="divide-y divide-slate-100 animate-in slide-in-from-top-2 duration-200">
          {participants.map(p => (
            <li key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-3">
                 <Link href={`/profile/${p.user_id}`} className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity">
                   {p.profiles?.avatar_url ? (
                     <img src={p.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full text-slate-500 flex items-center justify-center font-bold">
                       <UserIcon className="w-5 h-5" />
                     </div>
                   )}
                 </Link>
                 <div>
                    <Link href={`/profile/${p.user_id}`} className="font-bold text-slate-900 hover:text-emerald-600 transition-colors">
                      {p.profiles?.display_name || 'Anonymous'}
                    </Link>
                <div className="flex flex-col gap-1 mt-1">
                   <div className="flex items-center gap-2 text-xs font-medium">
                     <span className="text-slate-400">{new Date(p.created_at).toLocaleDateString()} 지원함</span>
                     <span className={`px-2 py-0.5 rounded-full ${
                       p.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 
                       p.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 
                       'bg-amber-100 text-amber-700'
                     }`}>
                       {p.status === 'accepted' ? '수락됨' : p.status === 'rejected' ? '거절됨' : '대기 중'}
                     </span>
                   </div>
                   {p.status_message && (
                     <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 mt-1">
                       <span className="font-bold mr-1">사유:</span> {p.status_message}
                     </div>
                   )}
                </div>
             </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2 w-full sm:w-auto mt-3 sm:mt-0">
             {loadingId === p.id ? (
               <div className="px-4 py-2"><Loader2 className="w-5 h-5 animate-spin text-emerald-500" /></div>
             ) : actionState?.id === p.id ? (
               <div className="flex flex-col items-end gap-2 w-full sm:w-72 bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm transition-all animate-in fade-in zoom-in-95">
                 <input 
                   type="text" 
                   value={reason}
                   onChange={e => setReason(e.target.value)}
                   placeholder={`${actionState.newStatus === 'accepted' ? '수락' : '거절'} 사유를 입력해주세요...`} 
                   className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                   autoFocus
                 />
                 <div className="flex items-center gap-2">
                   <button onClick={cancelAction} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-md transition-colors">취소</button>
                   <button 
                     onClick={handleUpdateStatus} 
                     className={`px-3 py-1.5 text-xs font-bold text-white rounded-md transition-colors shadow-sm ${actionState.newStatus === 'accepted' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                   >
                     확인
                   </button>
                 </div>
               </div>
             ) : (
               <div className="flex items-center gap-2">
                 {p.status !== 'accepted' && (
                   <button 
                     onClick={() => openAction(p.id, 'accepted')}
                     className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold transition-colors border border-emerald-100/50 shadow-sm"
                   >
                     <Check className="w-4 h-4" /> 수락
                   </button>
                 )}
                 {p.status !== 'rejected' && (
                   <button 
                     onClick={() => openAction(p.id, 'rejected')}
                     className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-sm font-bold transition-colors border border-rose-100/50 shadow-sm"
                   >
                     <X className="w-4 h-4" /> 거절
                   </button>
                 )}
               </div>
             )}
          </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
