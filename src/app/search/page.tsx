import { createClient } from '@/lib/supabase/server'
import { PostList } from '@/components/board/PostList'
import { Search as SearchIcon } from 'lucide-react'
import { SearchInput } from '@/components/board/SearchInput'

export default async function SearchPage({ searchParams }: { searchParams: { q?: string, category?: string, scope?: string } }) {
  const resolvedSearchParams = await searchParams
  const q = resolvedSearchParams.q || ''
  const category = resolvedSearchParams.category || 'all'
  const scope = resolvedSearchParams.scope || 'all'

  const supabase = await createClient()

  let posts: any[] = []
  
  if (q.trim()) {
    let queryBuilder = supabase
      .from('posts')
      .select(`
        *,
        profiles:author_id (display_name, avatar_url)
      `)

    if (category !== 'all') {
       queryBuilder = queryBuilder.eq('category', category)
    }

    let orConditions: string[] = []

    if (scope === 'title' || scope === 'all') {
      orConditions.push(`title.ilike.%${q}%`)
    }

    if (scope === 'project' || scope === 'all') {
      orConditions.push(`project_name.ilike.%${q}%`)
    }

    if (scope === 'author' || scope === 'all') {
      // Find users matching search
      const { data: users } = await supabase.from('profiles').select('id').ilike('display_name', `%${q}%`)
      const userIds = users?.map(u => u.id) || []
      
      if (userIds.length > 0) {
        orConditions.push(`author_id.in.(${userIds.join(',')})`)
        
        // Find posts where these users are accepted participants
        const { data: participants } = await supabase.from('project_participants')
           .select('post_id')
           .in('user_id', userIds)
           .eq('status', 'accepted')
        const postIds = participants?.map(p => p.post_id) || []
        
        if (postIds.length > 0) {
          orConditions.push(`id.in.(${postIds.join(',')})`)
        }
      }
    }

    // Attempt to build final query if 'all', and nothing matched author, we still want to search title/project
    // If scope was 'author' and we found no users, then the overall result should probably just be empty, 
    // but the query builder needs an `or` condition. If orConditions is empty, we force a false match.
    if (orConditions.length > 0) {
      queryBuilder = queryBuilder.or(orConditions.join(','))
      
      const { data } = await queryBuilder
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (data) posts = data
    } else if (scope === 'author') {
      // Scope isolated to author but no author name matched
      posts = []
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <header className="mb-10 pb-6 border-b border-slate-200">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-6 flex items-center gap-3">
          <SearchIcon className="w-8 h-8 text-emerald-500" />
          통합 검색
        </h1>
        
        <div className="mt-4">
          <SearchInput initialQuery={q} initialCategory={category} initialScope={scope} variant="compact" />
        </div>
      </header>

      {q.trim() ? (
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-slate-700">
             <span className="text-slate-900 font-bold">"{q}"</span> 검색 결과 ({posts.length}개)
          </h2>
          <PostList posts={posts} category={category === 'all' ? 'search' : category} />
        </div>
      ) : (
        <div className="py-20 text-center text-slate-500">
          위 검색창을 이용해 게시물을 찾아보세요.
        </div>
      )}
    </div>
  )
}
