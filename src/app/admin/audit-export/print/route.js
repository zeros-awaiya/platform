// 監査対応PDF出力の印刷用ルート。
// /admin レイアウト（サイドバー等）を経由しない自己完結HTMLを返し、ブラウザの「PDFとして保存」で出力させる。
// 日本語はシステムフォントで描画されるため、フォント資産や外部ライブラリは不要。

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getAuditReport } from '../auditData'

export const dynamic = 'force-dynamic'

function esc(value) {
  return String(value ?? '').replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ))
}

function mandatorySection(list) {
  if (list.length === 0) return '<p class="empty">必須研修の割り当てがありません。</p>'
  const rows = list.map((m) => `
    <tr><td>${esc(m.courseTitle)}</td><td>${esc(m.deptName)}</td><td class="c">${esc(m.dueDate)}</td></tr>
  `).join('')
  return `<table>
    <thead><tr><th>研修コース</th><th>対象部署</th><th class="c">提出期限</th></tr></thead>
    <tbody>${rows}</tbody></table>`
}

function attendanceSection(attendance) {
  const flat = attendance.flatMap((mem) =>
    mem.rows.map((r) => ({ name: mem.name, deptName: mem.deptName, ...r }))
  )
  if (flat.length === 0) return '<p class="empty">受講対象の記録がありません。</p>'
  const rows = flat.map((r) => `
    <tr>
      <td>${esc(r.name)}</td><td>${esc(r.deptName)}</td><td>${esc(r.courseTitle)}</td>
      <td class="c">${esc(r.status)}</td><td class="c">${esc(r.completedAt)}</td><td class="c">${esc(r.progress)}%</td>
    </tr>`).join('')
  return `<table>
    <thead><tr><th>職員</th><th>部署</th><th>研修コース</th><th class="c">受講状況</th><th class="c">完了日</th><th class="c">進捗</th></tr></thead>
    <tbody>${rows}</tbody></table>`
}

function testSection(results) {
  if (results.length === 0) return '<p class="empty">テスト受験の記録がありません。</p>'
  const rows = results.map((r) => `
    <tr>
      <td>${esc(r.name)}</td><td>${esc(r.courseTitle)}</td><td>${esc(r.lessonTitle)}</td>
      <td class="c">${esc(r.scorePercent)}点</td>
      <td class="c">${r.isPassed ? '合格' : '不合格'}</td>
      <td class="c">${esc(r.attemptedAt)}</td>
    </tr>`).join('')
  return `<table>
    <thead><tr><th>職員</th><th>研修コース</th><th>確認テスト</th><th class="c">得点</th><th class="c">合否</th><th class="c">受験日</th></tr></thead>
    <tbody>${rows}</tbody></table>`
}

function renderHtml(report) {
  return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>研修実施記録（監査用）｜${esc(report.org.name)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", Meiryo, sans-serif;
    color: #111; margin: 0; padding: 24px; font-size: 12px; line-height: 1.5; background: #fff; }
  .toolbar { position: sticky; top: 0; display: flex; gap: 12px; justify-content: flex-end;
    padding: 8px 0 16px; background: #fff; }
  .btn { padding: 8px 18px; font-size: 13px; border: 1px solid #333; border-radius: 6px;
    background: #111; color: #fff; cursor: pointer; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 24px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #111; }
  .meta { margin: 0 0 8px; color: #333; }
  .meta span { margin-right: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { border: 1px solid #999; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #f0f0f0; font-weight: 600; }
  td.c, th.c { text-align: center; white-space: nowrap; }
  .empty { color: #666; padding: 8px 0; }
  footer { margin-top: 32px; font-size: 10px; color: #666; border-top: 1px solid #ccc; padding-top: 8px; }
  @page { size: A4; margin: 14mm; }
  @media print { .toolbar { display: none; } body { padding: 0; } }
</style></head>
<body>
  <div class="toolbar"><button class="btn" onclick="window.print()">PDFとして保存／印刷</button></div>
  <h1>研修実施記録（監査用）</h1>
  <div class="meta">
    <span><strong>事業所：</strong>${esc(report.org.name)}</span>
    <span><strong>対象期間：</strong>${esc(report.period)}</span>
    <span><strong>対象職員数：</strong>${esc(report.memberCount)}名</span>
    <span><strong>出力日時：</strong>${esc(report.generatedAt)}</span>
  </div>
  <h2>1. 必須研修一覧</h2>
  ${mandatorySection(report.mandatoryList)}
  <h2>2. 受講状況（出席記録）</h2>
  ${attendanceSection(report.attendance)}
  <h2>3. 確認テスト結果</h2>
  ${testSection(report.testResults)}
  <footer>本書はあわい屋ZEROS学習プラットフォームの記録から自動生成された監査用資料です。</footer>
</body></html>`
}

export async function GET(request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('認証が必要です。', { status: 401 })

  // 本部管理（SYSTEM_ADMIN）のみ出力可能
  const me = (await supabase.from('users').select('role').eq('id', user.id).single()).data
  if (!me || me.role !== 'SYSTEM_ADMIN') {
    return new NextResponse('権限がありません。', { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const organizationId = searchParams.get('org')
  if (!organizationId) return new NextResponse('組織（org）を指定してください。', { status: 400 })

  const options = {}
  const fy = searchParams.get('fy')
  if (fy && /^\d{4}$/.test(fy)) {
    options.from = `${fy}-04-01T00:00:00`
    options.to = `${Number(fy) + 1}-03-31T23:59:59`
  }

  let report
  try {
    report = await getAuditReport(supabase, organizationId, options)
  } catch (error) {
    console.error('Audit report generation failed:', error)
    return new NextResponse(`監査データの取得に失敗しました: ${error.message}`, { status: 500 })
  }
  if (!report) return new NextResponse('対象組織が見つかりません。', { status: 404 })

  return new NextResponse(renderHtml(report), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
