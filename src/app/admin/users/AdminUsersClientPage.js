'use client'

import { useState, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createUser, toggleUserActive, assignRoadmapsToUser } from './actions'
import styles from '../admin.module.css'

export default function AdminUsersClientPage({ initialUsers, organizations, departments, roadmaps = [] }) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedOrgFilter, setSelectedOrgFilter] = useState('all')
  const [selectedModalOrgId, setSelectedModalOrgId] = useState('')
  
  const [tempPassword, setTempPassword] = useState('')
  const [invitedEmail, setInvitedEmail] = useState('')
  const [isPending, setIsPending] = useState(false)

  // ロードマップ割り当て管理用 state
  const [activeAssignUserId, setActiveAssignUserId] = useState(null)
  const [isAssignPending, setIsAssignPending] = useState(false)

  // フォームアクション管理
  const [state, formAction, isFormPending] = useActionState(async (prevState, formData) => {
    const res = await createUser(prevState, formData)
    if (res?.success) {
      setIsModalOpen(false)
      setTempPassword(res.tempPassword)
      setInvitedEmail(formData.get('email'))
      router.refresh()
    }
    return res
  }, null)

  // 部署フィルタリング（モーダル内での組織切り替え連動）
  const filteredModalDepartments = departments.filter(
    (d) => d.organization_id === selectedModalOrgId
  )

  // ユーザー一覧の組織フィルタリング
  const filteredUsers = initialUsers.filter((u) => {
    if (selectedOrgFilter === 'all') return true
    return u.organization_id === selectedOrgFilter
  })

  // 有効/無効トグル
  const handleToggleStatus = async (userId, name, currentStatus) => {
    const actionText = currentStatus ? '無効化' : '有効化'
    if (confirm(`本当に「${name}」を${actionText}しますか？`)) {
      setIsPending(true)
      const res = await toggleUserActive(userId, !currentStatus)
      setIsPending(false)
      if (res?.error) {
        alert(res.error)
      } else {
        router.refresh()
      }
    }
  }

  // 個人へのロードマップ割り当て保存処理
  const handleAssignRoadmapsSubmit = async (e) => {
    e.preventDefault()
    setIsAssignPending(true)
    const formData = new FormData(e.target)
    const roadmapIds = formData.getAll('roadmap_ids')

    const res = await assignRoadmapsToUser(activeAssignUserId, roadmapIds)
    setIsAssignPending(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setActiveAssignUserId(null)
      router.refresh()
    }
  }

  const assignUser = activeAssignUserId ? initialUsers.find(u => u.id === activeAssignUserId) : null
  const filteredRoadmaps = assignUser ? roadmaps.filter(
    r => r.organization_id === null || r.organization_id === assignUser.organization_id
  ) : []
  const currentlyAssignedIds = assignUser?.user_learning_paths?.map(ulp => ulp.learning_path_id) || []

  return (
    <div>
      {/* ヘッダーエリア */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.25rem' }}>システムユーザー管理</h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>プラットフォーム内の全組織に属するユーザー、システム管理者アカウントの追加・無効化を管理します。</p>
        </div>
        <button
          onClick={() => {
            setTempPassword('')
            setSelectedModalOrgId('')
            setIsModalOpen(true)
          }}
          className={`${styles.btn} ${styles.btnPrimary}`}
        >
          新規ユーザー登録
        </button>
      </div>

      {/* フィルター＆仮パスワード表示 */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {tempPassword && (
          <div className={styles.tempPasswordBox}>
            <h4 style={{ fontWeight: '700', marginBottom: '0.5rem', color: '#34d399' }}>✓ ユーザーを追加しました</h4>
            <p style={{ fontSize: '0.85rem', color: '#a1a1aa', marginBottom: '0.75rem' }}>
              アカウント <strong>{invitedEmail}</strong> を登録しました。配布用の仮パスワードをコピーしてください。
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <code style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '1.1rem', color: '#34d399', fontWeight: '700', letterSpacing: '0.05em' }}>
                {tempPassword}
              </code>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                onClick={() => {
                  navigator.clipboard.writeText(tempPassword)
                  alert('コピーしました！')
                }}
              >
                コピー
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ fontSize: '0.875rem', color: '#a1a1aa' }}>組織で絞り込み:</label>
          <select
            value={selectedOrgFilter}
            onChange={(e) => setSelectedOrgFilter(e.target.value)}
            className={styles.select}
            style={{ width: '240px', padding: '0.5rem' }}
          >
            <option value="all">すべての組織</option>
            {organizations.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ユーザー一覧テーブル */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>氏名</th>
              <th className={styles.th}>メールアドレス</th>
              <th className={styles.th}>所属組織</th>
              <th className={styles.th}>部署</th>
              <th className={styles.th}>ロール</th>
              <th className={styles.th}>状態</th>
              <th className={styles.th} style={{ textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="7" className={styles.td} style={{ textAlign: 'center', color: '#71717a', padding: '3rem' }}>
                  該当するユーザーが見つかりません。
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const org = organizations.find(o => o.id === u.organization_id)
                const dept = departments.find(d => d.id === u.department_id)
                
                return (
                  <tr key={u.id} className={styles.tr}>
                    <td className={styles.td} style={{ fontWeight: '600', color: '#ffffff' }}>{u.name}</td>
                    <td className={styles.td}>{u.email}</td>
                    <td className={styles.td}>{org ? org.name : '本部 / システム外'}</td>
                    <td className={styles.td}>{dept ? dept.name : '-'}</td>
                    <td className={styles.td}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        background: u.role === 'SYSTEM_ADMIN' ? 'rgba(239, 68, 68, 0.15)' : u.role === 'ORG_ADMIN' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: u.role === 'SYSTEM_ADMIN' ? '#fca5a5' : u.role === 'ORG_ADMIN' ? '#34d399' : '#a1a1aa',
                        border: u.role === 'SYSTEM_ADMIN' ? '1px solid rgba(239, 68, 68, 0.3)' : u.role === 'ORG_ADMIN' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        {u.role === 'SYSTEM_ADMIN' ? '本部管理' : u.role === 'ORG_ADMIN' ? '組織管理' : '受講者'}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={`${styles.badge} ${u.is_active ? styles.badgeActive : styles.badgeSuspended}`}>
                        {u.is_active ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className={styles.td} style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          onClick={() => setActiveAssignUserId(u.id)}
                          className={`${styles.btn} ${styles.btnSecondary}`}
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          disabled={isPending || isAssignPending}
                        >
                          ロードマップ
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u.id, u.name, u.is_active)}
                          className={`${styles.btn} ${u.is_active ? styles.btnDanger : styles.btnSecondary}`}
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          disabled={isPending || isAssignPending}
                        >
                          {u.is_active ? '無効化' : '有効化'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 新規登録モーダル */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>新規システムユーザー登録</div>
            <form action={formAction}>
              {state?.error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                  {state.error}
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="name">氏名 *</label>
                <input id="name" name="name" type="text" className={styles.input} required placeholder="例: あわい 太郎" />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="email">メールアドレス *</label>
                <input id="email" name="email" type="email" className={styles.input} required placeholder="example@zeros.jp" />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="organizationId">所属組織 *</label>
                <select
                  id="organizationId"
                  name="organizationId"
                  required
                  className={styles.select}
                  value={selectedModalOrgId}
                  onChange={(e) => setSelectedModalOrgId(e.target.value)}
                >
                  <option value="">-- 組織を選択してください --</option>
                  {organizations.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="departmentId">所属部署</label>
                <select
                  id="departmentId"
                  name="departmentId"
                  disabled={!selectedModalOrgId}
                  className={styles.select}
                >
                  <option value="none">部署未設定 / 本部直轄</option>
                  {filteredModalDepartments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="role">システム権限</label>
                <select id="role" name="role" className={styles.select}>
                  <option value="LEARNER">受講者 (一般ユーザー)</option>
                  <option value="ORG_ADMIN">組織管理者 (テナント管理者)</option>
                  <option value="SYSTEM_ADMIN">システム本部管理者</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="position">役職</label>
                <input id="position" name="position" type="text" className={styles.input} placeholder="例: 看護部長、一般職員" />
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
                  {isFormPending ? '登録中...' : 'ユーザーを登録'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN ROADMAP MODAL */}
      {activeAssignUserId && assignUser && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '550px' }}>
            <div className={styles.modalHeader}>
              <div>ロードマップ個別割り当て設定</div>
              <div style={{ fontSize: '0.85rem', color: '#a1a1aa', fontWeight: '500', marginTop: '0.25rem' }}>
                対象受講者: <strong>{assignUser.name}</strong> ({organizations.find(o => o.id === assignUser.organization_id)?.name || '所属組織なし'})
              </div>
            </div>
            <form onSubmit={handleAssignRoadmapsSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label}>割り当てるロードマップ（複数選択可）</label>
                {filteredRoadmaps.length === 0 ? (
                  <span style={{ fontSize: '0.85rem', color: '#71717a', padding: '1rem 0' }}>
                    このユーザーに公開可能なアクティブなロードマップがありません。
                  </span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(0, 0, 0, 0.2)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)', maxHeight: '300px', overflowY: 'auto' }}>
                    {filteredRoadmaps.map(rm => {
                      const isChecked = currentlyAssignedIds.includes(rm.id)
                      const isHq = rm.organization_id === null
                      return (
                        <label key={rm.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#e4e4e7', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            name="roadmap_ids"
                            value={rm.id}
                            defaultChecked={isChecked}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)' }}
                          />
                          <span>{rm.name}</span>
                          <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', borderRadius: '4px', background: isHq ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)', color: isHq ? '#818cf8' : '#a1a1aa' }}>
                            {isHq ? '本部共通' : '自組織'}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setActiveAssignUserId(null)}
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  disabled={isAssignPending}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={isAssignPending}
                >
                  {isAssignPending ? '保存中...' : '割り当てを保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
