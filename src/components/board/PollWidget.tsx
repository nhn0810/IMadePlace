'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PieChart, CheckCircle2 } from 'lucide-react'

type PollOption = {
  id: string
  text: string
}

type PollWidgetProps = {
  postId: string
  blockId: string
  poll: {
    question: string
    options: PollOption[]
    endDate?: string
  }
}

export function PollWidget({ postId, blockId, poll }: PollWidgetProps) {
  const [votes, setVotes] = useState<{ option_id: string, user_id: string }[]>([])
  const [myVote, setMyVote] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isVoting, setIsVoting] = useState(false)
  
  const supabase = createClient()
  
  const isClosed = poll.endDate ? new Date(poll.endDate) < new Date() : false
  const totalVotes = votes.length

  useEffect(() => {
    fetchVotes()
  }, [postId, blockId])

  async function fetchVotes() {
    setIsLoading(true)
    const { data: voteData } = await supabase
      .from('poll_votes')
      .select('option_id, user_id')
      .eq('post_id', postId)
      .eq('block_id', blockId)
      
    if (voteData) {
      setVotes(voteData)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const userVote = voteData.find(v => v.user_id === session.user.id)
        if (userVote) setMyVote(userVote.option_id)
      }
    }
    setIsLoading(false)
  }

  async function handleVote(optionId: string) {
    // Lock vote if closed, currently voting, or already voted
    if (isClosed || isVoting || myVote) return
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      alert('투표하려면 로그인이 필요합니다.')
      return
    }

    setIsVoting(true)
    
    // Only insert new vote since changing/canceling is disabled
    const { error } = await supabase.from('poll_votes').insert({
      post_id: postId,
      block_id: blockId,
      option_id: optionId,
      user_id: session.user.id
    })
    
    if (!error) {
      setMyVote(optionId)
      setVotes(prev => [
        ...prev, 
        { option_id: optionId, user_id: session.user.id }
      ])
    } else {
      alert('투표 중 오류가 발생했습니다.')
    }
    
    setIsVoting(false)
  }

  const getPercentage = (optionId: string) => {
    if (totalVotes === 0) return 0
    const count = votes.filter(v => v.option_id === optionId).length
    return Math.round((count / totalVotes) * 100)
  }

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-slate-50/80 border border-slate-100 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm font-bold text-emerald-600 bg-emerald-100/50 px-3 py-1 rounded-full flex items-center gap-1.5">
          <PieChart className="w-4 h-4" /> 투표
        </span>
        {poll.endDate && (
          <span className={`text-xs font-semibold px-3 py-1 border rounded-full shadow-sm ${isClosed ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-white text-emerald-600 border-emerald-100'}`}>
            {isClosed ? '마감됨' : `마감: ${new Date(poll.endDate).toLocaleDateString()}`}
          </span>
        )}
      </div>
      
      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-8">{poll.question}</h3>
      
      {isLoading ? (
        <div className="animate-pulse flex flex-col gap-3">
          <div className="h-14 bg-slate-200 rounded-xl"></div>
          <div className="h-14 bg-slate-200 rounded-xl"></div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {poll.options?.map((opt) => {
            const isSelected = myVote === opt.id
            const percentage = getPercentage(opt.id)
            const showResults = true // Always show results bar chart
            
            return (
              <button 
                key={opt.id} 
                onClick={() => handleVote(opt.id)}
                disabled={isClosed || isVoting || myVote !== null}
                className={`text-left px-5 py-4 w-full relative overflow-hidden transition-all rounded-xl font-medium shadow-sm border
                  ${isSelected 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500' 
                    : 'border-slate-200 bg-white hover:border-emerald-300 text-slate-700'
                  }
                  ${(isClosed || myVote !== null) ? 'cursor-default opacity-90' : 'cursor-pointer hover:shadow-md'}
                `}
              >
                {/* Result Bar */}
                {showResults && (
                  <div 
                    className={`absolute inset-y-0 left-0 transition-all duration-700 ease-in-out ${isSelected ? 'bg-emerald-200/50' : 'bg-slate-100/80'}`}
                    style={{ width: `${percentage}%` }}
                  />
                )}
                
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    <span>{opt.text}</span>
                  </div>
                  {showResults && (
                    <span className="font-bold text-sm tracking-tight text-slate-600">{percentage}%</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
      
      <div className="text-center text-xs text-slate-500 mt-6 font-medium">
        {totalVotes}명 참여 
        {myVote && !isClosed && ' • 투표가 완료되었습니다 (선택 변경 불가)'}
      </div>
    </div>
  )
}
