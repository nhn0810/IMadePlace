import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Heart, Eye } from 'lucide-react'

function stripHtml(content: string) {
  if (!content) return ''
  if (content.startsWith('[')) {
    try {
      const blocks = JSON.parse(content)
      const textBlocks = blocks.filter((b: any) => b.type === 'text')
      const combinedText = textBlocks.map((b: any) => {
        return (typeof b.content === 'string' ? b.content.replace(/<[^>]*>?/gm, '') : '')
      }).join(' ')
      return combinedText.substring(0, 150) + (combinedText.length > 150 ? '...' : '')
    } catch {
      return '...'
    }
  }
  return content.replace(/<[^>]*>?/gm, '').substring(0, 150) + (content.length > 150 ? '...' : '')
}

const STATUS_COLORS: Record<string, string> = {
  waiting: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
}

export function PostList({ posts, category }: { posts: any[], category: string }) {
  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-20 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
        <h3 className="text-lg font-medium text-slate-900 mb-1">No posts yet</h3>
        <p className="text-slate-500">Be the first to share something here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <article key={post.id} className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md hover:border-emerald-200 transition-all">
          <Link href={`/board/${post.category || category}/${post.id}`} className="block">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                  {post.profiles?.avatar_url ? (
                    <img src={post.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                      {post.profiles?.display_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-medium text-slate-900">{post.profiles?.display_name || 'Anonymous'}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                    {post.post_type && (
                      <>
                        <span>•</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight
                          ${post.post_type === '제작기' ? 'bg-amber-100 text-amber-800' 
                            : post.post_type === '결과' ? 'bg-emerald-100 text-emerald-800'
                            : post.post_type === '계획' ? 'bg-slate-200 text-slate-800'
                            : post.post_type === '도움요청' ? 'bg-rose-100 text-rose-800'
                            : post.post_type === '이건 어때?' ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-emerald-500 text-white'
                          }
                        `}>
                          {post.post_type}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {category === 'youmake' && post.status && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[post.status] || STATUS_COLORS.waiting}`}>
                  {post.status.replace('_', ' ').toUpperCase()}
                </span>
              )}
            </div>

            <div className="mb-2">
              {category === 'youmake' && post.post_type === '같이 하자' && post.recruitment_end_date && (
                <span className={`inline-block mb-2 text-xs font-bold px-2 py-0.5 rounded-full ${new Date(post.recruitment_end_date) > new Date() ? 'bg-emerald-100 text-emerald-700 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                  {new Date(post.recruitment_end_date) > new Date() ? '🔥 모집 중' : '모집 마감'}
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-1">
              {post.project_name && <span className="text-emerald-600 mr-2">[{post.project_name}]</span>}
              {post.title}
            </h2>
            <p className="text-slate-500 leading-relaxed line-clamp-2 mb-4">
              {stripHtml(post.content)}
            </p>

            <div className="flex items-center gap-6 text-sm text-slate-400">
              <div className="flex items-center gap-1.5 hover:text-emerald-500 transition-colors">
                <Eye className="w-4 h-4" />
                <span>{post.view_count || 0}</span>
              </div>
              {/* Note: comments and likes count requires fetching count or setting up triggers. 
                  We'll just show mock logic or fetch them in a detailed query later. */}
              <div className="flex items-center gap-1.5 hover:text-emerald-500 transition-colors">
                <Heart className="w-4 h-4" />
                <span>Like</span>
              </div>
              <div className="flex items-center gap-1.5 hover:text-emerald-500 transition-colors">
                <MessageSquare className="w-4 h-4" />
                <span>Comment</span>
              </div>
            </div>
          </Link>
        </article>
      ))}
    </div>
  )
}
