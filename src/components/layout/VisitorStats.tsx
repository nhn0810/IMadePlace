import { useEffect, useState, useRef } from 'react'
import { Users } from 'lucide-react'

export function VisitorStats() {
  const [stats, setStats] = useState({ today: 0, total: 0 }) 
  const hasCalled = useRef(false)

  useEffect(() => {
    async function fetchAndIncrement() {
      if (hasCalled.current) return
      hasCalled.current = true

      try {
        const todayDate = new Date().toISOString().split('T')[0]
        const visitKey = `visited_${todayDate}`
        const hasVisitedToday = localStorage.getItem(visitKey)

        // Optimistically set to prevent concurrent tabs if possible
        if (!hasVisitedToday) {
          localStorage.setItem(visitKey, 'true')
        }

        const res = await fetch(`/api/visitors?increment=${!hasVisitedToday}`)

        if (res.ok) {
          const data = await res.json()
          setStats({ today: data.today, total: data.total })
        }
      } catch (e) {
        console.error('Visitor stat error', e)
      }
    }

    fetchAndIncrement()
  }, [])

  return (
    <div className="mt-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
      <div className="flex items-center gap-2 text-slate-500 mb-3">
        <Users className="w-4 h-4" />
        <span className="text-sm font-medium text-slate-600">방문자 통계</span>
      </div>
      <div className="flex justify-between items-end">
        <div>
          <p className="text-xs text-slate-400 mb-1">오늘</p>
          <p className="text-lg font-bold text-emerald-500">{stats.today}</p>
        </div>
        <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
        <div className="text-right">
          <p className="text-xs text-slate-400 mb-1">전체</p>
          <p className="text-lg font-bold text-slate-700">{stats.total}</p>
        </div>
      </div>
    </div>
  )
}
