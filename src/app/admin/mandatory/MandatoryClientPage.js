'use client'

import { useState, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createMandatoryCourse, deleteMandatoryCourse } from './actions'
import { formatDate } from '@/utils/format'
import styles from './mandatory.module.css'
import adminStyles from '../admin.module.css'

export default function MandatoryClientPage({
  initialMandatoryCourses,
  courses,
  organizations,
  departments
}) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  // 必須受講登録のServer Action実行管理
  const [state, formAction, isPending] = useActionState(async (prevState, formData) => {
    const res = await createMandatoryCourse(prevState, formData)
    if (res.success) {
      setIsModalOpen(false)
      showToast('必須受講を登録しました。')
      router.refresh()
    }
    return res
  }, null)

  // 選択中の組織に紐づく部署の抽出
  const filteredDepartments = departments.filter(
    (dept) => dept.organization_id === selectedOrgId
  )

  // 必須受講設定の削除（解除）
  const handleDelete = async (id, courseTitle, orgName) => {
    if (window.confirm(`「${orgName}」に対するコース「${courseTitle}」の必須受講設定を解除しますか？`)) {
      const res = await deleteMandatoryCourse(id)
      if (res.success) {
        showToast('必須受講の設定を解除しました。')
        router.refresh()
      } else {
        alert(res.error || '解除に失敗しました。')
      }
    }
  }

  // 期限判定
  const isOverdue = (dueDateStr) => {
    if (!dueDateStr) return false
    return new Date(dueDateStr) < new Date()
  }

  // カレンダー入力の最小値（本日以降に制限）
  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className={styles.container}>
      {/* トースト表示 */}
      {toastMessage && (
        <div className={styles.toast}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ヘッダーセクション */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h2>必須受講管理</h2>
          <p>組織全体または特定の部署に対して、受講期限付きで必須受講コースを割り当てます。</p>
        </div>
        <button
          onClick={() => {
            setSelectedOrgId('')
            setIsModalOpen(true)
          }}
          className={`${adminStyles.btn} ${adminStyles.btnPrimary}`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginRight: '0.4rem' }}
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新規必須受講を割り当て
        </button>
      </div>

      {/* 必須受講一覧 */}
      <div className={styles.card}>
        {initialMandatoryCourses.length === 0 ? (
          <div className={styles.emptyState}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className={styles.emptyIcon}
            >
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <p>現在設定されている必須受講はありません。</p>
          </div>
        ) : (
          <div className={adminStyles.tableContainer}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th className={adminStyles.th}>対象コース</th>
                  <th className={adminStyles.th}>対象組織</th>
                  <th className={adminStyles.th}>対象部署</th>
                  <th className={adminStyles.th}>提出期限</th>
                  <th className={adminStyles.th} style={{ textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {initialMandatoryCourses.map((mc) => {
                  const courseTitle = mc.courses?.title || '不明なコース'
                  const orgName = mc.organizations?.name || '全組織 / 不明'
                  const deptName = mc.departments?.name || '組織全体'
                  const overdue = isOverdue(mc.due_date)

                  return (
                    <tr key={mc.id} className={adminStyles.tr}>
                      <td className={adminStyles.td} style={{ fontWeight: '600', color: '#ffffff' }}>
                        {courseTitle}
                      </td>
                      <td className={adminStyles.td}>{orgName}</td>
                      <td className={adminStyles.td}>
                        <span style={{
                          fontSize: '0.8rem',
                          background: mc.department_id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: mc.department_id ? '#a5b4fc' : '#a1a1aa',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          border: mc.department_id ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid rgba(255, 255, 255, 0.08)'
                        }}>
                          {deptName}
                        </span>
                      </td>
                      <td className={adminStyles.td}>
                        <span style={{
                          color: overdue ? '#fca5a5' : '#d4d4d8',
                          fontWeight: overdue ? '600' : 'normal'
                        }}>
                          {formatDate(mc.due_date)}
                          {overdue && (
                            <span style={{
                              fontSize: '0.7rem',
                              marginLeft: '0.5rem',
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#fca5a5',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              border: '1px solid rgba(239, 68, 68, 0.2)'
                            }}>
                              期限切れ
                            </span>
                          )}
                        </span>
                      </td>
                      <td className={adminStyles.td} style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleDelete(mc.id, courseTitle, orgName)}
                          className={`${adminStyles.btn} ${adminStyles.btnDanger}`}
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        >
                          解除
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 新規アサイン用モーダルダイアログ */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>新規必須受講アサイン</h3>
              <p>コースと対象の組織・部署を選択し、提出期限を設定してください。</p>
            </div>

            <form action={formAction}>
              {state?.error && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#fca5a5',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  fontSize: '0.875rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{state.error}</span>
                </div>
              )}

              {/* 対象コース */}
              <div className={styles.formGroup}>
                <label className={styles.label}>対象コース <span style={{ color: '#ef4444' }}>*</span></label>
                <select name="courseId" required className={styles.select}>
                  <option value="">-- コースを選択してください --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title} {c.categories?.name ? `(${c.categories.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 対象組織 */}
              <div className={styles.formGroup}>
                <label className={styles.label}>対象組織（テナント） <span style={{ color: '#ef4444' }}>*</span></label>
                <select
                  name="organizationId"
                  required
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className={styles.select}
                >
                  <option value="">-- 組織を選択してください --</option>
                  {organizations.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              {/* 対象部署 */}
              <div className={styles.formGroup}>
                <label className={styles.label}>対象部署</label>
                <select
                  name="departmentId"
                  disabled={!selectedOrgId}
                  className={styles.select}
                  style={{ opacity: selectedOrgId ? 1 : 0.6 }}
                >
                  <option value="all">組織全体（全メンバーが対象）</option>
                  {filteredDepartments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* 提出期限 */}
              <div className={styles.formGroup}>
                <label className={styles.label}>提出期限 <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="date"
                  name="dueDate"
                  required
                  min={todayStr}
                  className={styles.input}
                />
              </div>

              {/* アクションボタン */}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`${adminStyles.btn} ${adminStyles.btnSecondary}`}
                  disabled={isPending}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className={`${adminStyles.btn} ${adminStyles.btnPrimary}`}
                  disabled={isPending}
                >
                  {isPending ? 'アサイン中...' : 'アサインを確定'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
