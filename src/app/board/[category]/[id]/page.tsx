import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft, Clock } from 'lucide-react'
import { CommentsSection } from '@/components/board/CommentsSection'
import { LikeButton } from '@/components/board/LikeButton'
import { ViewTracker } from '@/components/board/ViewTracker'

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
  if (session) {
    const { data: p } = await supabase.from('profiles').select('id, role, banned_until').eq('id', session.user.id).single()
    profile = p
    
    // Check if liked
    const { data: like } = await supabase.from('likes').select('id').eq('post_id', id).eq('user_id', session.user.id).single()
    isLikedByMe = !!like
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

  const isGuest = profile?.role === 'guest'
  const isAdminOrMaster = profile?.role === 'master' || profile?.role === 'admin'

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

        {isAdminOrMaster && (
          <form action={adminDeletePost}>
            <button className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-sm font-bold transition-colors">
              관리자 직권 삭제
            </button>
          </form>
        )}
      </div>

      <header className="mb-10 pb-8 border-b border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-emerald-600 font-semibold uppercase tracking-wider text-sm bg-emerald-50 px-3 py-1 rounded-full">
            {category.replace('imade', 'I made').replace('youmake', 'You make').replace('iuse', 'I use')}
          </span>
          {category === 'youmake' && post.status && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${STATUS_COLORS[post.status] || STATUS_COLORS.waiting}`}>
              {post.status.replace('_', ' ')}
            </span>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
          {post.title}
        </h1>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full shadow-sm">
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
                <div className="font-semibold text-slate-900 leading-tight">{post.profiles?.display_name || 'Anonymous'}</div>
                <div className="text-[10px] text-slate-400">작성자</div>
              </div>
            </div>

            {collaborators.map(c => (
              <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full shadow-sm">
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
                  <div className="font-semibold text-slate-900 leading-tight">{c.display_name || 'Anonymous'}</div>
                  <div className="text-[10px] text-slate-400">공동 작성자</div>
                </div>
              </div>
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
      <div 
        className="prose prose-slate prose-lg max-w-none mb-16"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Interactions boundary */}
      <div className="border-t border-slate-200 pt-10">
        <CommentsSection postId={post.id} currentUser={profile} />
      </div>

      <ViewTracker postId={post.id} />
    </div>
  )
}

