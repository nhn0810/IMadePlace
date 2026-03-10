import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Heart, Eye } from 'lucide-react'

// Basic stripped text utility for preview
function stripHtml(html: string) {
  return html.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...'
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
          <Link href={`/board/${category}/${post.id}`} className="block">
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
                  <div className="text-xs text-slate-400">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
              
              {category === 'youmake' && post.status && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[post.status] || STATUS_COLORS.waiting}`}>
                  {post.status.replace('_', ' ').toUpperCase()}
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-1">
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
