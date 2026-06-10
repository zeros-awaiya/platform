'use client'

import { useState } from 'react'
import { inviteUser, toggleUserActive, importUsersFromCSV } from './actions'
import styles from '../org.module.css'

export default function OrgUsersClientPage({ initialUsers, departments }) {
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false)
  
  // 個別招待用のステート
  const [tempPassword, setTempPassword] = useState('')
  const [invitedEmail, setInvitedEmail] = useState('')
  
  // CSVインポート用のステート
  const [csvPreview, setCsvPreview] = useState([])
  const [csvErrors, setCsvErrors] = useState([])
  const [importResult, setImportResult] = useState(null)

  const [errorMsg, setErrorMsg] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleInviteSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setTempPassword('')
    setIsPending(true)

    const formData = new FormData(e.target)
    const email = formData.get('email')
    const name = formData.get('name')
    const role = formData.get('role')
    const departmentId = formData.get('department_id')
    const position = formData.get('position')

    const res = await inviteUser(email, name, role, departmentId, position)
    setIsPending(false)

    if (res?.error) {
      setErrorMsg(res.error)
    } else {
      setTempPassword(res.tempPassword)
      setInvitedEmail(email)
      e.target.reset()
    }
  }

  const handleToggleStatus = async (userId, name, currentStatus) => {
    const actionName = currentStatus ? '無効化' : '有効化'
    if (confirm(`本当にユーザー「${name}」を${actionName}しますか？`)) {
      setIsPending(true)
      const res = await toggleUserActive(userId, !currentStatus)
      setIsPending(false)
      if (res?.error) {
        alert(res.error)
      }
    }
  }

  // フロントエンド側でのCSV簡易パース
  const handleCsvFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setCsvErrors([])
    setCsvPreview([])
    setImportResult(null)
    setErrorMsg('')

    const reader = new FileReader()
    reader.onload = (event) => {
      let text = event.target.result
      // BOM (Byte Order Mark) の除去
      if (text.startsWith('\uFEFF')) {
        text = text.slice(1)
      }
      const lines = text.split(/\r\n|\n/)
      
      if (lines.length < 2) {
        setCsvErrors(['CSVファイルが空であるか、有効なデータが含まれていません。'])
        return
      }

      // ヘッダーのパース
      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''))
      
      const emailIdx = headers.indexOf('メールアドレス')
      const nameIdx = headers.indexOf('氏名')
      const deptIdx = headers.indexOf('部署名')
      const posIdx = headers.indexOf('役職')

      if (emailIdx === -1 || nameIdx === -1) {
        setCsvErrors(['CSVのヘッダー行に「氏名」および「メールアドレス」カラムが見つかりませんでした。'])
        return
      }

      const parsedData = []
      const errors = []

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue // 空行を無視

        // カンマ区切りのパース (ダブルクォーテーションの簡易的なトリム処理含む)
        const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''))
        if (cols.length < Math.max(emailIdx, nameIdx) + 1) {
          errors.push(`行 ${i + 1}: 列データが不足しています。`)
          continue
        }

        const name = cols[nameIdx]
        const email = cols[emailIdx]
        const departmentName = deptIdx !== -1 ? cols[deptIdx] : ''
        const position = posIdx !== -1 ? cols[posIdx] : ''

        // 簡易バリデーション
        if (!name) {
          errors.push(`行 ${i + 1}: 氏名が空です。`)
          continue
        }
        if (!email || !email.includes('@')) {
          errors.push(`行 ${i + 1}: メールアドレス形式が不正です（「${email}」）。`)
          continue
        }

        parsedData.push({ name, email, departmentName, position })
      }

      setCsvPreview(parsedData)
      setCsvErrors(errors)
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleImportSubmit = async () => {
    if (csvPreview.length === 0) return
    setIsPending(true)
    setErrorMsg('')
    setImportResult(null)

    const res = await importUsersFromCSV(csvPreview)
    setIsPending(false)

    if (res?.error) {
      setErrorMsg(res.error)
    } else {
      setImportResult(res)
      setCsvPreview([])
    }
  }

  const copyAllTempPasswords = (users) => {
    const text = users.map(u => `${u.name} (${u.email}) : ${u.tempPassword}`).join('\n')
    navigator.clipboard.writeText(text)
    alert('仮パスワード一覧をクリップボードにコピーしました！')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: '#ffffff' }}>メンバー（受講者）管理</h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>自組織に所属するユーザーの確認、新規登録（個別・CSV一括インポート）、および有効/無効を設定します。</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => {
              setCsvPreview([])
              setCsvErrors([])
              setImportResult(null)
              setErrorMsg('')
              setIsCsvImportOpen(true)
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '0.35rem', verticalAlign: 'middle' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            CSV一括登録
          </button>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => {
              setErrorMsg('')
              setTempPassword('')
              setIsInviteOpen(true)
            }}
          >
            ユーザーを追加（招待）
          </button>
        </div>
      </div>

      {/* 個別登録の成功バナー */}
      {tempPassword && (
        <div className={styles.tempPasswordBox} style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontWeight: '700', marginBottom: '0.5rem' }}>✓ ユーザーを追加しました</h4>
          <p style={{ fontSize: '0.85rem', color: '#a1a1aa', marginBottom: '0.75rem' }}>
            メールアドレス <strong>{invitedEmail}</strong> でアカウントを作成しました。<br />
            下記の仮パスワードをコピーして、受講者に共有してください（ログイン後に変更可能です）。
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <code style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '1.1rem', letterSpacing: '0.05em', color: '#34d399', fontWeight: '700' }}>
              {tempPassword}
            </code>
            <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => {
              navigator.clipboard.writeText(tempPassword);
              alert('コピーしました！');
            }}>
              コピー
            </button>
          </div>
        </div>
      )}

      {/* CSVインポートの成功バナー */}
      {importResult && importResult.success && (
        <div className={styles.tempPasswordBox} style={{ marginBottom: '1.5rem', borderLeft: '4px solid #10b981' }}>
          <h4 style={{ fontWeight: '700', marginBottom: '0.5rem', color: '#34d399' }}>✓ CSVインポート処理が完了しました</h4>
          <p style={{ fontSize: '0.85rem', color: '#a1a1aa', marginBottom: '0.75rem' }}>
            正常に登録されたメンバー: <strong>{importResult.importedCount}名</strong>
            {importResult.failedCount > 0 && (
              <span style={{ color: '#fca5a5', marginLeft: '1rem' }}>登録失敗: <strong>{importResult.failedCount}名</strong></span>
            )}
          </p>
          
          {importResult.importedUsers.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: '600' }}>初期パスワード一覧:</span>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => copyAllTempPasswords(importResult.importedUsers)}
                >
                  仮パスワード一覧をすべてコピー
                </button>
              </div>
              <div style={{ maxHeight: '180px', overflowY: 'auto', background: 'rgba(0, 0, 0, 0.2)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                  <tbody>
                    {importResult.importedUsers.map((u, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '0.35rem 0', fontWeight: '600' }}>{u.name}</td>
                        <td style={{ padding: '0.35rem 0', color: '#a1a1aa' }}>{u.email}</td>
                        <td style={{ padding: '0.35rem 0', textAlign: 'right', color: '#34d399', fontFamily: 'monospace', fontWeight: 'bold' }}>{u.tempPassword}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {importResult.failedUsers.length > 0 && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(239, 68, 68, 0.15)', paddingTop: '0.75rem' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: '600', color: '#fca5a5' }}>登録に失敗したユーザー（エラー理由）:</span>
              <div style={{ maxHeight: '120px', overflowY: 'auto', marginTop: '0.5rem', background: 'rgba(239, 68, 68, 0.05)', padding: '0.5rem', borderRadius: '8px' }}>
                {importResult.failedUsers.map((fu, idx) => (
                  <p key={idx} style={{ fontSize: '0.75rem', color: '#fca5a5', margin: '0.25rem 0' }}>
                    ・<strong>{fu.name}</strong> ({fu.email}) : {fu.error}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ユーザー一覧テーブル */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>氏名</th>
              <th className={styles.th}>メールアドレス</th>
              <th className={styles.th}>部署</th>
              <th className={styles.th}>役職</th>
              <th className={styles.th}>ロール</th>
              <th className={styles.th}>状態</th>
              <th className={styles.th} style={{ textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {initialUsers.length === 0 ? (
              <tr>
                <td colSpan="7" className={styles.td} style={{ textAlign: 'center', color: '#71717a', padding: '3rem' }}>
                  メンバーが登録されていません。新規追加またはCSVインポートを行ってください。
                </td>
              </tr>
            ) : (
              initialUsers.map((user) => {
                const dept = departments.find(d => d.id === user.department_id);
                return (
                  <tr key={user.id} className={styles.tr}>
                    <td className={styles.td} style={{ fontWeight: '600', color: '#ffffff' }}>{user.name}</td>
                    <td className={styles.td}>{user.email}</td>
                    <td className={styles.td}>{dept ? dept.name : '-'}</td>
                    <td className={styles.td}>{user.position || '-'}</td>
                    <td className={styles.td}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        background: user.role === 'ORG_ADMIN' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: user.role === 'ORG_ADMIN' ? '#34d399' : '#a1a1aa',
                        border: user.role === 'ORG_ADMIN' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        {user.role === 'ORG_ADMIN' ? '組織管理者' : '受講者'}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={`${styles.badge} ${user.is_active ? styles.badgeActive : styles.badgeSuspended}`}>
                        {user.is_active ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className={styles.td} style={{ textAlign: 'right' }}>
                      <button
                        className={`${styles.btn} ${user.is_active ? styles.btnDanger : styles.btnSecondary}`}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        onClick={() => handleToggleStatus(user.id, user.name, user.is_active)}
                        disabled={isPending}
                      >
                        {user.is_active ? 'アカウント無効化' : '有効化'}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 個別招待モーダル */}
      {isInviteOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>新規ユーザーを追加</div>
            <form onSubmit={handleInviteSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="name">氏名</label>
                <input id="name" name="name" type="text" className={styles.input} placeholder="例: 山田 太郎" required />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="email">メールアドレス</label>
                <input id="email" name="email" type="email" className={styles.input} placeholder="例: yamada@zeros.jp" required />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="role">システムロール</label>
                <select id="role" name="role" className={styles.select}>
                  <option value="LEARNER">受講者 (一般メンバー)</option>
                  <option value="ORG_ADMIN">組織管理者 (部署・進捗管理)</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="department_id">所属部署</label>
                <select id="department_id" name="department_id" className={styles.select}>
                  <option value="">部署未設定</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="position">役職（オプション）</label>
                <input id="position" name="position" type="text" className={styles.input} placeholder="例: 看護主任、サブリーダー" />
              </div>

              {errorMsg && (
                <div className={styles.errorAlert} style={{ marginBottom: '1.25rem' }}>
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className={styles.modalActions}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setIsInviteOpen(false)} disabled={isPending}>
                  キャンセル
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={isPending}>
                  {isPending ? '登録中...' : 'ユーザーを登録'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV一括インポートモーダル */}
      {isCsvImportOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '640px' }}>
            <div className={styles.modalHeader}>CSVファイルから一括登録</div>
            
            <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem', color: '#a1a1aa' }}>
              <p style={{ fontWeight: '700', color: '#ffffff', marginBottom: '0.25rem' }}>■ CSVファイルの要件</p>
              <p>ヘッダー行として <strong>「氏名」</strong> と <strong>「メールアドレス」</strong> が必須です。「部署名」「役職」を含めることもできます。</p>
              <p style={{ color: '#34d399', marginTop: '0.25rem' }}>※未登録の部署名があった場合、自動的に新規部署として登録されます。</p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="csvFile">CSVファイルを選択</label>
              <input
                id="csvFile"
                type="file"
                accept=".csv"
                onChange={handleCsvFileChange}
                className={styles.input}
                style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem' }}
              />
            </div>

            {/* CSV読み込みエラー */}
            {csvErrors.length > 0 && (
              <div className={styles.errorAlert} style={{ marginBottom: '1.25rem', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>CSVファイルの構造に問題があります:</span>
                {csvErrors.map((err, idx) => <span key={idx} style={{ fontSize: '0.8rem' }}>{err}</span>)}
              </div>
            )}

            {/* CSVプレビュー表示 */}
            {csvPreview.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <span className={styles.label} style={{ display: 'block', marginBottom: '0.5rem' }}>インポートプレビュー (計 {csvPreview.length} 件):</span>
                <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.03)', position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ padding: '0.5rem', color: '#a1a1aa' }}>氏名</th>
                        <th style={{ padding: '0.5rem', color: '#a1a1aa' }}>メールアドレス</th>
                        <th style={{ padding: '0.5rem', color: '#a1a1aa' }}>部署名</th>
                        <th style={{ padding: '0.5rem', color: '#a1a1aa' }}>役職</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '0.5rem', color: '#ffffff', fontWeight: '600' }}>{row.name}</td>
                          <td style={{ padding: '0.5rem' }}>{row.email}</td>
                          <td style={{ padding: '0.5rem' }}>
                            {row.departmentName ? (
                              <span style={{ color: '#a5b4fc', background: 'rgba(99, 102, 241, 0.1)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
                                {row.departmentName}
                              </span>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '0.5rem' }}>{row.position || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className={styles.errorAlert} style={{ marginBottom: '1.25rem' }}>
                <span>{errorMsg}</span>
              </div>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setIsCsvImportOpen(false)}
                disabled={isPending}
              >
                閉じる
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleImportSubmit}
                disabled={isPending || csvPreview.length === 0}
              >
                {isPending ? '取り込み中...' : 'インポートを確定する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

