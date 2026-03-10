import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PostList } from '@/components/board/PostList'
import { WriteButton } from '@/components/board/WriteButton'
import { SearchInput } from '@/components/board/SearchInput'

const CATEGORY_NAMES: Record<string, { title: string, subtitle: string, description: string }> = {
  imade: { title: 'I made.', subtitle: '내가 만든.', description: '직접 제작한 프로젝트와 결과물을 모아둔 곳입니다.' },
  youmake: { title: 'You make.', subtitle: '네가 만들.', description: '원하는 아이디어나 의뢰 사항을 남겨주세요.' },
  iuse: { title: 'I use.', subtitle: '내가 쓰는.', description: '우리가 써본 아이템의 후기와 개선점을 공유합니다.' },
}

export default async function BoardPage({ 
  params,
  searchParams
}: { 
  params: { category: string }
  searchParams: { sort?: string; q?: string }
}) {
  const resolvedParams = await params
  const category = resolvedParams.category
  const info = CATEGORY_NAMES[category]

  if (!info) notFound()

  const resolvedSearchParams = await searchParams
  const sort = resolvedSearchParams.sort === 'popular' ? 'view_count' : 'created_at'
  const q = resolvedSearchParams.q || ''

  const supabase = await createClient()

  let query = supabase
    .from('posts')
    .select(`*, profiles:author_id (display_name, avatar_url)`)
    .eq('category', category)
    .order(sort, { ascending: false })

  if (q) {
    query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`)
  }

  const { data: posts, error } = await query

  const { data: { session } } = await supabase.auth.getSession()
  let profile = null
  let isMasterOrAdmin = false
  if (session) {
    const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
    profile = p
    isMasterOrAdmin = profile?.role === 'master' || profile?.role === 'admin'
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <header className="mb-8 flex border-b border-slate-200 pb-6">
        <div className="flex-1">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2 flex items-baseline gap-3">
            {info.title}
            <span className="text-xl font-medium text-slate-400">{info.subtitle}</span>
          </h1>
          <p className="text-slate-500 text-lg">{info.description}</p>
        </div>
        
        <WriteButton 
          category={category} 
          isLoggedIn={!!session} 
          isMaster={isMasterOrAdmin} 
        />
      </header>

      <div className="mb-6 -mx-2">
        <SearchInput initialQuery={q} initialCategory={category} variant="compact" />
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <Link href={`/board/${category}?sort=recent${q ? `&q=${q}` : ''}`} className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${sort === 'created_at' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'}`}>최신순</Link>
          <Link href={`/board/${category}?sort=popular${q ? `&q=${q}` : ''}`} className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${sort === 'view_count' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'}`}>인기순</Link>
        </div>
        {q && (
          <div className="text-sm font-medium text-slate-500">
            '{q}' 검색 결과
          </div>
        )}
      </div>

      {error ? <div className="text-red-500">Error loading posts.</div> : <PostList posts={posts || []} category={category} />}
    </div>
  )
}
