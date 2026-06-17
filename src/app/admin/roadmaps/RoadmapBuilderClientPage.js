'use client'

import { useState, useTransition } from 'react'
import {
  createRoadmap,
  updateRoadmap,
  deleteRoadmap,
  addCourseToRoadmap,
  removeCourseFromRoadmap,
  reorderRoadmapCourses
} from './actions'
import styles from '../admin.module.css'

export default function RoadmapBuilderClientPage({ initialRoadmaps, allCourses, organizations = [] }) {
  const [selectedRoadmapId, setSelectedRoadmapId] = useState(initialRoadmaps[0]?.id || null)
  const [searchQuery, setSearchQuery] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [courseToAdd, setCourseToAdd] = useState('')
  const [isPending, startTransition] = useTransition()

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const selectedRoadmap = initialRoadmaps.find(r => r.id === selectedRoadmapId)

  // Filter roadmaps list
  const filteredRoadmaps = initialRoadmaps.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filter out courses that are already in the selected roadmap
  const currentCourseIds = selectedRoadmap ? selectedRoadmap.courses.map(c => c.id) : []
  const availableCourses = allCourses.filter(c => !currentCourseIds.includes(c.id))

  // Handlers for Roadmap Management
  const handleCreateRoadmapSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    const formData = new FormData(e.target)
    const name = formData.get('name')
    const description = formData.get('description')

    startTransition(async () => {
      const res = await createRoadmap(name, description)
      if (res?.error) {
        setErrorMsg(res.error)
      } else {
        setIsCreateOpen(false)
        setSelectedRoadmapId(res.roadmap.id)
        e.target.reset()
      }
    })
  }

  const handleUpdateRoadmapSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    const formData = new FormData(e.target)
    const name = formData.get('name')
    const description = formData.get('description')
    const isActive = formData.get('is_active') === 'true'
    const visibleOrgIds = formData.getAll('visible_org_ids')

    startTransition(async () => {
      const res = await updateRoadmap(selectedRoadmap.id, name, description, isActive, visibleOrgIds)
      if (res?.error) {
        setErrorMsg(res.error)
      } else {
        alert('ロードマップ情報を更新しました。')
      }
    })
  }

  const handleDeleteRoadmap = async () => {
    if (confirm(`本当にロードマップ「${selectedRoadmap.name}」を削除しますか？\n設定された学習ステップの順序データはすべて削除されます。（実際のコース自体は削除されません）`)) {
      startTransition(async () => {
        const res = await deleteRoadmap(selectedRoadmap.id)
        if (res?.error) {
          setErrorMsg(res.error)
        } else {
          const remaining = initialRoadmaps.filter(r => r.id !== selectedRoadmap.id)
          setSelectedRoadmapId(remaining[0]?.id || null)
        }
      })
    }
  }

  // Handlers for Course step management
  const handleAddCourse = async (e) => {
    e.preventDefault()
    if (!courseToAdd) return

    setErrorMsg('')
    startTransition(async () => {
      const res = await addCourseToRoadmap(selectedRoadmap.id, courseToAdd)
      if (res?.error) {
        setErrorMsg(res.error)
      } else {
        setCourseToAdd('')
      }
    })
  }

  const handleRemoveCourse = async (courseId, courseTitle) => {
    if (confirm(`本当にコース「${courseTitle}」をこのロードマップから除外しますか？`)) {
      setErrorMsg('')
      startTransition(async () => {
        const res = await removeCourseFromRoadmap(selectedRoadmap.id, courseId)
        if (res?.error) {
          setErrorMsg(res.error)
        }
      })
    }
  }

  const handleMoveCourse = async (index, direction) => {
    const courseList = [...selectedRoadmap.courses]
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= courseList.length) return

    // Swap courses
    const temp = courseList[index]
    courseList[index] = courseList[targetIndex]
    courseList[targetIndex] = temp

    const orderedIds = courseList.map(c => c.id)
    startTransition(async () => {
      const res = await reorderRoadmapCourses(selectedRoadmap.id, orderedIds)
      if (res?.error) {
        alert(res.error)
      }
    })
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: '#ffffff' }}>ロードマップ（学習パス）管理</h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>新入職員用、中堅用などの育成ステップを定義し、受講コースの学習推奨順序を設定します。</p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => { setErrorMsg(''); setIsCreateOpen(true); }}>
          新規ロードマップ作成
        </button>
      </div>

      {/* Main Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: Roadmap selector */}
        <div className={styles.card} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '600px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff' }}>ロードマップ一覧</h3>
          
          <input
            type="text"
            placeholder="ロードマップ名で検索..."
            className={styles.input}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '0.5rem', fontSize: '0.85rem' }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', flex: 1, maxHeight: '500px' }}>
            {filteredRoadmaps.length === 0 ? (
              <span style={{ color: '#71717a', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                登録されているロードマップがありません。
              </span>
            ) : (
              filteredRoadmaps.map((r) => (
                <div
                  key={r.id}
                  onClick={() => { setErrorMsg(''); setSelectedRoadmapId(r.id); }}
                  style={{
                    background: r.id === selectedRoadmapId ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    border: r.id === selectedRoadmapId ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: r.id === selectedRoadmapId ? '#ffffff' : '#e4e4e7' }}>
                    {r.name}
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#71717a' }}>
                    <span>ステップ数: {r.courses?.length || 0}</span>
                    <span style={{ color: r.is_active ? '#4ade80' : '#fca5a5' }}>
                      {r.is_active ? '有効' : '無効'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Editor & Course steps mapping */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {selectedRoadmap ? (
            <>
              {/* SECTION A: ROADMAP METADATA */}
              <div className={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>ロードマップ詳細編集</h3>
                  <button className={`${styles.btn} ${styles.btnDanger}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={handleDeleteRoadmap} disabled={isPending}>
                    このロードマップを削除
                  </button>
                </div>

                <form onSubmit={handleUpdateRoadmapSubmit} key={selectedRoadmap.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="roadmap-name">ロードマップ名</label>
                    <input id="roadmap-name" name="name" type="text" defaultValue={selectedRoadmap.name} className={styles.input} required />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="roadmap-status">公開状態</label>
                    <select id="roadmap-status" name="is_active" defaultValue={selectedRoadmap.is_active ? 'true' : 'false'} className={styles.select}>
                      <option value="true">有効 (受講者画面へ表示)</option>
                      <option value="false">無効 (非表示)</option>
                    </select>
                  </div>

                  <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                    <label className={styles.label} htmlFor="roadmap-desc">ロードマップの説明</label>
                    <textarea id="roadmap-desc" name="description" rows="3" defaultValue={selectedRoadmap.description || ''} className={styles.textarea}></textarea>
                  </div>

                  {selectedRoadmap.organization_id === null && (
                    <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                      <label className={styles.label}>公開対象の組織（テナント）</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', background: 'rgba(0, 0, 0, 0.2)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        {organizations.map(org => {
                          const isChecked = selectedRoadmap.visibility?.includes(org.id)
                          return (
                            <label key={org.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#e4e4e7', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                name="visible_org_ids"
                                value={org.id}
                                defaultChecked={isChecked}
                                style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)' }}
                              />
                              {org.name}
                            </label>
                          )
                        })}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.25rem' }}>※チェックした組織（テナント）に所属する受講者の画面にのみ、このロードマップが表示されます。</span>
                    </div>
                  )}

                  <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={isPending}>
                      {isPending ? '更新中...' : '情報を保存'}
                    </button>
                  </div>
                </form>
              </div>

              {/* SECTION B: COURSE STEP BUILDER */}
              <div className={styles.card}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff', marginBottom: '1.25rem' }}>学習ステップ順序の編集</h3>

                {/* Add course to path form */}
                <form onSubmit={handleAddCourse} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', background: 'rgba(255, 255, 255, 0.01)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
                  <div style={{ flex: 1 }}>
                    <select
                      className={styles.select}
                      value={courseToAdd}
                      onChange={(e) => setCourseToAdd(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem' }}
                      disabled={isPending || availableCourses.length === 0}
                    >
                      <option value="">{availableCourses.length === 0 ? '追加可能なコースがありません' : '追加するコースを選択してください...'}</option>
                      {availableCourses.map(c => (
                        <option key={c.id} value={c.id}>[{c.categories?.name || 'その他'}] {c.title}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ minWidth: '120px' }} disabled={isPending || !courseToAdd}>
                    ステップに追加
                  </button>
                </form>

                {errorMsg && (
                  <div className={styles.errorAlert} style={{ marginBottom: '1.25rem' }}>
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Course list within path */}
                <div className={styles.tableContainer} style={{ marginTop: '0', borderRadius: '12px' }}>
                  <table className={styles.table} style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th className={styles.th} style={{ width: '60px', textAlign: 'center' }}>順序</th>
                        <th className={styles.th}>コース名</th>
                        <th className={styles.th}>カテゴリ</th>
                        <th className={styles.th} style={{ textAlign: 'right' }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!selectedRoadmap.courses || selectedRoadmap.courses.length === 0) ? (
                        <tr>
                          <td colSpan="4" className={styles.td} style={{ textAlign: 'center', color: '#71717a', padding: '3rem' }}>
                            コースが登録されていません。上のセレクトボックスから学習ステップを追加してください。
                          </td>
                        </tr>
                      ) : (
                        selectedRoadmap.courses.map((course, idx) => (
                          <tr key={course.id} className={styles.tr}>
                            <td className={styles.td} style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                                <button 
                                  style={{ background: 'none', border: 'none', color: idx === 0 ? '#3f3f46' : '#a1a1aa', cursor: idx === 0 ? 'not-allowed' : 'pointer' }}
                                  onClick={() => handleMoveCourse(idx, -1)}
                                  disabled={idx === 0 || isPending}
                                >
                                  ▲
                                </button>
                                <button 
                                  style={{ background: 'none', border: 'none', color: idx === selectedRoadmap.courses.length - 1 ? '#3f3f46' : '#a1a1aa', cursor: idx === selectedRoadmap.courses.length - 1 ? 'not-allowed' : 'pointer' }}
                                  onClick={() => handleMoveCourse(idx, 1)}
                                  disabled={idx === selectedRoadmap.courses.length - 1 || isPending}
                                >
                                  ▼
                                </button>
                              </div>
                            </td>
                            <td className={styles.td} style={{ fontWeight: '600', color: '#ffffff' }}>
                              {course.title}
                            </td>
                            <td className={styles.td}>
                              {course.categories?.name || 'その他'}
                            </td>
                            <td className={styles.td} style={{ textAlign: 'right' }}>
                              <button className={`${styles.btn} ${styles.btnDanger}`} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => handleRemoveCourse(course.id, course.title)} disabled={isPending}>
                                除外
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.card} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: '#71717a' }}>
              <span>ロードマップを選択するか、新規作成してください。</span>
            </div>
          )}

        </div>

      </div>

      {/* CREATE ROADMAP MODAL */}
      {isCreateOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>新規ロードマップを作成</div>
            <form onSubmit={handleCreateRoadmapSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="new-roadmap-name">ロードマップ名（例: 新卒看護師研修ステップ）</label>
                <input id="new-roadmap-name" name="name" type="text" className={styles.input} placeholder="例: 中途採用者初期研修" required />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="new-roadmap-desc">ロードマップの説明</label>
                <textarea id="new-roadmap-desc" name="description" rows="3" placeholder="このロードマップの対象者や育成目標について" className={styles.textarea}></textarea>
              </div>

              {errorMsg && (
                <div className={styles.errorAlert} style={{ marginBottom: '1.25rem' }}>
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className={styles.modalActions}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setIsCreateOpen(false)} disabled={isPending}>
                  キャンセル
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={isPending}>
                  {isPending ? '作成中...' : '作成'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
