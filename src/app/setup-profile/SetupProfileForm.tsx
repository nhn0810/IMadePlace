'use client'

import { useState } from 'react'
import { createProfile } from './actions'

export function SetupProfileForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    setError(null)
    
    try {
      const result = await createProfile(formData)
      if (result?.error) {
        setError(result.error)
        setIsPending(false)
      }
    } catch (e: any) {
      setError('서버 요청 중 오류가 발생했습니다.')
      setIsPending(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="nickname" className="block text-sm font-medium text-slate-700 mb-2">
          닉네임 (최소 2자 이상)
        </label>
        <input
          type="text"
          id="nickname"
          name="nickname"
          required
          minLength={2}
          maxLength={20}
          autoComplete="off"
          disabled={isPending}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-900 disabled:opacity-50"
          placeholder="예: 홍길동"
        />
        {error && (
          <p className="mt-2 text-sm text-rose-500 font-medium">
            {error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white rounded-xl font-bold transition-all shadow-sm flex justify-center items-center"
      >
        {isPending ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            처리 중...
          </>
        ) : (
          '시작하기'
        )}
      </button>
    </form>
  )
}
