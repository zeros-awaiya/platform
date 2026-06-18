import { createClient as createServiceRoleClient } from '@supabase/supabase-js'

// Supabase 未設定（プレースホルダ）時はモックモード。server.js と同一判定。
export function isMockMode() {
  return (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project') ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'your-supabase-anon-key'
  )
}

// Service Role クライアント（サーバー側でのユーザープロビジョニング用）
export function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseServiceKey) {
    throw new Error('環境変数 SUPABASE_SERVICE_ROLE_KEY が設定されていません。')
  }
  return createServiceRoleClient(supabaseUrl, supabaseServiceKey)
}

// モック時はログイン中の supabase を admin として使う（従来挙動を踏襲）
export function getAdminClient(supabase) {
  return isMockMode() ? supabase : getServiceRoleClient()
}

// 配布用の仮パスワード生成
export function generateTempPassword() {
  return Math.random().toString(36).slice(-10) + 'A1!'
}

// auth ユーザー作成 → public.users へ insert → 失敗時は auth をロールバック。
// 重複チェック/ゴースト掃除/組織スコープは呼び出し側の責務。
// 戻り値: 成功 { ok:true, user, tempPassword } / 失敗 { error, authError?, profileError? }
export async function provisionUser({ supabase, adminClient, profile }) {
  const tempPassword = generateTempPassword()

  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email: profile.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name: profile.name, organization_id: profile.organization_id },
  })

  if (authError) {
    return { error: authError.message, authError }
  }

  const { error: profileError } = await supabase.from('users').insert([{
    id: authUser.user.id,
    organization_id: profile.organization_id,
    department_id: profile.department_id ?? null,
    name: profile.name,
    email: profile.email,
    role: profile.role || 'LEARNER',
    position: profile.position || null,
    is_active: true,
  }])

  if (profileError) {
    // プロファイル作成失敗時は auth ユーザーをロールバック
    await adminClient.auth.admin.deleteUser(authUser.user.id)
    return { error: profileError.message, profileError }
  }

  return { ok: true, user: authUser.user, tempPassword }
}
