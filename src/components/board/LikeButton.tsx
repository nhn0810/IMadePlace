'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Heart } from 'lucide-react'

export function LikeButton({ postId, initialLiked, initialCount }: { postId: string, initialLiked: boolean, initialCount: number }) {
  const [isLiked, setIsLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [isLoading, setIsLoading] = useState(false)
  
  const supabase = createClient()

  const toggleLike = async () => {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      if (isLiked) {
        // Unlike
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', session.user.id)
        setIsLiked(false)
        setCount(c => Math.max(0, c - 1))
      } else {
        // Like
        await supabase.from('likes').insert({ post_id: postId, user_id: session.user.id })
        setIsLiked(true)
        setCount(c => c + 1)
      }
    } catch(e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={toggleLike}
      disabled={isLoading}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-medium transition-all duration-300 border ${
        isLiked 
          ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 hover:border-rose-300' 
          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
      }`}
    >
      <Heart className={`w-5 h-5 transition-transform ${isLiked ? 'fill-rose-500 animate-pulse' : ''}`} />
      <span>{count}</span>
    </button>
  )
}
