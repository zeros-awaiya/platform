import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { ROLE_HOME } from '@/lib/constants'

// 認証済みユーザーの public.users プロファイルを取得（page.js と同一パターン）
async function getProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }

  const { data: profile } = await supabase
    .from('users')
    .select('id, role, is_active, organization_id')
    .eq('id', user.id)
    .single()

  return { supabase, user, profile }
}

// Server Component / Layout 用：認証＋ロールを強制し、不適合はリダイレクトする。
// 正常時は profile を返す（呼び出し側で organization_id 等を再利用可能）。
export async function requireRole(allowedRoles) {
  const { supabase, user, profile } = await getProfile()

  if (!user) redirect('/login')

  // 認証ユーザーは居るが public.users が無い／無効化済み → サインアウトして /login
  if (!profile || profile.is_active === false) {
    await supabase.auth.signOut()
    redirect('/login')
  }

  if (!allowedRoles.includes(profile.role)) {
    redirect(ROLE_HOME[profile.role] || '/dashboard')
  }

  return profile
}

// Server Action 用：リダイレクトせず結果を返す。呼び出し側は { error } を
// 既存UXと同じ形で利用できる。成功時は { ok: true, profile }。
export async function assertRole(allowedRoles) {
  const { user, profile } = await getProfile()

  if (!user) return { ok: false, error: '認証セッションがありません。' }
  if (!profile) return { ok: false, error: 'プロファイルが見つかりません。' }
  if (profile.is_active === false) return { ok: false, error: 'アカウントが無効です。' }
  if (!allowedRoles.includes(profile.role)) {
    return { ok: false, error: '権限がありません。' }
  }

  return { ok: true, profile }
}
