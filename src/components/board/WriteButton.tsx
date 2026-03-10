'use client'

import { useRouter } from 'next/navigation'
import { PenSquare } from 'lucide-react'

export function WriteButton({ 
  category, 
  isLoggedIn, 
  isMaster 
}: { 
  category: string; 
  isLoggedIn: boolean; 
  isMaster: boolean; 
}) {
  const router = useRouter()

  const handleClick = () => {
    if (!isLoggedIn) {
      alert("로그인해서 이어가세요.")
      router.push('/login')
      return
    }
    
    // Authorization check for 'imade' category 
    if (category === 'imade' && !isMaster) {
      alert("해당 게시판은 마스터 또는 권한이 부여된 사용자만 글을 작성할 수 있습니다.")
      return
    }

    router.push(`/board/${category}/write`)
  }

  return (
    <button 
      onClick={handleClick} 
      className="flex items-center gap-2 bg-slate-900 flex-shrink-0 hover:bg-slate-800 text-white px-5 py-2.5 rounded-full font-bold transition-colors shadow-sm whitespace-nowrap"
    >
      <PenSquare className="w-4 h-4" /> 
      글쓰기
    </button>
  )
}
