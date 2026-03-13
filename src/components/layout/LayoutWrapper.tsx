'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export function LayoutWrapper({ sidebar, children }: { sidebar: React.ReactNode, children: React.ReactNode }) {
  const pathname = usePathname()
  const isBuilder = pathname === '/profile/builder'

  if (isBuilder) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      {sidebar}
      <main className="flex-1 min-w-0 max-w-4xl mx-auto w-full bg-white min-h-screen shadow-sm border-x border-slate-200">
        {children}
      </main>
    </div>
  )
}
