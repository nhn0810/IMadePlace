import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import { subDays, formatISO } from 'date-fns'

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

  // Fetch recent conversations for everyone (limited to 14 days)
  const twoWeeksAgo = formatISO(subDays(new Date(), 14))
  const { data: messages } = await supabase
    .from('messages')
    .select(`
      sender_id, receiver_id, content, created_at, is_read,
      sender:sender_id(id, display_name, avatar_url, role),
      receiver:receiver_id(id, display_name, avatar_url, role)
    `)
    .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
    .gte('created_at', twoWeeksAgo)
    .order('created_at', { ascending: false })

  const conversantsMap = new Map()
  messages?.forEach(msg => {
    const other = (msg.sender_id === session.user.id ? msg.receiver : msg.sender) as any as UserProfile
    if (!conversantsMap.has(other.id)) {
      conversantsMap.set(other.id, {
        user: other,
        lastMessage: msg.content,
        time: msg.created_at,
        unreadCount: 0
      })
    }
    
    if (!msg.is_read && msg.receiver_id === session.user.id) {
       conversantsMap.get(other.id).unreadCount += 1
    }
  })

  const conversations = Array.from(conversantsMap.values()).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

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
              key={conv.user.id} 
              href={`/messages/${conv.user.id}`}
              className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all group"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                {conv.user.avatar_url ? (
                   <img src={conv.user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold bg-slate-200">
                     {conv.user.display_name?.[0]?.toUpperCase() || 'U'}
                   </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                      {conv.user.display_name}
                      {conv.user.id === session.user.id && (
                        <span className="ml-1 text-emerald-500 text-xs font-bold">(나)</span>
                      )}
                    </h3>
                    {conv.user.role && conv.user.role !== 'user' && conv.user.role !== 'guest' && (
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
