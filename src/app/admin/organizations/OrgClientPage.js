'use client'

import { useState, useActionState } from 'react'
import Link from 'next/link'
import { createOrganization, updateOrganization, deleteOrganization } from './actions'
import styles from '../admin.module.css'

export default function OrgClientPage({ initialOrgs }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Create organization form action
  const [createState, createFormAction, isCreatePending] = useActionState(async (prevState, formData) => {
    setErrorMsg('')
    const res = await createOrganization(prevState, formData)
    if (res?.error) {
      setErrorMsg(res.error)
      return res
    }
    setIsCreateOpen(false)
    return { success: true }
  }, null)

  const handleEditClick = (org) => {
    setErrorMsg('')
    setEditItem(org)
  }

  const handleUpdateSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    const formData = new FormData(e.target)
    const name = formData.get('name')
    const status = formData.get('status')

    const res = await updateOrganization(editItem.id, name, status)
    if (res?.error) {
      setErrorMsg(res.error)
    } else {
      setEditItem(null)
    }
  }

  const handleDeleteClick = async (id, name) => {
    if (confirm(`本当に組織「${name}」を削除しますか？\n所属するユーザーや部署、進捗データもすべて削除されます。この操作は取り消せません。`)) {
      setErrorMsg('')
      const res = await deleteOrganization(id)
      if (res?.error) {
        alert(res.error)
      }
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: '#ffffff' }}>組織（テナント）管理</h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>プラットフォームを導入している企業や病院の一覧と、契約状況の管理を行います。</p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => { setErrorMsg(''); setIsCreateOpen(true); }}>
          新規組織追加
        </button>
      </div>

      {/* Global Error Banner */}
      {errorMsg && !isCreateOpen && !editItem && (
        <div className={styles.errorAlert} style={{ marginBottom: '1.5rem' }}>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Organization List Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>組織名</th>
              <th className={styles.th}>ステータス</th>
              <th className={styles.th}>作成日</th>
              <th className={styles.th} style={{ textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {initialOrgs.length === 0 ? (
              <tr>
                <td colSpan="4" className={styles.td} style={{ textAlign: 'center', color: '#71717a', padding: '3rem' }}>
                  組織が登録されていません。新規追加してください。
                </td>
              </tr>
            ) : (
              initialOrgs.map((org) => (
                <tr key={org.id} className={styles.tr}>
                  <td className={styles.td} style={{ fontWeight: '600' }}>
                    <Link href={`/admin/organizations/${org.id}`} style={{ color: '#ffffff', textDecoration: 'none' }} className={styles.link}>
                      {org.name}
                    </Link>
                  </td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${org.status === 'active' ? styles.badgeActive : styles.badgeSuspended}`}>
                      {org.status === 'active' ? '有効' : '停止中'}
                    </span>
                  </td>
                  <td className={styles.td}>
                    {new Date(org.created_at).toLocaleDateString('ja-JP')}
                  </td>
                  <td className={styles.td} style={{ textAlign: 'right' }}>
                    <div className={styles.actionCell} style={{ justifyContent: 'flex-end' }}>
                      <Link href={`/admin/organizations/${org.id}`} className={`${styles.btn} ${styles.btnSecondary}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                        詳細
                      </Link>
                      <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleEditClick(org)}>
                        編集
                      </button>
                      <button className={`${styles.btn} ${styles.btnDanger}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleDeleteClick(org.id, org.name)}>
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE ORGANIZATION MODAL */}
      {isCreateOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>新規組織を追加</div>
            <form action={createFormAction}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="name">組織名（病院・企業名）</label>
                <input id="name" name="name" type="text" className={styles.input} placeholder="例: 葵会総合病院" required />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="status">ステータス</label>
                <select id="status" name="status" className={styles.select}>
                  <option value="active">有効</option>
                  <option value="suspended">停止</option>
                </select>
              </div>

              {errorMsg && createState?.error && (
                <div className={styles.errorAlert} style={{ marginBottom: '1.25rem' }}>
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className={styles.modalActions}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setIsCreateOpen(false)} disabled={isCreatePending}>
                  キャンセル
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={isCreatePending}>
                  {isCreatePending ? '作成中...' : '作成'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ORGANIZATION MODAL */}
      {editItem && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>組織情報を編集</div>
            <form onSubmit={handleUpdateSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="edit-name">組織名</label>
                <input id="edit-name" name="name" type="text" defaultValue={editItem.name} className={styles.input} required />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="edit-status">ステータス</label>
                <select id="edit-status" name="status" defaultValue={editItem.status} className={styles.select}>
                  <option value="active">有効</option>
                  <option value="suspended">停止</option>
                </select>
              </div>

              {errorMsg && (
                <div className={styles.errorAlert} style={{ marginBottom: '1.25rem' }}>
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className={styles.modalActions}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setEditItem(null)}>
                  キャンセル
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
