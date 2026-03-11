import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Target, CalendarDays, Users } from 'lucide-react'
import { ApplicantList } from '@/components/board/ApplicantList'

export default async function MyProjectsPage() {
  const supabase = await createClient()

  // Ensure user is logged in
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect('/?login=true')
  }

  // Fetch 'You Make -> 같이 하자' posts created by the user
  const { data: projects, error } = await supabase
    .from('posts')
    .select(`
      id, 
      category,
      title, 
      project_name, 
      recruitment_end_date, 
      created_at, 
      status,
      project_participants (
        id, 
        user_id, 
        status, 
        created_at,
        profiles (
          id, 
          display_name, 
          avatar_url
        )
      )
    `)
    .eq('author_id', session.user.id)
    .eq('post_type', '같이 하자')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch projects:', error)
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href="/"
          className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
           <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             <Target className="w-7 h-7 text-emerald-500" />
             나의 프로젝트 관리
           </h1>
           <p className="text-slate-500 mt-1 font-medium text-sm">내가 올린 모집글에 신청한 팀원들을 수락하고 거절할 수 있습니다.</p>
        </div>
      </div>

      <div className="space-y-8">
        {!projects || projects.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <h3 className="text-lg font-bold text-slate-700 mb-2">진행 중인 프로젝트가 없습니다</h3>
            <p className="text-slate-500 text-sm">You Make(요청과 의뢰) 게시판에서 '같이 하자' 카테고리로 새로운 프로젝트 팀원을 모집해 보세요.</p>
            <Link href="/board/youmake/write" className="inline-block mt-6 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors shadow-sm">
              프로젝트 모집하기
            </Link>
          </div>
        ) : (
          projects.map((project: any) => {
            const applicants = project.project_participants || []
            const isClosed = project.recruitment_end_date && new Date(project.recruitment_end_date) < new Date()
            const acceptedCount = applicants.filter((a: any) => a.status === 'accepted').length

            return (
              <div key={project.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                     <div>
                       <div className="flex items-center gap-3 mb-3">
                         <span className="text-emerald-600 font-bold uppercase tracking-wider text-xs bg-emerald-100/50 px-3 py-1 rounded-full border border-emerald-100">
                           {project.project_name || '이름 없음'}
                         </span>
                         {isClosed ? (
                           <span className="text-slate-500 font-bold text-xs bg-slate-200 px-3 py-1 rounded-full">모집 마감</span>
                         ) : (
                           <span className="text-emerald-600 font-bold text-xs bg-emerald-100 px-3 py-1 rounded-full animate-pulse">모집 중</span>
                         )}
                       </div>
                       <Link href={`/board/${project.category}/${project.id}`} className="text-xl sm:text-2xl font-bold text-slate-900 hover:text-emerald-600 transition-colors line-clamp-1 block">
                         {project.title}
                       </Link>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-6 mt-4 text-sm font-medium text-slate-500">
                     <span className="flex items-center gap-2"><CalendarDays className="w-4 h-4" /> {new Date(project.created_at).toLocaleDateString()} 작성</span>
                     <span className="flex items-center gap-2"><Users className="w-4 h-4 text-emerald-500" /> 총 지원자 {applicants.length}명 (수락됨: {acceptedCount}명)</span>
                  </div>
                </div>
                
                <div className="p-6 sm:p-8 bg-slate-50/20">
                   <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                     신청자 목록
                   </h3>
                   <ApplicantList initialParticipants={applicants} postId={project.id} />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
