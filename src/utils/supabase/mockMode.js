// Supabase 未設定（プレースホルダ）時はモックモード。
// この判定の正本はここだけ。server.js / admin.js / middleware.js / api/health が参照する。
export function isMockMode() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  return !url || url.includes('your-supabase-project') || !key || key === 'your-supabase-anon-key'
}
