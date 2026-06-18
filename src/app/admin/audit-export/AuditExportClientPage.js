'use client'

import { useState } from 'react'
import adminStyles from '../admin.module.css'

export default function AuditExportClientPage({ organizations }) {
  const [orgId, setOrgId] = useState('')
  const [fy, setFy] = useState('')

  // 年度（4月始まり）の選択肢を当年度から過去5年分生成
  const now = new Date()
  const currentFy = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1
  const years = [0, 1, 2, 3, 4].map((n) => currentFy - n)

  const handleExport = () => {
    if (!orgId) {
      alert('事業所（組織）を選択してください。')
      return
    }
    const params = new URLSearchParams({ org: orgId })
    if (fy) params.set('fy', fy)
    window.open(`/admin/audit-export/print?${params.toString()}`, '_blank', 'noopener')
  }

  const fieldStyle = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '8px',
    color: '#f4f4f5',
    fontSize: '0.9rem',
  }
  const labelStyle = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#a1a1aa',
    marginBottom: '0.4rem',
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.25rem' }}>監査PDF出力</h2>
        <p style={{ color: '#a1a1aa', margin: 0 }}>
          事業所ごとの研修実施記録（必須研修一覧・受講状況・確認テスト結果）を監査用の様式でPDF出力します。
          ボタンを押すと別タブで印刷用ページが開きます。ブラウザの「PDFとして保存」で保存してください。
        </p>
      </div>

      <div
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '1.5rem',
          maxWidth: '560px',
        }}
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="org" style={labelStyle}>対象事業所（組織）</label>
          <select id="org" value={orgId} onChange={(e) => setOrgId(e.target.value)} style={fieldStyle}>
            <option value="">選択してください</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="fy" style={labelStyle}>対象年度（4月始まり）</label>
          <select id="fy" value={fy} onChange={(e) => setFy(e.target.value)} style={fieldStyle}>
            <option value="">全期間</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}年度（{y}/4〜{y + 1}/3）</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleExport}
          className={`${adminStyles.btn} ${adminStyles.btnPrimary}`}
        >
          監査PDFを出力
        </button>
      </div>
    </div>
  )
}
