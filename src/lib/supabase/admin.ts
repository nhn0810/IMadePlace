import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('서버 관리자 기능(프로필 생성, 정지, 권한 부여 등)을 사용하려면 .env.local 호스트 파일에 SUPABASE_SERVICE_ROLE_KEY 가 반드시 필요합니다.')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
