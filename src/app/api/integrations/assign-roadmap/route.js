import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/utils/supabase/admin'

// 外部（ZEROS-AI 診断）からのロードマップ割当連携。
// セッション無しのため RLS をバイパスする service_role を使用する。
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// band → ロードマップ固定UUID（supabase/seed_roadmaps_per_level.sql と一致）
const BAND_TO_LEARNING_PATH_ID = {
  L1: 'e2010000-0000-4000-8000-000000000000',
  L2: 'e2020000-0000-4000-8000-000000000000',
  L3: 'e2030000-0000-4000-8000-000000000000',
}

// 定数時間比較。長さ不一致でもタイミングを漏らさない。
function safeTokenEquals(provided, expected) {
  const a = Buffer.from(provided, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  // timingSafeEqual は同長必須。両者を同長に正規化してから比較し、
  // 長さ一致も timingSafeEqual の結果に AND する。
  const len = Math.max(a.length, b.length)
  const pa = Buffer.alloc(len)
  const pb = Buffer.alloc(len)
  a.copy(pa)
  b.copy(pb)
  return crypto.timingSafeEqual(pa, pb) && a.length === b.length
}

function json(status, body) {
  return NextResponse.json(body, { status })
}

export async function POST(request) {
  // 1. トークン検証（設定不備は隠さず 500）
  const expected = process.env.INTEGRATION_TOKEN
  if (!expected) {
    console.error('[assign-roadmap] INTEGRATION_TOKEN が未設定です（設定不備）。')
    return json(500, { status: 'error', message: 'integration token not configured' })
  }

  const authHeader = request.headers.get('authorization') || ''
  const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!provided || !safeTokenEquals(provided, expected)) {
    return json(401, { status: 'error', message: 'unauthorized' })
  }

  // 2. body parse / バリデーション
  let body
  try {
    body = await request.json()
  } catch {
    return json(400, { status: 'error', message: 'invalid json body' })
  }

  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const band = typeof body?.band === 'string' ? body.band : ''
  if (!email || !band) {
    return json(400, { status: 'error', message: 'email and band are required' })
  }

  const learningPathId = BAND_TO_LEARNING_PATH_ID[band]
  if (!learningPathId) {
    return json(400, { status: 'error', message: 'invalid band' })
  }

  // 3. service_role で email 突合 → 冪等 upsert
  try {
    const supabase = getServiceRoleClient()

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (userError) throw userError

    if (!user) {
      // MVP は既存ユーザーのみ。未プロビジョニングはエラーにしない。
      console.info('[assign-roadmap] user not provisioned for band=%s', band)
      return json(200, { status: 'not_provisioned' })
    }

    const { error: upsertError } = await supabase
      .from('user_learning_paths')
      .upsert(
        { user_id: user.id, learning_path_id: learningPathId },
        { onConflict: 'user_id,learning_path_id' },
      )

    if (upsertError) throw upsertError

    return json(200, { status: 'assigned', learning_path_id: learningPathId })
  } catch (error) {
    // 握りつぶさない。スタックは漏らさず message のみ構造化ログに残す。
    console.error('[assign-roadmap] assignment failed:', error?.message || error)
    return json(500, { status: 'error', message: 'assignment failed' })
  }
}
