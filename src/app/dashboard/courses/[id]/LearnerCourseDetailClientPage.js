'use client'

import Link from 'next/link'
import styles from '../../dashboard.module.css'

export default function LearnerCourseDetailClientPage({ course, enrollment, completedLessonIds }) {
  const progressPercent = enrollment ? enrollment.progress_percent : 0
  const isCompleted = enrollment ? enrollment.status === 'completed' : false

  return (
    <div>
      {/* Back navigation */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/dashboard/courses" className={`${styles.btn} ${styles.btnSecondary}`} style={{ padding: '0.5rem 1rem' }}>
          &larr; コース一覧に戻る
        </Link>
      </div>

      {/* Course Detail Banner Card */}
      <div className={styles.courseDetailHeader}>
        <div>
          <span className={styles.categoryTag}>{course.categories?.name || 'その他'}</span>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', marginTop: '0.5rem', color: '#ffffff', lineHeight: '1.3' }}>
            {course.title}
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.95rem', marginTop: '1rem', lineHeight: '1.6', maxWidth: '600px' }}>
            {course.description || 'このコースには解説がありません。'}
          </p>
        </div>

        {/* Progress Summary Card on the right */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '1rem'
        }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>全体の進捗</span>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#ffffff', marginTop: '0.25rem' }}>
              {progressPercent}%
            </div>
          </div>
          <div className={styles.progressBarContainer}>
            <div className={styles.progressBar} style={{ width: `${progressPercent}%` }}></div>
          </div>
          <span style={{ fontSize: '0.8rem', color: isCompleted ? '#4ade80' : '#a1a1aa', fontWeight: '600' }}>
            {isCompleted ? '✓ コース修了済み' : '学習中'}
          </span>
        </div>
      </div>

      {/* Lesson List Section */}
      <div className={styles.card}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1.5rem', color: '#ffffff' }}>レッスンカリキュラム</h3>

        <div className={styles.lessonList}>
          {(!course.lessons || course.lessons.length === 0) ? (
            <div style={{ color: '#71717a', textAlign: 'center', padding: '3rem' }}>
              このコースにはまだ教材が追加されていません。
            </div>
          ) : (
            course.lessons.map((lesson, index) => {
              const isLessonCompleted = completedLessonIds.includes(lesson.id)
              return (
                <Link
                  key={lesson.id}
                  href={`/dashboard/courses/${course.id}/lessons/${lesson.id}`}
                  className={`${styles.lessonRow} ${isLessonCompleted ? styles.lessonCompleted : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Completion Check Circle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isLessonCompleted ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                        </svg>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#71717a' }}>STEP {index + 1}</span>
                      <span className={styles.lessonTitle}>{lesson.title}</span>
                    </div>
                  </div>

                  <div className={styles.lessonMeta}>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '0.1rem 0.35rem',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#d4d4d8',
                      textTransform: 'uppercase'
                    }}>
                      {lesson.content_type}
                    </span>
                    <span>目安: {lesson.estimated_minutes}分</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
