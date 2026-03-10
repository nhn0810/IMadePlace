import { createClient } from '@/lib/supabase/server'
import { PostList } from '@/components/board/PostList'
import { Search as SearchIcon } from 'lucide-react'

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const resolvedSearchParams = await searchParams
  const q = resolvedSearchParams.q || ''

  const supabase = await createClient()

  let posts: any[] = []
  
  if (q.trim()) {
    // Basic ilike search on title. For full text search, we'd use .textSearch()
    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:author_id (display_name, avatar_url)
      `)
      .ilike('title', `%${q}%`)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (data) posts = data
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <header className="mb-10 pb-6 border-b border-slate-200">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-6 flex items-center gap-3">
          <SearchIcon className="w-8 h-8 text-emerald-500" />
          Search Make Place
        </h1>
        
        <form action="/search" method="GET" className="relative group">
          <SearchIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
          <input 
            type="text" 
            name="q"
            defaultValue={q}
            placeholder="Search for projects, ideas, or reviews..." 
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-medium text-slate-900"
            autoComplete="off"
            autoFocus
          />
        </form>
      </header>

      {q.trim() ? (
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-slate-700">
            Results for <span className="text-slate-900 font-bold">"{q}"</span> ({posts.length})
          </h2>
          <PostList posts={posts} category="search" />
        </div>
      ) : (
        <div className="py-20 text-center text-slate-500">
          Enter a search term above to find posts.
        </div>
      )}
    </div>
  )
}
