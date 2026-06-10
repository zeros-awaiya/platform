'use client'

import { useState, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createNotification, deleteNotification } from './actions'
import styles from '../admin.module.css'

export default function NotificationsClientPage({ initialNotifications, organizations }) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [targetType, setTargetType] = useState('all')
  const [isPending, setIsPending] = useState(false)

  // フォームアクション管理
  const [state, formAction, isFormPending] = useActionState(async (prevState, formData) => {
    const res = await createNotification(prevState, formData)
    if (res?.success) {
      setIsModalOpen(false)
      setTargetType('all')
      router.refresh()
    }
    return res
  }, null)

  // 通知削除
  const handleDelete = async (id, title) => {
    if (confirm(`本当に通知「${title}」を削除しますか？`)) {
      setIsPending(true)
      const res = await deleteNotification(id)
      setIsPending(false)
      if (res?.error) {
        alert(res.error)
      } else {
        router.refresh()
      }
    }
  }

  // 日付フォーマット
  const formatDate = (isoString) => {
    if (!isoString) return '-'
    const date = new Date(isoString)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div>
      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.25rem' }}>通知（お知らせ）管理</h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>プラットフォーム全体、または特定の組織（テナント）宛てにお知らせや重要通知を配信します。</p>
        </div>
        <button
          onClick={() => {
            setTargetType('all')
            setIsModalOpen(true)
          }}
          className={`${styles.btn} ${styles.btnPrimary}`}
        >
          新規通知を配信
        </button>
      </div>

      {/* 通知一覧テーブル */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>配信日時</th>
              <th className={styles.th}>対象</th>
              <th className={styles.th}>タイトル</th>
              <th className={styles.th}>本文要約</th>
              <th className={styles.th} style={{ textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {initialNotifications.length === 0 ? (
              <tr>
                <td colSpan="5" className={styles.td} style={{ textAlign: 'center', color: '#71717a', padding: '3rem' }}>
                  配信された通知はありません。
                </td>
              </tr>
            ) : (
              initialNotifications.map((n) => {
                const targetOrg = organizations.find(o => o.id === n.organization_id)
                const targetText = targetOrg ? targetOrg.name : '全体（全ユーザー）'
                
                return (
                  <tr key={n.id} className={styles.tr}>
                    <td className={styles.td}>{formatDate(n.created_at)}</td>
                    <td className={styles.td}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        background: targetOrg ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: targetOrg ? '#818cf8' : '#34d399',
                        border: targetOrg ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
                      }}>
                        {targetText}
                      </span>
                    </td>
                    <td className={styles.td} style={{ fontWeight: '600', color: '#ffffff' }}>
                      {n.title}
                    </td>
                    <td className={styles.td} style={{ color: '#a1a1aa', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {n.content}
                    </td>
                    <td className={styles.td} style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleDelete(n.id, n.title)}
                        className={`${styles.btn} ${styles.btnDanger}`}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        disabled={isPending}
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 新規通知モーダル */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>新規通知を配信</div>
            <form action={formAction}>
              {state?.error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                  {state.error}
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="targetType">配信対象範囲 *</label>
                <select
                  id="targetType"
                  name="targetType"
                  className={styles.select}
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                >
                  <option value="all">プラットフォーム全体（全ユーザー宛て）</option>
                  <option value="organization">特定の組織（テナント宛て）</option>
                </select>
              </div>

              {targetType === 'organization' && (
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="organizationId">対象組織（テナント） *</label>
                  <select id="organizationId" name="organizationId" required className={styles.select}>
                    <option value="">-- 対象組織を選択してください --</option>
                    {organizations.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="title">通知タイトル *</label>
                <input id="title" name="title" type="text" className={styles.input} required placeholder="例: システムメンテナンスのお知らせ" />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="content">本文 *</label>
                <textarea id="content" name="content" className={styles.textarea} required placeholder="通知の本文詳細を記入してください。" rows="5" />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  disabled={isFormPending}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={isFormPending}
                >
                  {isFormPending ? '配信中...' : '通知を配信'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
