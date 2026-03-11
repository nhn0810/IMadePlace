'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Editor } from '@/components/board/Editor'
import { Loader2, UserPlus, X, Search } from 'lucide-react'
import { useClickOutside } from '@/hooks/useClickOutside'

type Profile = { id: string; display_name: string; avatar_url: string; role: string }

export default function EditPostPage() {
  const router = useRouter()
  const params = useParams()
  const category = params.category as string
  const id = params.id as string

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState('waiting')
  const [user, setUser] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingPost, setIsLoadingPost] = useState(true)
  const [postAuthorId, setPostAuthorId] = useState('')
  
  // Categorical Data
  const [postType, setPostType] = useState('')
  const [projectName, setProjectName] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [recruitmentDate, setRecruitmentDate] = useState('')
  
  const [collaborators, setCollaborators] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useClickOutside(searchRef, () => {
    setSearchResults([]) // Close dropdown on outside click
  })

  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase.from('profiles').select('id, role, banned_until').eq('id', session.user.id).single()
      setUser(profile)

      // Fetch the post
      const { data: post, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single()
        
      if (error || !post) {
        alert('게시글을 불러올 수 없거나 권한이 없습니다.')
        router.push(`/board/${category}`)
        return
      }

      const isAuthor = post.author_id === session.user.id
      const isCollaborator = post.collaborator_ids?.includes(session.user.id)
      const isAdminOrMaster = profile?.role === 'master' || profile?.role === 'admin'

      if (!isAuthor && !isCollaborator && !isAdminOrMaster) {
        alert('수정 권한이 없습니다.')
        router.push(`/board/${category}/${id}`)
        return
      }

      setPostAuthorId(post.author_id)
      setTitle(post.title)
      setContent(post.content)
      setStatus(post.status || 'waiting')
      setPostType(post.post_type || '')
      setProjectName(post.project_name || '')
      setShortDescription(post.short_description || '')
      setRecruitmentDate(post.recruitment_end_date ? post.recruitment_end_date.split('T')[0] : '')

      // Fetch collaborators
      if (post.collaborator_ids && post.collaborator_ids.length > 0) {
        const { data: collabData } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, role')
          .in('id', post.collaborator_ids)
        if (collabData) setCollaborators(collabData)
      }

      setIsLoadingPost(false)
    }
    loadData()
  }, [supabase, router, category, id])

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
        .neq('id', postAuthorId || user?.id) // Exclude author
        .limit(10)
        
      if (data) setSearchResults(data)
      setIsSearching(false)
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery, user, postAuthorId, supabase])

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
    
    // Category validations
    if (category === 'imade' && !postType) {
      alert('말머리(태그)를 선택해주세요.')
      return
    }
    if (category === 'youmake' && !postType) {
      alert('말머리(태그)를 선택해주세요.')
      return
    }
    if (category === 'youmake' && postType === '같이 하자' && (!projectName.trim() || !recruitmentDate)) {
      alert('모집 글은 프로젝트 가명과 종료 일자를 반드시 입력해야 합니다.')
      return
    }
    
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
    
    // Status can only be changed by admin/master
    let finalStatus = status
    if (category === 'youmake' && (user?.role !== 'master' && user?.role !== 'admin')) {
      // If not admin, we don't modify the existing status via select element. 
      // But we have state for it, so it will keep the existing value.
    }

    const { error } = await supabase.from('posts').update({
      title,
      content,
      status: finalStatus,
      collaborator_ids: collaborators.map(c => c.id),
      post_type: postType || null,
      project_name: projectName.trim() || null,
      short_description: shortDescription.trim() || null,
      recruitment_end_date: recruitmentDate || null,
    }).eq('id', id)

    setIsSubmitting(false)

    if (error) {
      alert('게시글 수정 중 오류가 발생했습니다: ' + error.message)
    } else {
      router.push(`/board/${category}/${id}`)
      router.refresh()
    }
  }

  if (isLoadingPost || !user) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  const isAdmin = user.role === 'master' || user.role === 'admin'
  const isAuthor = user.id === postAuthorId
  // Only the original author should be able to edit collaborators
  const canEditCollaborators = isAuthor || isAdmin

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">게시글 수정</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {category === 'imade' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">태그 (선택 필수)</label>
              <select
                value={postType}
                onChange={(e) => setPostType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white transition-all font-medium text-slate-700 shadow-sm"
              >
                <option value="" disabled>어떤 글인지 선택해주세요</option>
                {['제작기', '결과', '계획', '도움요청'].map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">설명할 프로젝트명 (가명)</label>
              <input
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="가명, 명칭을 입력하세요..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">간단한 프로젝트 설명 (1~2줄 코멘트)</label>
              <input
                type="text"
                required
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="이 프로젝트는 어떤 프로젝트인가요?"
              />
            </div>
          </div>
        )}

        {category === 'youmake' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">글 종류 (선택 필수)</label>
              <select
                value={postType}
                onChange={(e) => setPostType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white transition-all font-medium text-slate-700 shadow-sm"
              >
                <option value="" disabled>어떤 글인지 선택해주세요</option>
                <option value="이건 어때?">💡 아이디어 제안 (이건 어때?)</option>
                <option value="같이 하자">🤝 프로젝트 모집 (같이 하자)</option>
              </select>
            </div>

            {postType === '같이 하자' && (
              <div className="flex flex-col sm:flex-row gap-4 p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-emerald-800 mb-2">프리 롬핑 프로젝트 가명 <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="프로젝트 가명을 지어주세요..."
                  />
                </div>
                <div className="w-full sm:w-1/3">
                  <label className="block text-sm font-medium text-emerald-800 mb-2">모집 마감일 <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={recruitmentDate}
                    onChange={(e) => setRecruitmentDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}
          </div>
        )}

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
        {category === 'imade' && canEditCollaborators && (
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-500" />
              공동 작성자 (선택)
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {collaborators.map(c => (
                <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-700 rounded-full border border-slate-200 shadow-sm text-sm font-medium">
                  <div className="w-5 h-5 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 text-xs text-slate-500">
                   {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover"/> : c.display_name?.[0]}
                  </div>
                  {c.display_name}
                  <button type="button" onClick={() => removeCollaborator(c.id)} className="text-slate-400 hover:text-rose-500 transition-colors ml-1 p-0.5 rounded-full hover:bg-rose-50">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {collaborators.length === 0 && (
                <span className="text-sm text-slate-400 py-1">추가된 공동 작성자가 없습니다.</span>
              )}
            </div>

            <div className="relative" ref={searchRef}>
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
        )}

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
            수정완료
          </button>
        </div>
      </form>
    </div>
  )
}
