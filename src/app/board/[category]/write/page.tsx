'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Editor } from '@/components/board/Editor'
import { Loader2 } from 'lucide-react'

export default function WritePostPage() {
  const router = useRouter()
  const params = useParams()
  const category = params.category as string

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState('waiting')
  const [user, setUser] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase.from('profiles').select('id, role').eq('id', session.user.id).single()
      setUser(profile)
      
      // Basic client side role check
      if (category === 'imade' && profile?.role !== 'master' && profile?.role !== 'admin') {
        alert("해당 게시판에 글을 작성할 권한이 없습니다.")
        router.push(`/board/${category}`)
      }
    }
    checkUser()
  }, [supabase, router, category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    
    setIsSubmitting(true)
    
    // Status can only be changed by admin/master, default to waiting
    let finalStatus = 'waiting'
    if (category === 'youmake' && (user?.role === 'master' || user?.role === 'admin')) {
      finalStatus = status
    }

    const { error } = await supabase.from('posts').insert({
      author_id: user.id,
      category,
      title,
      content,
      status: finalStatus,
    })

    setIsSubmitting(false)

    if (error) {
      alert('게시글 등록 중 오류가 발생했습니다: ' + error.message)
    } else {
      router.push(`/board/${category}`)
      router.refresh()
    }
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  const isAdmin = user.role === 'master' || user.role === 'admin'

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">게시글 작성</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">제목</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            placeholder="제목을 입력하세요..."
          />
        </div>

        {category === 'youmake' && isAdmin && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">진행 상태</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="waiting">대기중</option>
              <option value="in_progress">진행중</option>
              <option value="completed">완료</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">내용</label>
          <Editor content={content} onChange={setContent} />
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-full text-slate-500 hover:bg-slate-100 font-medium mr-3 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            등록하기
          </button>
        </div>
      </form>
    </div>
  )
}
