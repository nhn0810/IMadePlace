'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send } from 'lucide-react'

// Simple notification mock function for the requirement
async function triggerNotification(senderId: string, receiverId: string, message: string) {
  // In a real app, this would call an API route sending an email via SendGrid/Resend 
  // or a Web Push trigger. Since we're frontend only, we just log it.
  console.log(`[Notification Triggered] to ${receiverId}: New message from ${senderId}`)
}

export function ChatRoom({ currentUserId, otherUserId, isBlockedByMe, isBlockedByThem }: { currentUserId: string, otherUserId: string, isBlockedByMe?: boolean, isBlockedByThem?: boolean }) {
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchInitialMessages()

    const channel = supabase
      .channel('messages_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUserId}`
        },
        (payload) => {
          if (payload.new.sender_id === otherUserId) {
            setMessages((prev) => [...prev, payload.new])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${currentUserId}`
        },
        (payload) => {
          if (payload.new.receiver_id === otherUserId) {
            setMessages((prev) => {
              if (prev.find(m => m.id === payload.new.id)) return prev
              return [...prev, payload.new]
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, otherUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchInitialMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true })

    if (data) {
      setMessages(data)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isBlockedByMe || isBlockedByThem) return

    const content = newMessage.trim()
    setNewMessage('')
    setIsSending(true)

    const { data, error } = await supabase.from('messages').insert({
      sender_id: currentUserId,
      receiver_id: otherUserId,
      content,
    }).select().single()

    if (error) {
      alert('Failed to send message')
      setNewMessage(content) 
    } else if (data) {
      setMessages(prev => [...prev, data])
      triggerNotification(currentUserId, otherUserId, content)
    }

    setIsSending(false)
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            Say hi! 👋 Start the conversation.
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender_id === currentUserId
            return (
              <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed shadow-sm
                    ${isMe 
                      ? 'bg-emerald-500 text-white rounded-tr-sm' 
                      : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm'
                    }`}
                >
                  {msg.content}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-200">
        {isBlockedByMe ? (
          <div className="text-center p-3 text-sm text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
            해당 사용자를 차단했습니다. 더 이상 메시지를 보낼 수 없습니다.
          </div>
        ) : isBlockedByThem ? (
          <div className="text-center p-3 text-sm text-rose-500 bg-rose-50 rounded-xl border border-rose-100">
            메시지를 보낼 수 없는 사용자입니다.
          </div>
        ) : (
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="메시지를 입력하세요 (한국어)..."
              className="w-full bg-slate-100 border-none px-4 py-3.5 pr-14 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-800"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className="absolute right-2 p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-emerald-500"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
