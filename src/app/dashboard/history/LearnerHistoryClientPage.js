'use client'

import React from 'react'
import Link from 'next/link'
import styles from '../dashboard.module.css'
import { formatDate } from '@/utils/format'

export default function LearnerHistoryClientPage({
  completedCoursesCount,
  totalMinutes,
  completedCoursesList,
  activeCoursesCount
}) {
  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: '#ffffff' }}>
          学習履歴
        </h2>
        <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>これまでに修了したコースと、学習時間のサマリーです。</p>
      </div>

      {/* KPI Cards Grid */}
      <div className={styles.courseGrid} style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '2.5rem' }}>
        
        {/* KPI: Completed Courses */}
        <div className={styles.courseCard} style={{ cursor: 'default', minHeight: 'auto', padding: '1.5rem' }}>
          <span style={{ fontSize: '0.825rem', fontWeight: '500', color: '#a1a1aa' }}>修了コース数</span>
          <span style={{ fontSize: '2.25rem', fontWeight: '800', color: '#10b981', marginTop: '0.5rem' }}>
            {completedCoursesCount} <span style={{ fontSize: '1rem', fontWeight: '500', color: '#a1a1aa' }}>コース</span>
          </span>
        </div>

        {/* KPI: Total Study Time */}
        <div className={styles.courseCard} style={{ cursor: 'default', minHeight: 'auto', padding: '1.5rem' }}>
          <span style={{ fontSize: '0.825rem', fontWeight: '500', color: '#a1a1aa' }}>総学習時間 (目安)</span>
          <span style={{ fontSize: '2.25rem', fontWeight: '800', color: '#6366f1', marginTop: '0.5rem' }}>
            {totalMinutes} <span style={{ fontSize: '1rem', fontWeight: '500', color: '#a1a1aa' }}>分</span>
          </span>
        </div>

        {/* KPI: Active Courses */}
        <div className={styles.courseCard} style={{ cursor: 'default', minHeight: 'auto', padding: '1.5rem' }}>
          <span style={{ fontSize: '0.825rem', fontWeight: '500', color: '#a1a1aa' }}>現在受講中のコース</span>
          <span style={{ fontSize: '2.25rem', fontWeight: '800', color: '#eab308', marginTop: '0.5rem' }}>
            {activeCoursesCount} <span style={{ fontSize: '1rem', fontWeight: '500', color: '#a1a1aa' }}>コース</span>
          </span>
        </div>

      </div>

      {/* List of Completed Courses */}
      <div className={styles.courseCard} style={{ cursor: 'default', minHeight: 'auto', padding: '2rem', gap: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#ffffff', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.75rem', margin: 0 }}>
          修了証発行可能コース一覧
        </h3>
        
        {completedCoursesList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#71717a' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>🎓</span>
            まだ修了したコースはありません。コース一覧から学習を進めて修了を目指しましょう！
            <div style={{ marginTop: '1.5rem' }}>
              <Link href="/dashboard/courses" className={`${styles.tab} ${styles.activeTab}`} style={{ textDecoration: 'none', display: 'inline-block' }}>
                コース一覧へ行く &rarr;
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <th style={{ padding: '0.75rem 1rem', color: '#a1a1aa', fontWeight: '600' }}>コース名</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#a1a1aa', fontWeight: '600' }}>カテゴリ</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#a1a1aa', fontWeight: '600', textAlign: 'center' }}>レッスン数</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#a1a1aa', fontWeight: '600', textAlign: 'center' }}>目安時間</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#a1a1aa', fontWeight: '600' }}>学習開始日</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#a1a1aa', fontWeight: '600' }}>修了日</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#a1a1aa', fontWeight: '600', textAlign: 'right' }}>アクション</th>
                </tr>
              </thead>
              <tbody>
                {completedCoursesList.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <td style={{ padding: '1.25rem 1rem', fontWeight: '600', color: '#ffffff' }}>{item.title}</td>
                    <td style={{ padding: '1.25rem 1rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#818cf8',
                        backgroundColor: 'rgba(129, 140, 248, 0.1)',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        border: '1px solid rgba(129, 140, 248, 0.2)'
                      }}>
                        {item.categoryName}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>{item.totalLessonsCount} レッスン</td>
                    <td style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>{item.durationMinutes} 分</td>
                    <td style={{ padding: '1.25rem 1rem', fontSize: '0.85rem' }}>
                      {formatDate(item.startedAt)}
                    </td>
                    <td style={{ padding: '1.25rem 1rem', fontSize: '0.85rem', color: '#10b981', fontWeight: '600' }}>
                      {formatDate(item.completedAt)}
                    </td>
                    <td style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => alert(`「${item.title}」の修了証を発行しました！（※デモ機能です）`)}
                        style={{
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: '#10b981',
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.2)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)'
                        }}
                      >
                        🎓 修了証出力
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
