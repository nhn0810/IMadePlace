'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { notFound, useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, LayoutList, ArrowLeft, Lock, Loader2, Award, Briefcase, AlignLeft, Layout, FileText } from 'lucide-react'
import { PostList } from '@/components/board/PostList'

export default function PublicProfilePage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string
  const activeTab = searchParams.get('tab') || 'posts'

  const [profile, setProfile] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [subTab, setSubTab] = useState('all') // all, imade, youmake, iuse

  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setCurrentUser(session.user)

      const { data: pData, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, role, hide_comments, bio, skills, work_history, intro_sections, show_resume')
        .eq('id', id)
        .single()

      if (error || !pData) {
        notFound()
        return
      }
      setProfile(pData)

      if (activeTab === 'posts') {
        let query = supabase
          .from('posts')
          .select(`*, profiles:author_id (display_name, avatar_url)`)
          .or(`author_id.eq.${id},collaborator_ids.cs.{"${id}"}`)

        if (subTab !== 'all') {
          query = query.eq('category', subTab)
        }

        const { data } = await query.order('created_at', { ascending: false })
        if (data) setPosts(data)
      } else if (activeTab === 'comments' && !pData.hide_comments) {
        const { data } = await supabase
          .from('comments')
          .select(`
            *,
            post:post_id (id, title, category)
          `)
          .eq('author_id', id)
          .order('created_at', { ascending: false })
        if (data) setComments(data)
      }
      
      setIsLoading(false)
    }
    loadData()
  }, [id, activeTab, subTab, supabase])

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
  }

  if (!profile) return null

  const isMe = currentUser?.id === id

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-6">
        <button onClick={() => router.back()} className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-colors">
           <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Profile Header */}
      <header className="mb-10 p-8 bg-white rounded-3xl border border-slate-200 flex flex-col items-center text-center shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-emerald-500/10 -z-10"></div>
        
        <div className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-slate-200 overflow-hidden mb-4 z-10 flex-shrink-0">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl font-bold">
              {profile.display_name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-1 z-10 flex items-center gap-2">
           {profile.display_name}
           {isMe && <span className="text-emerald-500 text-sm font-bold">(나)</span>}
        </h1>
        
        <div className="flex items-center gap-2 mb-6 z-10 mt-2">
          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase tracking-widest">
            {profile.role === 'master' ? '운영자' : profile.role === 'admin' ? '개발자' : profile.role === 'user' ? '사용자' : '게스트'}
          </span>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2 z-10">
          {isMe ? (
            <>
              <Link href="/profile/resume" className="px-5 py-2.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold transition-colors text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" />
                정보 관리
              </Link>
              <Link href="/profile/builder" className="px-5 py-2.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 font-bold transition-all text-sm flex items-center gap-2 shadow-md active:scale-95">
                <Layout className="w-4 h-4" />
                포트폴리오 빌더
              </Link>
            </>
          ) : (
            <Link href={`/messages/${id}`} className="px-5 py-2.5 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 font-bold transition-colors text-sm flex items-center gap-2 shadow-sm">
              <MessageSquare className="w-4 h-4" />
              Direct Message 보내기
            </Link>
          )}
        </div>

        {/* Resume Content (Public or Me) */}
        {(profile.show_resume || isMe) && (
          <div className="w-full mt-8 pt-8 border-t border-slate-100 text-left space-y-8">
            {profile.bio && (
              <div className="relative p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <AlignLeft className="w-4 h-4 text-emerald-500 absolute top-4 left-4" />
                <p className="pl-6 text-slate-700 font-medium whitespace-pre-wrap">{profile.bio}</p>
              </div>
            )}

            {profile.skills && profile.skills.length > 0 && (
              <div>
                <h3 className="flex items-center gap-2 text-sm font-black text-slate-800 mb-4 px-2">
                  <Award className="w-4 h-4 text-emerald-500" />
                  Technical Skills
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(profile.skills as any[]).map((s: any, i: number) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-700">{s.name}</span>
                        <span className="text-[10px] font-black text-emerald-500">{s.level}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${s.level}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.work_history && profile.work_history.length > 0 && (
              <div>
                <h3 className="flex items-center gap-2 text-sm font-black text-slate-800 mb-4 px-2">
                  <Briefcase className="w-4 h-4 text-emerald-500" />
                  Work Experience
                </h3>
                <div className="space-y-4">
                  {(profile.work_history as any[]).map((h: any, i: number) => (
                    <div key={i} className="flex gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                      <div className="w-1.5 h-full bg-emerald-500 absolute left-0 top-0"></div>
                      <div className="min-w-[80px]">
                        <div className="text-xs font-black text-emerald-600">{h.year}</div>
                        {h.duration && <div className="text-[10px] text-slate-400">{h.duration}</div>}
                      </div>
                      <div className="flex-1 text-sm text-slate-700 font-medium">{h.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.intro_sections && Object.entries(profile.intro_sections).some(([_, val]) => !!val) && (
              <div className="space-y-4">
                {Object.entries(profile.intro_sections).map(([q, a], i) => a && (
                  <div key={i} className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                    <h4 className="text-xs font-black text-emerald-700 mb-2">Q. {q}</h4>
                    <p className="text-sm text-slate-700 leading-relaxed">{a as string}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-slate-200">
        <Link 
          href={`/profile/${id}?tab=posts`}
          className={`px-6 py-4 font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'posts' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <LayoutList className="w-4 h-4" /> 남긴 게시물 (참여 포함)
        </Link>
        <Link 
          href={`/profile/${id}?tab=comments`}
          className={`px-6 py-4 font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'comments' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <MessageSquare className="w-4 h-4" /> 남긴 댓글
        </Link>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'posts' && (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { id: 'all', label: '전체' },
                { id: 'imade', label: 'I made' },
                { id: 'youmake', label: 'You make' },
                { id: 'iuse', label: 'I use' }
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setSubTab(sub.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    subTab === sub.id 
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-200 hover:bg-emerald-50/50'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
            {posts.length === 0 ? (
              <div className="text-center py-20 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <p className="text-slate-500">작성한 게시물이 없습니다.</p>
              </div>
            ) : (
              <PostList posts={posts} category="profile" />
            )}
          </>
        )}
        
        {activeTab === 'comments' && (
          <div className="space-y-4">
            {profile.hide_comments ? (
               <div className="text-center py-24 px-4 bg-slate-50 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
                 <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-4">
                   <Lock className="w-8 h-8 text-slate-300" />
                 </div>
                 <p className="text-slate-700 font-bold text-lg mb-1">잠겨있는 컨텐츠입니다.</p>
                 <p className="text-slate-500 text-sm">사용자가 댓글 프라이버시를 보호하기 위해 숨김 처리했습니다.</p>
               </div>
            ) : comments.length === 0 ? (
               <div className="text-center py-20 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                 <p className="text-slate-500">아직 작성한 댓글이 없습니다.</p>
               </div>
            ) : (
              comments.map((c: any) => (
                <div key={c.id} className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 transition-colors">
                  <div className="text-xs text-slate-400 mb-2 truncate">
                    Commented on:{' '}
                    <Link href={`/board/${c.post?.category}/${c.post_id}`} className="text-emerald-500 hover:underline">
                      {c.post?.title || 'Deleted Post'}
                    </Link>
                  </div>
                  <p className="text-slate-700">{c.content}</p>
                  <div className="text-xs text-slate-400 mt-3">
                    {new Date(c.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
