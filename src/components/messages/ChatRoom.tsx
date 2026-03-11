'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send } from 'lucide-react'
import { subDays, formatISO } from 'date-fns'

// Auto-prune and insert the latest message notification
async function triggerNotification(senderId: string, receiverId: string, message: string) {
  const supabase = createClient()
  
  // 1. Remove previous 'message' notification from this sender to keep DB clean
  await supabase.from('notifications')
    .delete()
    .eq('user_id', receiverId)
    .eq('sender_id', senderId)
    .eq('type', 'message')
    
  // 2. Insert new 'latest' notification
  await supabase.from('notifications')
    .insert({
      user_id: receiverId,
      sender_id: senderId,
      type: 'message',
      content: `새 메시지: ${message.length > 20 ? message.substring(0, 20) + '...' : message}`,
      link: `/messages/${senderId}`
    })
}

export function ChatRoom({ currentUserId, otherUserId, isBlockedByMe, isBlockedByThem, markAsReadAction }: { currentUserId: string, otherUserId: string, isBlockedByMe?: boolean, isBlockedByThem?: boolean, markAsReadAction?: () => Promise<void> }) {
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  
  const [isOtherTyping, setIsOtherTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  
  // Deriving a consistent room ID for broadcast channels
  const roomId = [currentUserId, otherUserId].sort().join('-')

  useEffect(() => {
    fetchInitialMessages()
    if (markAsReadAction) {
      markAsReadAction().catch(console.error)
    }

    const channel = supabase
      .channel('messages_channel')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUserId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new.sender_id === otherUserId) {
            setMessages((prev) => {
              if (prev.find(m => m.id === payload.new.id)) return prev
              return [...prev, payload.new]
            })
            if (markAsReadAction) {
              markAsReadAction().catch(console.error)
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${currentUserId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new.receiver_id === otherUserId) {
            // New message sent by me
            setMessages((prev) => {
              if (prev.find(m => m.id === payload.new.id)) return prev
              return [...prev, payload.new]
            })
          } else if (payload.eventType === 'UPDATE') {
             // If my message got updated (e.g. marked as read by the other person, OR me marking my own self-message as read)
             setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m))
          }
        }
      )
      .subscribe()

    // Setup Broadcast Channel for typing indicators
    const typingChannel = supabase.channel(`typing:${roomId}`)
      .on(
        'broadcast',
        { event: 'typing' },
        (payload) => {
          if (payload.payload.userId === otherUserId) {
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
  }, [currentUserId, otherUserId, roomId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchInitialMessages() {
    const twoWeeksAgo = formatISO(subDays(new Date(), 14))
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
      .gte('created_at', twoWeeksAgo)
      .order('created_at', { ascending: true })

    if (data) {
      setMessages(data)
    }
  }

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)

    // Broadcast that we are typing
    supabase.channel(`typing:${roomId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserId, isTyping: true },
    })

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set a timeout to send isTyping: false after 5 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      supabase.channel(`typing:${roomId}`).send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUserId, isTyping: false },
      })
    }, 5000)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isBlockedByMe || isBlockedByThem) return

    const content = newMessage.trim()
    setNewMessage('')
    setIsSending(true)
    
    // Immediately stop typing indicator on send
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    supabase.channel(`typing:${roomId}`).send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUserId, isTyping: false },
    })

    const { data, error } = await supabase.from('messages').insert({
      sender_id: currentUserId,
      receiver_id: otherUserId,
      content,
    }).select().single()

    if (error) {
      alert('Failed to send message')
      setNewMessage(content) 
    } else if (data) {
      setMessages(prev => {
        if (prev.find(m => m.id === data.id)) return prev
        return [...prev, data]
      })
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
              <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-1 mb-2`}>
                {isMe && !msg.is_read && (
                  <span className="text-[10px] text-emerald-500 font-bold mb-1">1</span>
                )}
                
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
        
        {isOtherTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5 h-11">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
            </div>
          </div>
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
              onChange={handleTyping}
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
