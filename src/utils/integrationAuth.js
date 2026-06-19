import crypto from 'node:crypto'

// 外部連携API（integrations/*）共通のトークン検証。
// INTEGRATION_TOKEN を Bearer で受け、定数時間比較する。

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

// Authorization: Bearer <INTEGRATION_TOKEN> を検証する。
// 戻り値: { ok: true } / { ok: false, status, message }
// 設定不備（トークン未設定）は隠さず 500 を返す。
export function verifyIntegrationToken(request) {
  const expected = process.env.INTEGRATION_TOKEN
  if (!expected) {
    return { ok: false, status: 500, message: 'integration token not configured' }
  }

  const authHeader = request.headers.get('authorization') || ''
  const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!provided || !safeTokenEquals(provided, expected)) {
    return { ok: false, status: 401, message: 'unauthorized' }
  }

  return { ok: true }
}
