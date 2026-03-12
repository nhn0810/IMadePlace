'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, X } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { useClickOutside } from '@/hooks/useClickOutside'

type Notification = {
  id: string
  type: string
  content: string
  link: string | null
  is_read: boolean
  created_at: string
  sender_id: string | null
  user_id: string | null
}

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  
  const supabase = createClient()

  useClickOutside(bellRef, () => {
    if (isOpen) setIsOpen(false)
  })

  useEffect(() => {
    fetchNotifications()

    // 🔔 Listen for ALL changes on notifications table and filter client-side
    const channel = supabase
      .channel('notifications_channel')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new as Notification
            // Only process if it belongs to this user or is global
            if (newNotif.user_id === userId || newNotif.user_id === null) {
              setNotifications(prev => {
                if (newNotif.type === 'message') {
                  return [newNotif, ...prev.filter(n => !(n.type === 'message' && n.sender_id === newNotif.sender_id))]
                }
                return [newNotif, ...prev]
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotif = payload.new as Notification
            if (updatedNotif.user_id === userId || updatedNotif.user_id === null) {
               // If marked as read externally, remove from our local unread list
               if (updatedNotif.is_read) {
                 setNotifications(prev => prev.filter(n => n.id !== updatedNotif.id))
               }
            }
          } else if (payload.eventType === 'DELETE') {
             const oldNotif = payload.old as { id: string }
             setNotifications(prev => prev.filter(n => n.id !== oldNotif.id))
          }
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
      // Filter the initial fetch to only keep the most recent message notification per sender
      const grouped: Notification[] = []
      const seenSenders = new Set()
      
      data.forEach(n => {
        if (n.type === 'message') {
          if (!seenSenders.has(n.sender_id)) {
            grouped.push(n)
            seenSenders.add(n.sender_id)
          }
        } else {
          grouped.push(n)
        }
      })
      
      setNotifications(grouped)
    }
  }

  async function handleClickNotification(notif: Notification) {
    // For rejection notifications, show a popup first
    if (notif.type === 'apply-rejected') {
      alert(notif.content)
    }

    // Optimistically remove from UI
    setNotifications(prev => prev.filter(n => n.id !== notif.id))
    
    // Update DB: Delete notification upon reading, as requested
    try {
      await supabase.from('notifications').delete().eq('id', notif.id)
    } catch (e) {
      console.error(e)
    }
  }

  async function deleteNotification(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    // Optimistically remove
    setNotifications(prev => prev.filter(n => n.id !== id))
    // Update DB
    await supabase.from('notifications').delete().eq('id', id)
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="relative" ref={bellRef}>
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
                        handleClickNotification(notification)
                        setIsOpen(false)
                    }}
                    className={`block p-4 border-b last:border-0 border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer bg-emerald-50/20 relative group`}
                  >
                    <button
                      onClick={(e) => deleteNotification(notification.id, e)}
                      className="absolute top-3 right-3 p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
                      title="알림 지우기"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {notification.link ? (
                      <Link 
                        href={notification.link} 
                        className="block w-full h-full pr-6"
                        onClick={(e) => {
                          // Allow navigation but still trigger delete
                          handleClickNotification(notification)
                          setIsOpen(false)
                        }}
                      >
                         <div className="text-sm text-slate-800 font-bold mb-1 flex items-center gap-1.5">
                           {notification.type === 'announcement' ? '📢 공지사항' : 
                            notification.type === 'apply-request' ? '🤝 새 신청 발생' :
                            notification.type === 'apply-accepted' ? '🎉 신청 수락됨' :
                            notification.type === 'apply-rejected' ? '❌ 신청 거절됨' :
                            notification.type === 'group-message' ? '💬 단체 메시지' : '🔔 알림'}
                           {!notification.is_read && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>}
                         </div>
                         <p className="text-[13px] text-slate-600 line-clamp-2 leading-snug">{notification.content}</p>
                         <div className="text-xs text-slate-400 mt-2">
                           {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                         </div>
                      </Link>
                    ) : (
                      <div className="pr-6">
                         <div className="text-sm text-slate-800 font-bold mb-1 flex items-center gap-1.5">
                            {notification.type === 'apply-rejected' ? '❌ 신청 거절됨' : '🔔 알림'}
                            {!notification.is_read && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>}
                         </div>
                         <p className="text-[13px] text-slate-600 line-clamp-2 leading-snug">{notification.content}</p>
                         <div className="text-[11px] text-slate-400 mt-2 font-medium">
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
