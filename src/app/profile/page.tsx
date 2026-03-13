import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, LayoutList, LogOut, Settings, FileText, Layout } from 'lucide-react'
import { PostList } from '@/components/board/PostList'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProfilePage({ searchParams }: { searchParams: { tab?: string } }) {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect('/login')
  }

  let { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  // Ensure profile exists, otherwise redirect to create one
  if (!profile) {
    redirect('/setup-profile')
  }

  const resolvedSearchParams = await searchParams
  const activeTab = resolvedSearchParams.tab || 'posts'

  let posts: any[] = []
  let comments: any[] = []

  if (activeTab === 'posts') {
    const { data } = await supabase
      .from('posts')
      .select(`*, profiles:author_id (display_name, avatar_url)`)
      .eq('author_id', session.user.id)
      .order('created_at', { ascending: false })
    if (data) posts = data
  } else if (activeTab === 'comments') {
    const { data } = await supabase
      .from('comments')
      .select(`
        *,
        post:post_id (id, title, category)
      `)
      .eq('author_id', session.user.id)
      .order('created_at', { ascending: false })
    if (data) comments = data
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Profile Header */}
      <header className="mb-10 p-8 bg-white rounded-3xl border border-slate-200 flex flex-col items-center text-center shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-emerald-500/10 -z-10"></div>
        
        <div className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-slate-200 overflow-hidden mb-4 z-10">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl font-bold">
              {profile.display_name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-1 z-10">{profile.display_name}</h1>
        <p className="text-slate-500 mb-1 z-10">{profile.email}</p>
        <div className="flex items-center gap-2 mb-6 z-10">
          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase tracking-widest">
            {profile.role === 'master' ? '운영자' : profile.role === 'admin' ? '개발자' : profile.role === 'user' ? '사용자' : '게스트'}
          </span>
          {profile.auto_login_consent && (
            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold uppercase tracking-widest">
              Auto-login: ON
            </span>
          )}
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2 z-10">
          <Link href="/messages" className="px-5 py-2.5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-medium transition-colors text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Direct Messages
          </Link>
          <Link href="/profile/resume" className="px-5 py-2.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" />
            포트폴리오 정보
          </Link>
          <Link href="/profile/builder" className="px-5 py-2.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 font-bold transition-all text-sm flex items-center gap-2 shadow-md active:scale-95">
            <Layout className="w-4 h-4" />
            포트폴리오 빌더
          </Link>
          <Link href="/settings" className="px-5 py-2.5 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium transition-colors text-sm flex items-center gap-2">
            <Settings className="w-4 h-4" />
            설정
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className="px-5 py-2.5 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 font-medium transition-colors text-sm flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          </form>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-slate-200">
        <Link 
          href="/profile?tab=posts"
          className={`px-6 py-4 font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'posts' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <LayoutList className="w-4 h-4" /> 내 게시물
        </Link>
        <Link 
          href="/profile?tab=comments"
          className={`px-6 py-4 font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'comments' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <MessageSquare className="w-4 h-4" /> 내 댓글
        </Link>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'posts' && (
          <PostList posts={posts} category="profile" />
        )}
        
        {activeTab === 'comments' && (
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-20 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <p className="text-slate-500">아직 작성하신 댓글이 없습니다.</p>
              </div>
            ) : (
              comments.map(c => (
                <div key={c.id} className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 transition-colors">
                  <div className="text-xs text-slate-400 mb-2 truncate">
                    Commented on:{' '}
                    <Link href={`/board/${c.post.category}/${c.post_id}`} className="text-emerald-500 hover:underline">
                      {c.post.title || 'Deleted Post'}
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
