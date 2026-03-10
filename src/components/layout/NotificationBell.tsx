'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

type Notification = {
  id: string
  type: string
  content: string
  link: string | null
  is_read: boolean
  created_at: string
}

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    fetchNotifications()

    // 🔔 Listen for NEW notifications targeting this user or global (user_id is null)
    const channel = supabase
      .channel('notifications_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}` // We also need to listen for user_id is null, unfortunately Supabase filters don't support OR natively in realtime. So we listen to all inserts and filter client side.
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev])
        }
      )
      .on( // Global announcements
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=is.null` 
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) {
      setNotifications(data)
    }
  }

  async function markAsRead(id: string) {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    
    // We only update if it belongs to the user or if we track reads differently, 
    // but based on our simple policy, they can update it.
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 md:right-auto md:left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800">알림</h3>
            {unreadCount > 0 && (
              <span className="text-xs font-semibold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                {unreadCount}개 안 읽음
              </span>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                새로운 알림이 없습니다.
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map(notification => (
                  <div 
                    key={notification.id}
                    onClick={() => {
                        if (!notification.is_read) markAsRead(notification.id)
                        setIsOpen(false)
                    }}
                    className={`block p-4 border-b last:border-0 border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${
                      notification.is_read ? 'opacity-60' : 'bg-emerald-50/30'
                    }`}
                  >
                    {notification.link ? (
                      <Link href={notification.link} className="block w-full h-full">
                         <div className="text-sm text-slate-800 font-medium mb-1">
                           {notification.type === 'announcement' ? '📢 공지사항' : '💬 새 메시지'}
                         </div>
                         <p className="text-sm text-slate-600 line-clamp-2">{notification.content}</p>
                         <div className="text-xs text-slate-400 mt-2">
                           {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                         </div>
                      </Link>
                    ) : (
                      <div>
                         <div className="text-sm text-slate-800 font-medium mb-1">
                           {notification.type === 'announcement' ? '📢 공지사항' : '🔔 알림'}
                         </div>
                         <p className="text-sm text-slate-600 line-clamp-2">{notification.content}</p>
                         <div className="text-xs text-slate-400 mt-2">
                           {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                         </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
