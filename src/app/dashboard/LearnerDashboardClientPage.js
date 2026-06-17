'use client'

import Link from 'next/link'
import styles from './dashboard.module.css'

export default function LearnerDashboardClientPage({
  profile,
  nextRecommendedCourses,
  studyingCourses,
  completedCount,
  totalVisibleCourses,
  mandatoryCourses,
  notifications,
  debugErrors,
  debugData
}) {
  const name = profile?.name || '受講者'
  const orgName = profile?.organizations?.name || 'あわい屋ZEROS'

  // Calculate overall progress
  const overallProgress = totalVisibleCourses > 0
    ? Math.round((completedCount * 100) / totalVisibleCourses)
    : 0

  return (
    <div>
      {/* デバッグ用データ表示領域 */}
      {debugData && (
        <div style={{
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          color: '#c7d2fe',
          padding: '1.25rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          fontSize: '0.85rem',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap'
        }}>
          <h4 style={{ fontWeight: '800', marginBottom: '0.5rem', color: '#818cf8' }}>ℹ️ デバッグ用生データ情報</h4>
          {JSON.stringify(debugData, null, 2)}
        </div>
      )}

      {/* デバッグ用エラー表示領域 */}
      {debugErrors && Object.keys(debugErrors).length > 0 && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          padding: '1.25rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          fontSize: '0.9rem',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap'
        }}>
          <h4 style={{ fontWeight: '800', marginBottom: '0.5rem', color: '#ef4444' }}>⚠️ データベースクエリエラー（デバッグ用情報）</h4>
          {JSON.stringify(debugErrors, null, 2)}
        </div>
      )}
      {/* Welcome Banner */}
      <div className={styles.card} style={{
        marginBottom: '2rem',
        background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.1), rgba(0, 0, 0, 0.2))',
        border: '1px solid rgba(99, 102, 241, 0.15)',
        padding: '2rem'
      }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff' }}>
          こんにちは、{name} さん！
        </h2>
        <p style={{ color: '#a1a1aa', fontSize: '0.95rem', marginTop: '0.5rem' }}>
          {orgName} の受講者ポータルへようこそ。成長目標を確認し、ロードマップに沿って学習を進めましょう。
        </p>
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
            <span style={{ fontSize: '1.1rem' }}>📢</span> 重要なお知らせ
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

      {/* Metrics Summary Row */}
      <div className={styles.grid} style={{ marginBottom: '2.5rem' }}>
        <div className={styles.card}>
          <span className={styles.cardTitle}>受講可能な総コース数</span>
          <span className={styles.cardValue}>{totalVisibleCourses} コース</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardTitle}>修了したコース数</span>
          <span className={styles.cardValue}>{completedCount} コース</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardTitle}>現在の総合進捗</span>
          <span className={styles.cardValue}>{overallProgress}%</span>
          <div className={styles.progressBarContainer} style={{ marginTop: '0.5rem', height: '4px' }}>
            <div className={styles.progressBar} style={{ width: `${overallProgress}%` }}></div>
          </div>
        </div>
      </div>

      {/* Dashboard 2-Column Split */}
      <div className={styles.dashboardSplit}>
        
        {/* LEFT COLUMN: NEXT RECOMMENDED & CURRENT STUDYING */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* Next Recommended Course (Crucial Career/Learning Path Feature) */}
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1.25rem', color: '#ffffff' }}>次に学ぶべき推奨コース</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {nextRecommendedCourses.length === 0 ? (
                <div className={styles.card} style={{ padding: '1.5rem', color: '#71717a', fontSize: '0.9rem', textAlign: 'center' }}>
                  現在設定されているロードマップ推奨コースはありません。コース一覧から学習を開始してください。
                </div>
              ) : (
                nextRecommendedCourses.map(course => (
                  <Link
                    key={course.id}
                    href={`/dashboard/courses/${course.id}`}
                    className={`${styles.courseCard} ${styles.roadmapCardActive} ${styles.recommendedCourseCard}`}
                  >
                    <div style={{ flex: 1, paddingRight: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#a5b4fc', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                          推奨アクション
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#71717a' }}>学習パス: {course.roadmapName}</span>
                      </div>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#ffffff' }}>{course.title}</h4>
                      <p style={{ fontSize: '0.85rem', color: '#a1a1aa', marginTop: '0.25rem' }}>{course.description || 'このコースには解説がありません。'}</p>
                    </div>

                    <span className={`${styles.btn} ${styles.btnPrimary}`} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}>
                      学習を開始する &rarr;
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Studying Courses (Already in progress) */}
          {studyingCourses.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1.25rem', color: '#ffffff' }}>学習中のコース</h3>
              
              <div className={styles.courseGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                {studyingCourses.map(course => (
                  <Link key={course.id} href={`/dashboard/courses/${course.id}`} className={styles.courseCard}>
                    <span className={styles.categoryTag}>{course.categories?.name || 'その他'}</span>
                    <h4 className={styles.courseTitle} style={{ fontSize: '1rem' }}>{course.title}</h4>
                    
                    <div className={styles.progressWrapper} style={{ marginTop: '1.5rem' }}>
                      <div className={styles.progressLabel}>
                        <span>学習中</span>
                        <span>{course.progress_percent}%</span>
                      </div>
                      <div className={styles.progressBarContainer}>
                        <div className={styles.progressBar} style={{ width: `${course.progress_percent}%` }}></div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: MANDATORY/COMPLIANCE COURSES WITH DEADLINES */}
        <div className={styles.card} style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff', marginBottom: '1.25rem' }}>期限付き必須研修</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {mandatoryCourses.length === 0 ? (
              <span style={{ color: '#71717a', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem' }}>
                現在提出が必要な必須研修はありません。
              </span>
            ) : (
              mandatoryCourses.map(course => {
                const isOverdue = course.due_date && new Date(course.due_date) < new Date() && course.enrollment_status !== 'completed'
                const isCompleted = course.enrollment_status === 'completed'
                
                return (
                  <Link
                    key={course.id}
                    href={`/dashboard/courses/${course.id}`}
                    style={{
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'all 0.2s ease',
                      borderLeft: isOverdue 
                        ? '4px solid #ef4444' 
                        : isCompleted 
                          ? '4px solid #10b981' 
                          : '4px solid #eab308'
                    }}
                    className={styles.tr}
                  >
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: isCompleted ? '#34d399' : '#ffffff' }}>
                        {course.title}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      <span style={{ color: isOverdue ? '#fca5a5' : '#a1a1aa' }}>
                        期限: {course.due_date ? new Date(course.due_date).toLocaleDateString('ja-JP') : 'なし'} {isOverdue && '(期限切れ)'}
                      </span>
                      <span style={{ fontWeight: '600', color: isCompleted ? '#10b981' : '#a1a1aa' }}>
                        {isCompleted ? '✓ 完了' : `${course.progress_percent}%`}
                      </span>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
