'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AuthButton } from './AuthButton'
import { VisitorStats } from './VisitorStats'
import { NotificationBell } from './NotificationBell'
import { PenTool, Target, Compass, MessageCircle, ShieldAlert, Menu, X } from 'lucide-react'

// Since AuthButton and VisitorStats might be server components or have async behavior,
// we receive profile data from the parent layout where this Client component will be mounted.
export function SidebarClient({ profile }: { profile: any }) {
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { name: 'I made', href: '/board/imade', icon: PenTool, description: '결과물 저장소' },
    { name: 'You make', href: '/board/youmake', icon: Target, description: '요청과 의뢰' },
    { name: 'I use', href: '/board/iuse', icon: Compass, description: '사용경험 공유' },
  ]

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

  return (
    <>
      {/* 
        Mobile Top bar 
        Visible only on small screens < md
      */}
      <div className="md:hidden sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm w-full">
        <Link href="/" className="flex items-baseline gap-1" onClick={closeMenu}>
          <h1 className="text-xl font-black tracking-tight text-slate-900">Make Place.</h1>
        </Link>
        <div className="flex items-center gap-3">
          {profile && <NotificationBell userId={profile.id} />}
          <button onClick={toggleMenu} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* 
        Navigation Container 
        Mobile: Dropdown overlay 
        Desktop: Fixed sidebar 
      */}
      <aside className={`
        fixed inset-0 top-[60px] z-[45] bg-white md:bg-white/50 md:backdrop-blur-xl 
        md:static md:w-64 md:border-r md:border-slate-200 md:h-screen md:sticky md:top-0 
        flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Desktop Header Area (No overflow to allow Notification dropdown) */}
        <div className="p-6 pb-2 flex-shrink-0">
          <Link href="/" className="hidden md:block mb-8">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Make Place.</h1>
            <p className="text-sm text-slate-500 font-medium">개인 포스팅 플랫폼</p>
          </Link>

          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-0">
              <AuthButton user={profile} />
            </div>
            <div className="hidden md:block flex-shrink-0 static z-[100]">
               {profile && <NotificationBell userId={profile.id} />}
            </div>
          </div>
        </div>

        {/* Scrollable Nav Area */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 outline-none flex flex-col">
          <nav className="flex-1 space-y-2 mt-4">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={closeMenu}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group break-words min-w-0"
                >
                  <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors text-slate-500 flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-700 group-hover:text-slate-900 leading-none mb-1 text-sm mt-[6px] truncate">
                      {item.name}
                    </div>
                    <div className="text-xs text-slate-400 break-words line-clamp-2">{item.description}</div>
                  </div>
                </Link>
              )
            })}
          </nav>

          {/* Messages & Admin Links */}
          <div className="mt-8 space-y-3 flex-shrink-0">
            {profile && (
              <Link
                href="/messages"
                onClick={closeMenu}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-xl text-xs font-bold transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Direct Messages
              </Link>
            )}

            {profile && (profile.role === 'master' || profile.role === 'admin') && (
              <Link
                href="/admin/users"
                onClick={closeMenu}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
              >
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                사용자 관리
              </Link>
            )}

            <Link
              href="/developers"
              onClick={closeMenu}
              className="mt-2 w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 py-2.5 px-4 rounded-xl font-semibold transition-colors text-sm border border-emerald-100/50"
            >
              <MessageCircle className="w-4 h-4" />
              개발자와 1:1 문의
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200 flex-shrink-0">
            <VisitorStats />
          </div>
        </div>
      </aside>
    </>
  )
}
