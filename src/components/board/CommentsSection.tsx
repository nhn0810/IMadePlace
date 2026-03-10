'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { Send, Trash2 } from 'lucide-react'

export function CommentsSection({ postId, currentUser }: { postId: string, currentUser: any }) {
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    fetchComments()
  }, [postId])

  async function fetchComments() {
    const { data } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:author_id (id, display_name, avatar_url, role)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    
    if (data) setComments(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !currentUser || currentUser.role === 'guest') return
    
    setIsSubmitting(true)
    
    const { error } = await supabase.from('comments').insert({
      post_id: postId,
      author_id: currentUser.id,
      content: newComment.trim()
    })

    if (!error) {
      setNewComment('')
      fetchComments()
    } else {
      alert('Error posting comment')
    }
    
    setIsSubmitting(false)
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return
    
    const { error } = await supabase.from('comments').delete().eq('id', commentId)
    if (!error) {
      fetchComments()
    }
  }

  const isGuest = currentUser?.role === 'guest'
  const isAdmin = currentUser?.role === 'master' || currentUser?.role === 'admin'

  return (
    <div>
      <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        Comments
        <span className="bg-slate-100 text-slate-500 text-sm py-0.5 px-2.5 rounded-full">
          {comments.length}
        </span>
      </h3>

      {/* Input area */}
      {!isGuest && currentUser ? (
        <form onSubmit={handleSubmit} className="mb-10 relative">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a friendly comment..."
            className="w-full px-4 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none min-h-[120px] bg-slate-50 focus:bg-white transition-colors"
            required
          />
          <div className="absolute bottom-3 right-3">
            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:hover:bg-emerald-500 flex items-center justify-center shadow-sm"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-10 p-4 bg-slate-50 rounded-xl text-center text-slate-500 text-sm border border-slate-200">
          Please log in to leave comments.
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {comments.map((c) => {
          const canDelete = isAdmin || (currentUser && currentUser.id === c.author_id)
          return (
            <div key={c.id} className="group flex gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 mt-1">
                {c.profiles?.avatar_url ? (
                  <img src={c.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-300 text-slate-600 flex items-center justify-center font-bold">
                    {c.profiles?.display_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              
              <div className="flex-1 bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      {c.profiles?.display_name || 'Anonymous'}
                    </span>
                    {c.profiles?.role === 'master' && (
                      <span className="px-1.5 py-[2px] rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">Master</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </span>
                    {canDelete && (
                      <button 
                        onClick={() => handleDelete(c.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-[15px]">
                  {c.content}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
