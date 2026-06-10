'use client'

import React from 'react'
import styles from './org.module.css'

export default function OrgDashboardClientPage({
  orgName,
  userCount,
  deptCount,
  completedEnrollments,
  departmentStats,
  courseStats,
  alertUsers,
  allProgressData,
  notifications
}) {

  const handleExportCSV = () => {
    if (!allProgressData || allProgressData.length === 0) {
      alert('エクスポートするデータがありません。')
      return
    }

    const headers = ['氏名', '部署', 'メールアドレス', 'コース名', '進捗率(%)', 'ステータス', '開始日', '修了日']
    const csvRows = [headers.join(',')]

    allProgressData.forEach(row => {
      const values = [
        `"${row.userName.replace(/"/g, '""')}"`,
        `"${row.deptName.replace(/"/g, '""')}"`,
        `"${row.userEmail.replace(/"/g, '""')}"`,
        `"${row.courseTitle.replace(/"/g, '""')}"`,
        `"${row.progress}"`,
        `"${row.status}"`,
        `"${row.startedAt}"`,
        `"${row.completedAt}"`
      ]
      csvRows.push(values.join(','))
    })

    // UTF-8 with BOM to prevent Excel double-byte character corruption
    const csvContent = '\uFEFF' + csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `受講進捗レポート_${orgName}_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      {/* Header with Export Action */}
      <div className={styles.dashboardHeader}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: '#ffffff' }}>
            {orgName ? `${orgName} ダッシュボード` : '組織ダッシュボード'}
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>自組織の受講進捗およびユーザー利用状況の分析サマリーです。</p>
        </div>
        
        <button onClick={handleExportCSV} className={`${styles.btn} ${styles.btnPrimary}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.35rem' }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          受講進捗CSVエクスポート
        </button>
      </div>

      {/* Notifications Area */}
      {notifications && notifications.length > 0 && (
        <div className={styles.card} style={{
          marginBottom: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(255, 255, 255, 0.01)',
          padding: '1.25rem 1.5rem',
          borderRadius: '16px'
        }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
            <span style={{ fontSize: '1.1rem' }}>📢</span> 本部管理者からのお知らせ
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {notifications.map(n => (
              <div key={n.id} style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.03)', paddingBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#71717a', whiteSpace: 'nowrap', minWidth: '85px' }}>
                  {new Date(n.created_at).toLocaleDateString('ja-JP')}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffffff' }}>{n.title}</span>
                  <span style={{ fontSize: '0.85rem', color: '#a1a1aa', whiteSpace: 'pre-wrap' }}>{n.content}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className={styles.grid}>
        <div className={styles.card}>
          <span className={styles.cardTitle}>所属メンバー数 (受講生)</span>
          <span className={styles.cardValue}>{userCount} 名</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardTitle}>登録部署（グループ）数</span>
          <span className={styles.cardValue}>{deptCount} 部署</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardTitle}>コース修了総数</span>
          <span className={styles.cardValue}>{completedEnrollments} 件</span>
        </div>
      </div>

      {/* Stats Sections */}
      <div className={styles.statsSplit}>
        
        {/* Department Stats */}
        <div className={styles.card} style={{ gap: '1rem' }}>
          <h3 className={styles.sectionTitle} style={{ fontSize: '1.1rem', fontWeight: '600', color: '#ffffff', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.75rem' }}>
            部署別受講進捗
          </h3>
          <div className={styles.tableContainer} style={{ margin: 0, border: 'none', background: 'none' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th} style={{ padding: '0.5rem 0' }}>部署名</th>
                  <th className={styles.th} style={{ padding: '0.5rem 0', textAlign: 'center' }}>人数</th>
                  <th className={styles.th} style={{ padding: '0.5rem 0', textAlign: 'right' }}>平均進捗率</th>
                </tr>
              </thead>
              <tbody>
                {departmentStats.length === 0 ? (
                  <tr>
                    <td colSpan="3" className={styles.td} style={{ textAlign: 'center', padding: '2rem' }}>データがありません</td>
                  </tr>
                ) : (
                  departmentStats.map(dept => (
                    <tr key={dept.id} className={styles.tr}>
                      <td className={styles.td} style={{ padding: '1rem 0' }}>{dept.name}</td>
                      <td className={styles.td} style={{ padding: '1rem 0', textAlign: 'center' }}>{dept.userCount} 名</td>
                      <td className={styles.td} style={{ padding: '1rem 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
                          <div style={{ width: '80px', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${dept.avgProgress}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                              borderRadius: '9999px'
                            }}></div>
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#10b981', minWidth: '35px', textAlign: 'right' }}>
                            {dept.avgProgress}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Course Stats */}
        <div className={styles.card} style={{ gap: '1rem' }}>
          <h3 className={styles.sectionTitle} style={{ fontSize: '1.1rem', fontWeight: '600', color: '#ffffff', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.75rem' }}>
            コース別受講状況
          </h3>
          <div className={styles.tableContainer} style={{ margin: 0, border: 'none', background: 'none' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th} style={{ padding: '0.5rem 0' }}>コース名</th>
                  <th className={styles.th} style={{ padding: '0.5rem 0', textAlign: 'center' }}>受講中</th>
                  <th className={styles.th} style={{ padding: '0.5rem 0', textAlign: 'center' }}>修了数</th>
                  <th className={styles.th} style={{ padding: '0.5rem 0', textAlign: 'right' }}>全体修了率</th>
                </tr>
              </thead>
              <tbody>
                {courseStats.length === 0 ? (
                  <tr>
                    <td colSpan="4" className={styles.td} style={{ textAlign: 'center', padding: '2rem' }}>公開中のコースがありません</td>
                  </tr>
                ) : (
                  courseStats.map(course => (
                    <tr key={course.id} className={styles.tr}>
                      <td className={styles.td} style={{ padding: '1rem 0', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={course.title}>
                        {course.title}
                      </td>
                      <td className={styles.td} style={{ padding: '1rem 0', textAlign: 'center' }}>{course.startedCount} 名</td>
                      <td className={styles.td} style={{ padding: '1rem 0', textAlign: 'center' }}>{course.completedCount} 名</td>
                      <td className={styles.td} style={{ padding: '1rem 0', textAlign: 'right', fontWeight: '600', color: '#06b6d4' }}>
                        {course.completionRate}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Alert Warning Panel (Require Attention List) */}
      <div className={styles.card} style={{ marginTop: '2rem', gap: '1rem' }}>
        <h3 className={styles.sectionTitle} style={{ fontSize: '1.1rem', fontWeight: '600', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.2rem' }}>⚠️</span> 必須受講アラート対象メンバー
        </h3>
        <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '-0.5rem' }}>必須受講が期限切れ、または未着手の対象者リストです。フォローアップを行ってください。</p>
        <div className={styles.tableContainer} style={{ margin: 0 }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>対象者名</th>
                <th className={styles.th}>部署</th>
                <th className={styles.th}>必須コース</th>
                <th className={styles.th} style={{ textAlign: 'center' }}>進捗率</th>
                <th className={styles.th}>提出期限</th>
                <th className={styles.th} style={{ textAlign: 'center' }}>アラート状況</th>
              </tr>
            </thead>
            <tbody>
              {alertUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className={styles.td} style={{ textAlign: 'center', padding: '2.5rem', color: '#71717a' }}>
                    現在、アラート対象の受講遅延メンバーはいません。
                  </td>
                </tr>
              ) : (
                alertUsers.map((item, idx) => (
                  <tr key={idx} className={styles.tr}>
                    <td className={styles.td} style={{ fontWeight: '500', color: '#ffffff' }}>{item.userName}</td>
                    <td className={styles.td}>{item.deptName}</td>
                    <td className={styles.td}>{item.courseTitle}</td>
                    <td className={styles.td} style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: '600', color: item.progress > 0 ? '#6366f1' : '#a1a1aa' }}>
                        {item.progress}%
                      </span>
                    </td>
                    <td className={styles.td} style={{ fontSize: '0.85rem' }}>
                      {new Date(item.dueDate).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                    </td>
                    <td className={styles.td} style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        border: '1px solid',
                        backgroundColor: item.status === 'overdue' ? 'rgba(239, 68, 68, 0.15)' : item.status === 'neardue' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(113, 113, 122, 0.15)',
                        color: item.status === 'overdue' ? '#fca5a5' : item.status === 'neardue' ? '#fde047' : '#d4d4d8',
                        borderColor: item.status === 'overdue' ? 'rgba(239, 68, 68, 0.3)' : item.status === 'neardue' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(113, 113, 122, 0.3)'
                      }}>
                        {item.status === 'overdue' ? '⚠️ 期限超過' : item.status === 'neardue' ? '🕒 期限間近' : '未着手'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
