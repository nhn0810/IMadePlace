'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Users } from 'lucide-react'

export function ParticipateButton({ postId, userId, initialJoined }: { postId: string, userId: string, initialJoined: boolean }) {
  const [isJoined, setIsJoined] = useState(initialJoined)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const toggleParticipation = async () => {
    setIsLoading(true)
    
    if (isJoined) {
      if (confirm('신청을 취소하시겠습니까?')) {
        const { error } = await supabase.from('project_participants').delete().match({ post_id: postId, user_id: userId })
        if (!error) setIsJoined(false)
      }
    } else {
      if (confirm('이 프로젝트에 참여를 신청하시겠습니까?')) {
        const { error } = await supabase.from('project_participants').insert({ post_id: postId, user_id: userId })
        if (!error) setIsJoined(true)
        else alert('오류가 발생했습니다: ' + error.message)
      }
    }
    
    setIsLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={toggleParticipation}
      disabled={isLoading}
      className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm
        ${isJoined 
          ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' 
          : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:-translate-y-0.5'
        }
      `}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Users className="w-5 h-5" />
      )}
      {isJoined ? '참여 신청 취소하기' : '이 프로젝트에 참여하기'}
    </button>
  )
}
