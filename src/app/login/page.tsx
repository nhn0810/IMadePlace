'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogIn } from 'lucide-react'

export default function LoginPage() {
  const [consent, setConsent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setIsLoading(true)

    // Quick workaround to store consent state before redirecting to Google
    document.cookie = `temp_auto_login_consent=${consent}; path=/; max-age=3600; SameSite=Lax`

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })

    if (error) {
      console.error('Error logging in:', error.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">환영합니다</h1>
          <p className="text-slate-500">Google 계정으로 로그인하세요</p>
        </div>

        <div className="mb-6 flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="pt-1">
            <input
              type="checkbox"
              id="autoLogin"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="w-4 h-4 text-emerald-500 bg-white border-slate-300 rounded focus:ring-emerald-500 focus:ring-2"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="autoLogin" className="font-medium text-slate-900 block mb-1">
              로그인 상태 유지
            </label>
            <p className="text-sm text-slate-500 leading-relaxed">
              체크시 이 기기에서 항상 로그인 상태를 유지합니다. 해제하면 다음 접속 시 다시 로그인해야 할 수 있습니다.
            </p>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-medium py-3 px-4 rounded-full transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-5 h-5 text-emerald-500" />
              구글 계정으로 로그인 (Sign in with Google)
            </>
          )}
        </button>
      </div>
    </div>
  )
}
