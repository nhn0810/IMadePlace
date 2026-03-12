'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Users, ShieldAlert, Timer } from 'lucide-react'
import { subDays, formatISO } from 'date-fns'

type Message = {
  id: string
  sender_id: string
  receiver_id: string | null
  room_id: string | null
  content: string
  created_at: string
  is_read?: boolean
  profiles?: { display_name: string, avatar_url: string }
}

export function ChatRoom({ 
  currentUserId, 
  otherUserId, 
  roomId,      
  isBlockedByMe,
  isBlockedByThem,
  isProjectComplete,
  markAsReadAction 
}: { 
  currentUserId: string, 
  otherUserId?: string | null, 
  roomId?: string | null,
  isBlockedByMe?: boolean, 
  isBlockedByThem?: boolean,
  isProjectComplete?: boolean,
  markAsReadAction?: () => Promise<void> 
}) {
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [participants, setParticipants] = useState<any[]>([])
  const [isOtherTyping, setIsOtherTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  
  const activeRoomId = roomId || [currentUserId, otherUserId].sort().join('-')
  const isGroup = !!roomId

  useEffect(() => {
    fetchInitialData()
    if (markAsReadAction) markAsReadAction().catch(console.error)
    if (isGroup) updateReadStatus()

    // 1. Listen for MESSAGES
    const channel = supabase
      .channel(`messages_room_${activeRoomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const m = payload.new
            const isTargetRoom = isGroup 
              ? m.room_id === activeRoomId
              : ((m.sender_id === currentUserId && m.receiver_id === otherUserId) || (m.sender_id === otherUserId && m.receiver_id === currentUserId))

            if (!isTargetRoom) return

            let msgWithProfile = m
            if (m.sender_id !== currentUserId) {
              const { data: profile } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', m.sender_id).single()
              msgWithProfile = { ...m, profiles: profile }
              if (markAsReadAction) markAsReadAction()
              if (isGroup) updateReadStatus()
            }

            setMessages((prev) => {
              if (prev.find(existing => existing.id === m.id)) return prev
              return [...prev, msgWithProfile]
            })
          } else if (payload.eventType === 'UPDATE') {
            const m = payload.new
            setMessages((prev) => prev.map(msg => msg.id === m.id ? { ...msg, is_read: m.is_read } : msg))
          }
        }
      )
      .subscribe()

    // 2. Typing Indicators (Broadcast)
    const typingChannel = supabase.channel(`typing:${activeRoomId}`)
      .on(
        'broadcast',
        { event: 'typing' },
        (payload) => {
          if (payload.payload.userId !== currentUserId) {
             setIsOtherTyping(payload.payload.isTyping)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(typingChannel)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [currentUserId, otherUserId, activeRoomId, isGroup])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function updateReadStatus() {
    if (!isGroup) return
    await supabase.from('chat_room_reads').upsert({ 
      room_id: activeRoomId, 
      user_id: currentUserId, 
      last_read_at: new Date().toISOString() 
    })
  }

  async function fetchInitialData() {
    const twoWeeksAgo = formatISO(subDays(new Date(), 14))
    
    let query = supabase.from('messages').select('*, profiles:sender_id(display_name, avatar_url)')
    if (isGroup) {
      query = query.eq('room_id', activeRoomId)
    } else {
      query = query.or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
    }

    const { data: mData } = await query
      .gte('created_at', twoWeeksAgo)
      .order('created_at', { ascending: true })

    if (mData) setMessages(mData)

    if (isGroup) {
      const { data: post } = await supabase.from('posts').select('author_id, collaborator_ids').eq('id', activeRoomId).single()
      if (post) {
        const allMemberIds = Array.from(new Set([post.author_id, ...(post.collaborator_ids || [])]))
        const { data: pData } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', allMemberIds)
        if (pData) setParticipants(pData)
      }
    }
  }

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)

    supabase.channel(`typing:${activeRoomId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserId, isTyping: true },
    })

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      supabase.channel(`typing:${activeRoomId}`).send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUserId, isTyping: false },
      })
    }, 3000)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isBlockedByMe || isBlockedByThem || isProjectComplete) return

    const content = newMessage.trim()
    setNewMessage('')
    setIsSending(true)

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    supabase.channel(`typing:${activeRoomId}`).send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUserId, isTyping: false },
    })
    
    const payload: any = {
      sender_id: currentUserId,
      content,
    }

    if (isGroup) {
      payload.room_id = activeRoomId
    } else {
      payload.receiver_id = otherUserId
    }

    const { data, error } = await supabase.from('messages').insert(payload).select('*, profiles:sender_id(display_name, avatar_url)').single()

    if (error) {
      alert('메시지 전송 실패: ' + error.message)
      setNewMessage(content) 
    } else if (data) {
      setMessages(prev => [...prev, data])
      if (isGroup) {
        await updateReadStatus()
      }
    }

    setIsSending(false)
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative border-x overflow-hidden">
      <div className="bg-white border-b border-slate-100 p-3 px-6 flex items-center justify-between shadow-sm z-10">
         <div className="flex items-center gap-3">
            {isGroup ? (
              <>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-50">
                   <Users className="w-4 h-4" />
                </div>
                <div>
                   <span className="text-sm font-black text-slate-800">프로젝트 단체 채팅방</span>
                   <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></span>
                      {participants.length}명 참여 중
                   </div>
                </div>
              </>
            ) : (
                <span className="text-sm font-black text-slate-800">1:1 메시지</span>
            )}
         </div>
      </div>

      <div className="bg-amber-50/80 border-b border-amber-100 px-6 py-2 flex items-center gap-2">
         <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
         <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 leading-none">
            본 채팅 내역은 2주 동안만 유지됩니다. 중요한 협업은 디스코드나 슬랙 사용을 권장합니다.
         </span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
             <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <Send className="w-5 h-5 opacity-20" />
             </div>
             <p className="text-xs font-bold">첫 메시지를 보내보세요!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender_id === currentUserId

            return (
              <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} gap-1 mb-4`}>
                {!isMe && isGroup && (
                   <span className="text-[11px] font-black text-slate-400 ml-2 mb-1">{msg.profiles?.display_name || 'Anonymous'}</span>
                )}
                <div 
                  className={`max-w-[75%] w-fit px-4 py-3 rounded-2xl text-[14px] leading-relaxed shadow-md whitespace-pre-wrap break-keep [word-break:keep-all]
                    ${isMe 
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white !rounded-tr-none' 
                      : 'bg-white text-slate-800 border border-slate-100 !rounded-tl-none'
                    }`}
                >
                  {msg.content}
                </div>
              </div>
            )
          })
        )}
        
        {isOtherTyping && (
          <div className="flex justify-start">
             <div className="bg-white border border-slate-100 px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1">
                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></span>
             </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
        {isBlockedByMe ? (
          <div className="text-center p-3 text-xs font-bold text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
            사용자를 차단하여 메시지를 보낼 수 없습니다.
          </div>
        ) : isBlockedByThem ? (
          <div className="text-center p-3 text-xs font-bold text-rose-400 bg-rose-50 rounded-xl border border-rose-100">
            상대방에 의해 차단된 상태입니다.
          </div>
        ) : isProjectComplete ? (
          <div className="text-center p-3 text-xs font-bold text-slate-400 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center gap-2">
            <Timer className="w-3.5 h-3.5" /> 프로젝트가 종료되어 채팅이 비활성화되었습니다.
          </div>
        ) : (
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              placeholder="메시지를 입력하세요..."
              className="w-full bg-slate-100 border-none px-5 py-4 rounded-2xl pr-14 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium text-slate-800 text-sm shadow-inner"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className="absolute right-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all disabled:opacity-50 shadow-md active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
