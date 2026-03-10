'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function AuthErrorPage() {
  const [errorDesc, setErrorDesc] = useState('An unknown error occurred during authentication.')

  useEffect(() => {
    // Supabase often puts OAuth errors in the URL hash instead of query string
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.substring(1)
      let params = new URLSearchParams(hash)
      
      // Fallback to query string just in case
      if (!hash) {
        params = new URLSearchParams(window.location.search)
      }

      const desc = params.get('error_description')
      if (desc) {
        setErrorDesc(desc.replace(/\+/g, ' '))
      }
    }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[60vh]">
      <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8" />
      </div>
      
      <h1 className="text-3xl font-bold text-slate-900 mb-4">Authentication Blocked</h1>
      <p className="text-slate-600 mb-8 max-w-md text-lg">{errorDesc}</p>
      
      <div className="p-5 bg-orange-50 text-orange-800 rounded-2xl mb-8 text-sm max-w-lg border border-orange-200 text-left">
        <h3 className="font-bold mb-2">🛠 Possible Causes & Fixes:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Duplicate Profile Email:</strong> You might already have a dummy user in your database with this Google Account's email. 
            <em> Fix: Go to Supabase Dashboard &rarr; Authentication &rarr; Users, and delete your old test users.</em>
          </li>
          <li>
            <strong>Missing Google Profile Info:</strong> Google didn't return a name or avatar. 
            <em> Fix: The newest SQL trigger patch handles this safely.</em>
          </li>
        </ul>
      </div>
      
      <Link 
        href="/login" 
        className="px-8 py-3.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-sm"
      >
        Return to Login
      </Link>
    </div>
  )
}
