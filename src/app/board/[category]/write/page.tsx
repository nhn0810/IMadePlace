'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Editor } from '@/components/board/Editor'
import { Loader2, UserPlus, X, Search } from 'lucide-react'

type Profile = { id: string; display_name: string; avatar_url: string; role: string }

export default function WritePostPage() {
  const router = useRouter()
  const params = useParams()
  const category = params.category as string

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState('waiting')
  const [user, setUser] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [collaborators, setCollaborators] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase.from('profiles').select('id, role, banned_until').eq('id', session.user.id).single()
      setUser(profile)
      
      // Basic client side role check
      if (category === 'imade' && profile?.role !== 'master' && profile?.role !== 'admin') {
        alert("해당 게시판에 글을 작성할 권한이 없습니다.")
        router.push(`/board/${category}`)
      }
    }
    checkUser()
  }, [supabase, router, category])

  // Collaborator search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([])
        return
      }
      setIsSearching(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, role')
        .ilike('display_name', `%${searchQuery}%`)
        .neq('id', user?.id) // Exclude self
        .limit(10)
        
      if (data) setSearchResults(data)
      setIsSearching(false)
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery, user, supabase])

  const addCollaborator = (profile: Profile) => {
    if (!collaborators.find(c => c.id === profile.id)) {
      setCollaborators([...collaborators, profile])
    }
    setSearchQuery('')
    setSearchResults([])
  }

  const removeCollaborator = (id: string) => {
    setCollaborators(collaborators.filter(c => c.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    
    setIsSubmitting(true)
    
    if (user?.banned_until && new Date(user.banned_until) > new Date()) {
      const banDate = new Date(user.banned_until).toLocaleString('ko-KR', {
         year: 'numeric',
         month: 'long',
         day: 'numeric',
         hour: '2-digit',
         minute: '2-digit'
      })
      alert(`${banDate}까지 글쓰기 권한이 정지되었습니다. 운영자에게 문의해주세요.`)
      setIsSubmitting(false)
      return
    }
    
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
      collaborator_ids: collaborators.map(c => c.id)
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

        {/* Collaborators Section */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-500" />
            공동 작성자 (선택)
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100/50 text-emerald-800 rounded-full border border-emerald-200/50 text-sm font-medium">
               <div className="w-5 h-5 rounded-full bg-emerald-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                 {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover"/> : user.display_name?.[0]}
               </div>
               {user.display_name} (나)
            </div>
            {collaborators.map(c => (
              <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-700 rounded-full border border-slate-200 shadow-sm text-sm font-medium">
                <div className="w-5 h-5 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 text-xs">
                 {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover"/> : c.display_name?.[0]}
                </div>
                {c.display_name}
                <button type="button" onClick={() => removeCollaborator(c.id)} className="text-slate-400 hover:text-rose-500 transition-colors ml-1 p-0.5 rounded-full hover:bg-rose-50">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              placeholder="추가할 사용자의 이름을 검색하세요..."
            />
            {isSearching && (
              <div className="absolute right-3 top-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            )}
            
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && searchQuery.trim().length >= 2 && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden max-h-60 overflow-y-auto">
                {searchResults.map(result => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => addCollaborator(result)}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 border-b last:border-0 border-slate-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                      {result.avatar_url ? <img src={result.avatar_url} className="w-full h-full object-cover"/> : <span className="flex items-center justify-center h-full text-xs font-bold text-slate-500">{result.display_name?.[0]}</span>}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 text-sm">{result.display_name}</div>
                      {result.role !== 'user' && result.role !== 'guest' && (
                        <div className="text-[10px] text-slate-500 uppercase">{result.role === 'master' ? '운영자' : '개발자'}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
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
