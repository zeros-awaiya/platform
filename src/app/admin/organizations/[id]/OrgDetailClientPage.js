'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createDepartment, deleteDepartment } from './actions'
import styles from '../../admin.module.css'

export default function OrgDetailClientPage({ org, departments, users }) {
  const [newDeptName, setNewDeptName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleCreateDept = async (e) => {
    e.preventDefault()
    if (!newDeptName.trim()) return

    setIsPending(true)
    setErrorMsg('')
    const res = await createDepartment(org.id, newDeptName)
    setIsPending(false)

    if (res?.error) {
      setErrorMsg(res.error)
    } else {
      setNewDeptName('')
    }
  }

  const handleDeleteDept = async (deptId, deptName) => {
    if (confirm(`本当に部署「${deptName}」を削除しますか？\n所属するユーザーの部署設定はリセットされます。`)) {
      setIsPending(true)
      setErrorMsg('')
      const res = await deleteDepartment(org.id, deptId)
      setIsPending(false)

      if (res?.error) {
        alert(res.error)
      }
    }
  }

  return (
    <div>
      {/* Navigation */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/admin/organizations" className={`${styles.btn} ${styles.btnSecondary}`} style={{ padding: '0.5rem 1rem' }}>
          &larr; 組織一覧に戻る
        </Link>
      </div>

      {/* Organization Info Card */}
      <div className={styles.card} style={{ marginBottom: '2rem', background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.08), rgba(0, 0, 0, 0.2))', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>組織プロファイル</span>
            <h2 style={{ fontSize: '2rem', fontWeight: '800', marginTop: '0.25rem', color: '#ffffff' }}>{org.name}</h2>
          </div>
          <span className={`${styles.badge} ${org.status === 'active' ? styles.badgeActive : styles.badgeSuspended}`} style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
            {org.status === 'active' ? '契約中 (有効)' : '契約停止中'}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1.5rem', fontSize: '0.9rem', color: '#a1a1aa' }}>
          <div>
            <span>システムID: </span>
            <code style={{ color: '#d4d4d8', background: 'rgba(255, 255, 255, 0.05)', padding: '0.15rem 0.3rem', borderRadius: '4px', fontSize: '0.8rem' }}>{org.id}</code>
          </div>
          <div>
            <span>登録日: </span>
            <span style={{ color: '#ffffff', fontWeight: '500' }}>{new Date(org.created_at).toLocaleDateString('ja-JP')}</span>
          </div>
        </div>
      </div>

      {/* 2-Column Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left: Department List and Management */}
        <div className={styles.card}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', color: '#ffffff' }}>部署・グループ管理</h3>
          
          {/* Add Department Form */}
          <form onSubmit={handleCreateDept} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input
              type="text"
              placeholder="新しい部署名"
              className={styles.input}
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              disabled={isPending}
              style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
              required
            />
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} disabled={isPending}>
              追加
            </button>
          </form>

          {errorMsg && (
            <div className={styles.errorAlert} style={{ marginBottom: '1rem', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Department List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {departments.length === 0 ? (
              <span style={{ color: '#71717a', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem' }}>
                部署が登録されていません。
              </span>
            ) : (
              departments.map((dept) => (
                <div key={dept.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#e4e4e7' }}>{dept.name}</span>
                  <button
                    className={`${styles.btn} ${styles.btnDanger}`}
                    style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                    onClick={() => handleDeleteDept(dept.id, dept.name)}
                    disabled={isPending}
                  >
                    削除
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: User Management Info */}
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>所属ユーザー一覧</h3>
            <span style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>計 {users.length} 名</span>
          </div>

          <div className={styles.tableContainer} style={{ marginTop: '0', borderRadius: '12px' }}>
            <table className={styles.table} style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th className={styles.th} style={{ padding: '0.75rem 1rem' }}>氏名</th>
                  <th className={styles.th} style={{ padding: '0.75rem 1rem' }}>メールアドレス</th>
                  <th className={styles.th} style={{ padding: '0.75rem 1rem' }}>部署 / 役職</th>
                  <th className={styles.th} style={{ padding: '0.75rem 1rem' }}>ロール</th>
                  <th className={styles.th} style={{ padding: '0.75rem 1rem' }}>状態</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className={styles.td} style={{ textAlign: 'center', color: '#71717a', padding: '2.5rem' }}>
                      この組織にはまだユーザーが登録されていません。
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const userDept = departments.find(d => d.id === user.department_id);
                    return (
                      <tr key={user.id} className={styles.tr}>
                        <td className={styles.td} style={{ padding: '1rem', fontWeight: '600', color: '#ffffff' }}>{user.name}</td>
                        <td className={styles.td} style={{ padding: '1rem' }}>{user.email}</td>
                        <td className={styles.td} style={{ padding: '1rem' }}>
                          <span style={{ color: '#e4e4e7' }}>{userDept ? userDept.name : '部署なし'}</span>
                          {user.position && <span style={{ color: '#71717a', fontSize: '0.75rem', display: 'block' }}>{user.position}</span>}
                        </td>
                        <td className={styles.td} style={{ padding: '1rem' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            background: user.role === 'ORG_ADMIN' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: user.role === 'ORG_ADMIN' ? '#818cf8' : '#a1a1aa',
                            border: user.role === 'ORG_ADMIN' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'
                          }}>
                            {user.role === 'ORG_ADMIN' ? '組織管理者' : '受講者'}
                          </span>
                        </td>
                        <td className={styles.td} style={{ padding: '1rem' }}>
                          <span style={{ color: user.is_active ? '#4ade80' : '#fca5a5' }}>
                            {user.is_active ? '有効' : '無効'}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
