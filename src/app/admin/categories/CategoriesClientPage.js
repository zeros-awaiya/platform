'use client'

import { useState, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createCategory, deleteCategory } from './actions'
import styles from '../admin.module.css'

export default function CategoriesClientPage({ initialCategories }) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)

  // フォームアクション管理
  const [state, formAction, isFormPending] = useActionState(async (prevState, formData) => {
    const res = await createCategory(prevState, formData)
    if (res?.success) {
      setIsModalOpen(false)
      router.refresh()
    }
    return res
  }, null)

  // カテゴリ削除
  const handleDelete = async (id, name) => {
    if (confirm(`本当にカテゴリ「${name}」を削除しますか？`)) {
      setIsPending(true)
      const res = await deleteCategory(id)
      setIsPending(false)
      if (res?.error) {
        alert(res.error)
      } else {
        router.refresh()
      }
    }
  }

  return (
    <div>
      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.25rem' }}>カテゴリ管理</h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>コースを体系的に整理・分類するためのカテゴリ定義を管理します。</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className={`${styles.btn} ${styles.btnPrimary}`}
        >
          新規カテゴリ追加
        </button>
      </div>

      {/* カテゴリ一覧テーブル */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th} style={{ width: '80px' }}>順序</th>
              <th className={styles.th}>カテゴリ名</th>
              <th className={styles.th}>説明</th>
              <th className={styles.th} style={{ textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {initialCategories.length === 0 ? (
              <tr>
                <td colSpan="4" className={styles.td} style={{ textAlign: 'center', color: '#71717a', padding: '3rem' }}>
                  登録されているカテゴリはありません。新規追加してください。
                </td>
              </tr>
            ) : (
              initialCategories.map((c) => (
                <tr key={c.id} className={styles.tr}>
                  <td className={styles.td} style={{ fontWeight: 'bold', color: '#818cf8' }}>
                    {c.sort_order}
                  </td>
                  <td className={styles.td} style={{ fontWeight: '600', color: '#ffffff' }}>
                    {c.name}
                  </td>
                  <td className={styles.td}>
                    {c.description || '-'}
                  </td>
                  <td className={styles.td} style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      className={`${styles.btn} ${styles.btnDanger}`}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      disabled={isPending}
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 新規追加モーダル */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>新規カテゴリを追加</div>
            <form action={formAction}>
              {state?.error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                  {state.error}
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="name">カテゴリ名 *</label>
                <input id="name" name="name" type="text" className={styles.input} required placeholder="例: 医療安全・感染対策" />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="description">説明</label>
                <textarea id="description" name="description" className={styles.textarea} placeholder="カテゴリの詳細な役割や解説を記入します。" rows="3" />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="sortOrder">並び順番号</label>
                <input id="sortOrder" name="sortOrder" type="number" className={styles.input} defaultValue={initialCategories.length + 1} />
                <span style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.25rem' }}>小さい番号のものが優先的に上位表示されます。</span>
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
                  {isFormPending ? '追加中...' : 'カテゴリを追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
