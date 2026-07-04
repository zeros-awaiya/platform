// リファクタリング安全網スモークテスト（docs/refactoring-plan-20260703.md 項目0-3）
// 前提: 別ターミナルで `npm run dev` 起動済み（http://localhost:3000、モックモード）
// 使い方: node scripts/smoke.mjs

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3000'

const checks = [
  {
    // 計画書は200を期待していたが、page.js は未認証を /login へ redirect する実装
    // （src/app/page.js:11-13）。特性テストとして実挙動(307)を固定する。
    id: 'S1',
    desc: 'GET / (no cookie) → 307 to /login',
    run: async () => {
      const res = await fetch(`${BASE}/`, { redirect: 'manual' })
      if (res.status !== 307) return `status ${res.status} (expected 307)`
      const loc = res.headers.get('location') || ''
      return loc.includes('/login') || `Location "${loc}" does not include /login`
    },
  },
  {
    id: 'S2',
    desc: 'GET /login → 200',
    run: async () => {
      const res = await fetch(`${BASE}/login`, { redirect: 'manual' })
      return res.status === 200 || `status ${res.status} (expected 200)`
    },
  },
  {
    id: 'S3',
    desc: 'GET /dashboard (no cookie) → 307 to /login',
    run: async () => {
      const res = await fetch(`${BASE}/dashboard`, { redirect: 'manual' })
      if (res.status !== 307) return `status ${res.status} (expected 307)`
      const loc = res.headers.get('location') || ''
      return loc.includes('/login') || `Location "${loc}" does not include /login`
    },
  },
  {
    id: 'S4',
    desc: 'GET /admin (no cookie) → 307 to /login',
    run: async () => {
      const res = await fetch(`${BASE}/admin`, { redirect: 'manual' })
      if (res.status !== 307) return `status ${res.status} (expected 307)`
      const loc = res.headers.get('location') || ''
      return loc.includes('/login') || `Location "${loc}" does not include /login`
    },
  },
  {
    id: 'S5',
    desc: 'GET /api/health → 200, status:"ok", mode:"mock"',
    run: async () => {
      const res = await fetch(`${BASE}/api/health`, { redirect: 'manual' })
      if (res.status !== 200) return `status ${res.status} (expected 200)`
      const json = await res.json()
      if (json.status !== 'ok') return `json.status "${json.status}" (expected "ok")`
      return json.mode === 'mock' || `json.mode "${json.mode}" (expected "mock")`
    },
  },
  {
    // 計画書は「INTEGRATION_TOKEN未設定→500」を想定していたが、.env.local に
    // トークンが設定済みのため実挙動は 401 unauthorized（integrationAuth.js:31-33）。
    id: 'S6',
    desc: 'GET /api/integrations/courses (no auth) → 401',
    run: async () => {
      const res = await fetch(`${BASE}/api/integrations/courses`, { redirect: 'manual' })
      return res.status === 401 || `status ${res.status} (expected 401)`
    },
  },
]

let failed = 0
for (const check of checks) {
  let result
  try {
    result = await check.run()
  } catch (e) {
    result = `exception: ${e.message}`
  }
  if (result === true) {
    console.log(`PASS ${check.id}: ${check.desc}`)
  } else {
    failed++
    console.log(`FAIL ${check.id}: ${check.desc} — ${result}`)
  }
}

if (failed > 0) {
  console.log(`\n${failed} check(s) FAILED`)
  process.exit(1)
}
console.log('\nAll checks PASSED')
