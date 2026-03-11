'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, X, Clock, UserIcon, Loader2 } from 'lucide-react'

type Participant = {
  id: string
  user_id: string
  status: string
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
  const supabase = createClient()

  const handleUpdateStatus = async (participantId: string, newStatus: 'accepted' | 'rejected') => {
    setLoadingId(participantId)
    
    // Update participant status
    const { error } = await supabase
      .from('project_participants')
      .update({ status: newStatus })
      .eq('id', participantId)

    if (!error) {
       setParticipants(prev => 
         prev.map(p => p.id === participantId ? { ...p, status: newStatus } : p)
       )
       
       // Handle side-effects (e.g. adding them to the collaborator_ids of the post)
       if (newStatus === 'accepted') {
           // Fetch the current post to get collaborator_ids
           const { data: post } = await supabase.from('posts').select('collaborator_ids').eq('id', postId).single()
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
       alert('상태 업데이트 중 오류가 발생했습니다.')
    }
    setLoadingId(null)
  }

  if (participants.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 bg-slate-50 border border-slate-100 rounded-xl font-medium">
        아직 지원자가 없습니다.
      </div>
    )
  }

  return (
    <ul className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {participants.map(p => (
        <li key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
               {p.profiles?.avatar_url ? (
                 <img src={p.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full text-slate-500 flex items-center justify-center font-bold">
                   <UserIcon className="w-5 h-5" />
                 </div>
               )}
             </div>
             <div>
                <p className="font-bold text-slate-900">{p.profiles?.display_name || 'Anonymous'}</p>
                <div className="flex items-center gap-2 text-xs font-medium mt-1">
                   <span className="text-slate-400">{new Date(p.created_at).toLocaleDateString()} 지원함</span>
                   <span className={`px-2 py-0.5 rounded-full ${
                     p.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 
                     p.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 
                     'bg-amber-100 text-amber-700'
                   }`}>
                     {p.status === 'accepted' ? '수락됨' : p.status === 'rejected' ? '거절됨' : '대기 중'}
                   </span>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-2 self-start sm:self-auto">
             {loadingId === p.id ? (
               <div className="px-4 py-2"><Loader2 className="w-5 h-5 animate-spin text-emerald-500" /></div>
             ) : (
               <>
                 {p.status !== 'accepted' && (
                   <button 
                     onClick={() => handleUpdateStatus(p.id, 'accepted')}
                     className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold transition-colors border border-emerald-100/50 shadow-sm"
                   >
                     <Check className="w-4 h-4" /> 수락
                   </button>
                 )}
                 {p.status !== 'rejected' && (
                   <button 
                     onClick={() => handleUpdateStatus(p.id, 'rejected')}
                     className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-sm font-bold transition-colors border border-rose-100/50 shadow-sm"
                   >
                     <X className="w-4 h-4" /> 거절
                   </button>
                 )}
               </>
             )}
          </div>
        </li>
      ))}
    </ul>
  )
}
