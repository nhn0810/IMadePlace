'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search } from 'lucide-react'

const CATEGORIES = [
  { id: 'all', name: '전체 게시판' },
  { id: 'imade', name: '내가 만든' },
  { id: 'youmake', name: '네가 만들' },
  { id: 'iuse', name: '내가 쓰는' },
]

const SCOPES = [
  { id: 'all', name: '통합 검색' },
  { id: 'title', name: '제목' },
  { id: 'author', name: '작성자 (협업자 포함)' },
  { id: 'project', name: '프로젝트명' },
]

export function SearchInput({ 
  initialQuery = '', 
  initialCategory = 'all',
  initialScope = 'all',
  variant = 'hero'
}: { 
  initialQuery?: string, 
  initialCategory?: string,
  initialScope?: string,
  variant?: 'hero' | 'compact'
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [query, setQuery] = useState(initialQuery)
  const [category, setCategory] = useState(initialCategory)
  const [scope, setScope] = useState(initialScope)
  const [isScrolled, setIsScrolled] = useState(false)

  // Listen to scroll to shrink the search bar
  useEffect(() => {
    if (variant === 'compact') return // Compact variant doesn't need shrinking logic

    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [variant])

  // Sync state with URL params if they change externally (e.g. back button)
  useEffect(() => {
    setQuery(searchParams.get('q') || '')
    setScope(searchParams.get('scope') || 'all')
    
    // Auto-detect category from pathname if we are on a board page
    if (pathname.startsWith('/board/')) {
      const boardCat = pathname.replace('/board/', '')
      if (['imade', 'youmake', 'iuse'].includes(boardCat)) {
        setCategory(boardCat)
      }
    } else {
      setCategory(searchParams.get('category') || 'all')
    }
  }, [searchParams, pathname])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (category !== 'all') params.set('category', category)
    if (scope !== 'all') params.set('scope', scope)
    
    router.push(`/search?${params.toString()}`)
  }

  // Determine styles based on state
  const isCompact = variant === 'compact' || isScrolled
  const containerClasses = isCompact 
    ? 'py-3 px-4 shadow-sm border border-slate-200' 
    : 'py-6 px-6 shadow-xl border border-emerald-100 shadow-emerald-500/5'

  const inputSizeClasses = isCompact ? 'h-12 text-base' : 'h-16 text-lg'
  const buttonSizeClasses = isCompact ? 'px-6 py-2.5' : 'px-8 py-4 text-lg'

  return (
    <div className={`sticky top-6 z-20 transition-all duration-300 w-full max-w-3xl mx-auto
                     ${isCompact ? 'mt-0 mb-6' : 'mt-10 mb-12'}`}>
      <form 
        onSubmit={handleSearch}
        className={`bg-white/80 backdrop-blur-xl rounded-3xl transition-all duration-300 flex flex-col md:flex-row gap-3 ${containerClasses}`}
      >
        <div className="flex-1 flex items-center bg-slate-50/50 hover:bg-slate-50 border border-slate-200 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 rounded-2xl transition-all overflow-hidden flex-wrap md:flex-nowrap">
          {/* Category Dropdown */}
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`bg-transparent font-medium border-0 focus:ring-0 text-slate-600 pl-4 py-3 cursor-pointer outline-none min-w-[120px] ${inputSizeClasses}`}
          >
            {CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          
          <div className="w-[1px] h-8 bg-slate-200 hidden md:block"></div>

          {/* Scope Dropdown */}
          <select 
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className={`bg-transparent font-medium border-0 focus:ring-0 text-slate-600 pl-4 py-3 cursor-pointer outline-none min-w-[140px] ${inputSizeClasses}`}
          >
            {SCOPES.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          
          <div className="w-[1px] h-8 bg-slate-200 hidden md:block"></div>

          {/* Search Input */}
          <div className="flex-1 flex items-center w-full min-w-[200px]">
            <Search className={`text-slate-400 ml-4 hidden md:block ${isCompact ? 'w-5 h-5' : 'w-6 h-6'}`} />
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="무엇을 찾고 계신가요?"
              className={`w-full bg-transparent border-0 focus:ring-0 pl-4 pr-4 outline-none placeholder:text-slate-400 font-medium text-slate-800 ${inputSizeClasses}`}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button 
          type="submit"
          className={`bg-slate-900 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-colors shadow-sm flex-shrink-0 whitespace-nowrap ${buttonSizeClasses}`}
        >
          검색
        </button>
      </form>
    </div>
  )
}
