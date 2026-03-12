import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, Users } from 'lucide-react'
import { subDays, formatISO } from 'date-fns'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type UserProfile = {
  id: string
  display_name: string | null
  avatar_url: string | null
  role?: string
}

export default async function MessagesInboxPage() {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', session.user.id)
    .single()

  // 1. Fetch user's projects to identify group rooms
  const { data: myPosts } = await supabase
    .from('posts')
    .select('id, title, author_id, collaborator_ids')
    .or(`author_id.eq.${session.user.id},collaborator_ids.cs.{${session.user.id}}`)
  
  const myProjectIds = myPosts?.map(p => p.id) || []
  const projectMap = new Map(myPosts?.map(p => [p.id, p]))

  // 2. Fetch recent conversations (DMs & Group)
  const twoWeeksAgo = formatISO(subDays(new Date(), 14))
  const { data: messages } = await supabase
    .from('messages')
    .select(`
      sender_id, receiver_id, room_id, content, created_at, is_read,
      sender:sender_id(id, display_name, avatar_url, role),
      receiver:receiver_id(id, display_name, avatar_url, role)
    `)
    .or(
      `sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}${myProjectIds.length > 0 ? `,room_id.in.(${myProjectIds.join(',')})` : ''}`
    )
    .gte('created_at', twoWeeksAgo)
    .order('created_at', { ascending: false })

  // 3. Group messages into conversations
  const conversationsMap = new Map()
  
  messages?.forEach(msg => {
    let key, convData
    
    if (msg.room_id) {
      // Group Chat
      key = `room_${msg.room_id}`
      if (!conversationsMap.has(key)) {
        const project = projectMap.get(msg.room_id)
        conversationsMap.set(key, {
          isGroup: true,
          id: msg.room_id,
          title: project?.title || '알 수 없는 프로젝트',
          lastMessage: msg.content,
          time: msg.created_at,
          unreadCount: 0,
          user: null
        })
      }
    } else {
      // 1:1 DM
      const other = (msg.sender_id === session.user.id ? msg.receiver : msg.sender) as any as UserProfile
      if (!other) return // Safety
      
      key = `user_${other.id}`
      if (!conversationsMap.has(key)) {
        conversationsMap.set(key, {
          isGroup: false,
          id: other.id,
          title: other.display_name,
          user: other,
          lastMessage: msg.content,
          time: msg.created_at,
          unreadCount: 0
        })
      }
    }

    // Unread count logic
    // For DMs: is_read = false and I am the receiver
    // For Group: requires chat_room_reads check. 
    // Simplified: For now, if it's the latest and I haven't seen the room notification, it's unread.
    // Actually, let's just use the is_read for DMs and a placeholder for group for now.
    if (!msg.is_read && msg.receiver_id === session.user.id) {
       conversationsMap.get(key).unreadCount += 1
    }
  })

  const conversations = Array.from(conversationsMap.values()).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 h-screen flex flex-col">
      <header className="mb-8 pb-6 border-b border-slate-200">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-emerald-500" />
          메시지함
        </h1>
        <p className="text-slate-500 mt-2">1:1 문의 및 대화 내역을 관리하세요</p>
      </header>

      {conversations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
          <MessageSquare className="w-12 h-12 text-slate-200 mb-4" />
          <p>아직 진행 중인 대화가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map(conv => (
            <Link 
              key={conv.id} 
              href={conv.isGroup ? `/my-projects?tab=in_progress&chat=${conv.id}` : `/messages/${conv.id}`}
              className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all group"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center">
                {conv.isGroup ? (
                   <div className="w-full h-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                     <Users className="w-6 h-6" />
                   </div>
                ) : conv.user?.avatar_url ? (
                   <img src={conv.user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold bg-slate-200">
                     {conv.user?.display_name?.[0]?.toUpperCase() || 'U'}
                   </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <div className="flex items-center gap-2 max-w-[70%]">
                    <h3 className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                      {conv.title}
                      {!conv.isGroup && conv.id === session.user.id && (
                        <span className="ml-1 text-emerald-500 text-xs font-bold">(나)</span>
                      )}
                    </h3>
                    {conv.isGroup && (
                       <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold uppercase">Project</span>
                    )}
                    {!conv.isGroup && conv.user?.role && conv.user.role !== 'user' && conv.user.role !== 'guest' && (
                       <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                         conv.user.role === 'master' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                       }`}>
                         {conv.user.role === 'master' ? '운영자' : '개발자'}
                       </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    {conv.lastMessage === '새로운 대화 시작하기' ? '' : new Date(conv.time).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2 mt-1">
                  <p className={`text-sm truncate flex-1 min-w-0 ${conv.lastMessage === '새로운 대화 시작하기' ? 'text-emerald-500 font-medium' : 'text-slate-500'}`}>
                    {conv.lastMessage}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
