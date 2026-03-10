import { createClient } from '@/lib/supabase/server'
import { PostList } from '@/components/board/PostList'
import { SearchInput } from '@/components/board/SearchInput'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Home({ searchParams }: { searchParams: { q?: string, category?: string } }) {
  const resolvedSearchParams = await searchParams
  const q = resolvedSearchParams.q || ''
  const categoryFilter = resolvedSearchParams.category || 'all'

  const supabase = await createClient()

  let query = supabase
    .from('posts')
    .select(`*, profiles:author_id (display_name, avatar_url)`)
    .order('created_at', { ascending: false })

  if (q) {
    query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`)
  }

  // If user searched for a specific category but from the main page dropdown
  if (categoryFilter !== 'all') {
    query = query.eq('category', categoryFilter)
  }

  const { data: posts, error } = await query

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 min-h-screen">
      <div className="text-center mb-10 mt-10">
        <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-4">Make Place.</h1>
        <p className="text-lg text-slate-500 font-medium">원하는 프로젝트, 아이디어, 후기를 검색해보세요</p>
      </div>
      
      <div className="mb-16">
        <SearchInput initialQuery={q} initialCategory={categoryFilter} variant="hero" />
      </div>

      <div className="mt-8 relative">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          {q ? `'${q}' 검색 결과` : '전체 최신 게시물'}
        </h2>
        {error ? (
          <div className="text-red-500">게시물을 불러오는 중 오류가 발생했습니다.</div>
        ) : (
          <PostList posts={posts || []} category="all" />
        )}
      </div>
    </div>
  )
}
