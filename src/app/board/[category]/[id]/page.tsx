import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft, Clock } from 'lucide-react'
import { CommentsSection } from '@/components/board/CommentsSection'
import { LikeButton } from '@/components/board/LikeButton'
import { ViewTracker } from '@/components/board/ViewTracker'
import { ParticipateButton } from '@/components/board/ParticipateButton'
import { BlockRenderer } from '@/components/board/editor/BlockRenderer'

const STATUS_COLORS: Record<string, string> = {
  waiting: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
}

export default async function PostDetailPage({ params }: { params: { category: string, id: string } }) {
  // Await the params object in Next.js 15
  const resolvedParams = await params
  const { category, id } = resolvedParams

  const supabase = await createClient()

  // Fetch Post and Author Profile
  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      *,
      profiles:author_id (id, display_name, avatar_url)
    `)
    .eq('id', id)
    .single()

  if (error || !post) {
    notFound()
  }

  // Fetch collaborators if any
  let collaborators: any[] = []
  if (post.collaborator_ids && post.collaborator_ids.length > 0) {
    const { data: collabData } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, role')
      .in('id', post.collaborator_ids)
    if (collabData) collaborators = collabData
  }

  // Get current user auth
  const { data: { session } } = await supabase.auth.getSession()
  let profile = null
  let isLikedByMe = false
  let isParticipating = false
  
  if (session) {
    const { data: p } = await supabase.from('profiles').select('id, role, banned_until').eq('id', session.user.id).single()
    profile = p
    
    // Check if liked
    const { data: like } = await supabase.from('likes').select('id').eq('post_id', id).eq('user_id', session.user.id).single()
    isLikedByMe = !!like
    
    // Check if participating
    if (post.post_type === '같이 하자') {
      const { data: part } = await supabase.from('project_participants').select('id').eq('post_id', id).eq('user_id', session.user.id).single()
      isParticipating = !!part
    }
  }

  // Fetch likes count
  const { count: likesCount } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', id)

  // Handle Admin Delete
  async function adminDeletePost() {
    'use server'
    const supabaseAction = await createClient()
    const { data: { session: aSession } } = await supabaseAction.auth.getSession()
    if (!aSession) return

    const { data: aProfile } = await supabaseAction.from('profiles').select('role').eq('id', aSession.user.id).single()
    if (!aProfile || !['master', 'admin'].includes(aProfile.role)) return

    // Insert system message to author
    await supabaseAction.from('messages').insert({
      sender_id: aSession.user.id,
      receiver_id: post.author_id,
      content: `해당 게시글이 삭제조치되었습니다. [${post.title}]`
    })

    // Delete post
    await supabaseAction.from('posts').delete().eq('id', id)
    
    redirect(`/board/${category}`)
  }

  // Handle Author Delete
  async function deletePost() {
    'use server'
    const supabaseAction = await createClient()
    const { data: { session: aSession } } = await supabaseAction.auth.getSession()
    if (!aSession) return

    if (aSession.user.id !== post.author_id) return

    await supabaseAction.from('posts').delete().eq('id', id)
    redirect(`/board/${category}`)
  }

  const isGuest = profile?.role === 'guest'
  const isAdminOrMaster = profile?.role === 'master' || profile?.role === 'admin'
  const isAuthor = session?.user.id === post.author_id
  const isCollaborator = post.collaborator_ids?.includes(session?.user.id)
  const canEdit = isAuthor || (isCollaborator && isAdminOrMaster)
  const canDelete = isAuthor

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 bg-white min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <Link 
          href={`/board/${category}`}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-500 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로 돌아가기
        </Link>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Link href={`/board/${category}/${id}/edit`} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors">
              수정
            </Link>
          )}
          {canDelete && (
             <form action={deletePost}>
                <button className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-sm font-bold transition-colors">
                  삭제
                </button>
             </form>
          )}
          {isAdminOrMaster && !isAuthor && (
            <form action={adminDeletePost}>
              <button className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-sm font-bold transition-colors">
                관리자 직권 삭제
              </button>
            </form>
          )}
        </div>
      </div>

      <header className="mb-10 pb-8 border-b border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-emerald-600 font-semibold uppercase tracking-wider text-sm bg-emerald-50 px-3 py-1 rounded-full">
            {category.replace('imade', 'I made').replace('youmake', 'You make').replace('iuse', 'I use')}
          </span>
          {category === 'youmake' && post.status && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${STATUS_COLORS[post.status] || STATUS_COLORS.waiting}`}>
              {post.status.replace('_', ' ')}
            </span>
          )}
          {post.post_type && (
            <span className={`px-3 py-1 rounded-full text-[13px] font-bold tracking-tight shadow-sm
              ${post.post_type === '제작기' ? 'bg-amber-100 text-amber-800' 
                : post.post_type === '결과' ? 'bg-emerald-100 text-emerald-800'
                : post.post_type === '계획' ? 'bg-slate-200 text-slate-800'
                : post.post_type === '도움요청' ? 'bg-rose-100 text-rose-800'
                : post.post_type === '이건 어때?' ? 'bg-indigo-100 text-indigo-800'
                : 'bg-emerald-500 text-white' // 같이 하자
              }
            `}>
              {post.post_type === '같이 하자' ? '🤝 같이 하자' : post.post_type}
            </span>
          )}
        </div>

        {post.project_name && (
          <div className="mb-2 text-emerald-600 font-bold tracking-tight flex items-center gap-2">
            <span className="text-xl">[{post.project_name}]</span>
            {post.post_type === '같이 하자' && post.recruitment_end_date && (
              <span className={`text-sm px-2 py-0.5 rounded-full ${new Date(post.recruitment_end_date) > new Date() ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                {new Date(post.recruitment_end_date) > new Date() ? '모집 중' : '모집 마감'}
                ({new Date(post.recruitment_end_date).toLocaleDateString()} 까지)
              </span>
            )}
          </div>
        )}

        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
          {post.title}
        </h1>

        {post.short_description && (
          <p className="text-lg text-slate-500 font-medium mb-8 leading-relaxed border-l-4 border-emerald-400 pl-4 py-1 bg-slate-50/50 rounded-r-xl">
            {post.short_description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <Link href={`/profile/${post.author_id}`} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full shadow-sm hover:bg-slate-100 transition-colors group">
              <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                {post.profiles?.avatar_url ? (
                  <img src={post.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">
                    {post.profiles?.display_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className="pr-1 text-sm">
                <div className="font-semibold text-slate-900 leading-tight group-hover:text-emerald-600 transition-colors">{post.profiles?.display_name || 'Anonymous'}</div>
                <div className="text-[10px] text-slate-400">작성자</div>
              </div>
            </Link>

            {collaborators.map(c => (
              <Link key={c.id} href={`/profile/${c.id}`} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full shadow-sm hover:bg-slate-100 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm">
                      {c.display_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <div className="pr-1 text-sm">
                  <div className="font-semibold text-slate-900 leading-tight group-hover:text-emerald-600 transition-colors">{c.display_name || 'Anonymous'}</div>
                  <div className="text-[10px] text-slate-400">공동 작성자</div>
                </div>
              </Link>
            ))}
            
            <div className="flex items-center gap-2 text-sm text-slate-400 mt-1 sm:mt-0 sm:ml-2 w-full sm:w-auto">
              <Clock className="w-3.5 h-3.5" />
              <span>{new Date(post.created_at).toLocaleDateString()}</span>
              <span>•</span>
              <span>조회수 {post.view_count || 0}</span>
            </div>
          </div>

          {!isGuest && (
            <div className="flex items-center">
              <LikeButton 
                postId={post.id} 
                initialLiked={isLikedByMe} 
                initialCount={likesCount || 0} 
              />
            </div>
          )}
        </div>
      </header>

      {/* Post Content */}
      <div className="mb-12">
        <BlockRenderer content={post.content} postId={post.id} />
      </div>
      
      {/* Participate Button */}
      {post.post_type === '같이 하자' && (
        <div className="mb-16">
           {new Date(post.recruitment_end_date) > new Date() ? (
             session ? (
               <ParticipateButton postId={post.id} userId={session.user.id} initialJoined={isParticipating} />
             ) : (
               <div className="p-4 bg-slate-50 text-slate-500 text-center rounded-2xl border border-slate-200">
                 참여하려면 로그인이 필요합니다.
               </div>
             )
           ) : (
             <div className="p-4 bg-slate-50 text-slate-500 font-bold text-center rounded-2xl border border-slate-200 opacity-60">
               모집이 마감된 프로젝트입니다.
             </div>
           )}
        </div>
      )}

      {/* Interactions boundary */}
      <div className="border-t border-slate-200 pt-10">
        <CommentsSection postId={post.id} currentUser={profile} />
      </div>

      <ViewTracker postId={post.id} />
    </div>
  )
}

