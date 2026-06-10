'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toggleLessonProgress } from './actions'
import styles from '../../../../dashboard.module.css'

export default function LearnerLessonClientPage({ course, lesson, nextLessonId, initialIsCompleted }) {
  const [isCompleted, setIsCompleted] = useState(initialIsCompleted)
  const [isPending, startTransition] = useTransition()

  const handleToggleComplete = () => {
    const nextState = !isCompleted
    startTransition(async () => {
      const res = await toggleLessonProgress(course.id, lesson.id, nextState)
      if (res?.error) {
        alert(res.error)
      } else {
        setIsCompleted(nextState)
      }
    })
  }

  // Helper to extract YouTube video ID and build embed URL
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return ''
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = url.match(regExp)
    const videoId = (match && match[2].length === 11) ? match[2] : null
    return videoId ? `https://www.youtube.com/embed/${videoId}` : ''
  }

  const embedUrl = lesson.content_type === 'video' ? getYouTubeEmbedUrl(lesson.url) : ''

  return (
    <div>
      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <Link href={`/dashboard/courses/${course.id}`} className={`${styles.btn} ${styles.btnSecondary}`} style={{ padding: '0.5rem 1rem' }}>
          &larr; コース詳細に戻る
        </Link>
        <span style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>
          コース: <strong>{course.title}</strong>
        </span>
      </div>

      {/* Lesson Container */}
      <div className={styles.card} style={{ padding: '2rem' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '1.25rem', marginBottom: '2rem' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
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
              <span style={{ fontSize: '0.8rem', color: '#71717a' }}>目安時間: {lesson.estimated_minutes}分</span>
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff' }}>{lesson.title}</h2>
          </div>

          {/* Completion Action */}
          <button
            onClick={handleToggleComplete}
            disabled={isPending}
            className={`${styles.btn} ${isCompleted ? styles.btnSecondary : styles.btnPrimary}`}
            style={{
              padding: '0.6rem 1.5rem',
              background: isCompleted ? 'rgba(16, 185, 129, 0.15)' : undefined,
              borderColor: isCompleted ? '#10b981' : undefined,
              color: isCompleted ? '#34d399' : undefined
            }}
          >
            {isPending ? '更新中...' : isCompleted ? '✓ 修了済み（やり直す）' : '学習完了にする'}
          </button>
        </div>

        {/* Content Viewer based on Type */}
        <div style={{ marginBottom: '2rem' }}>
          
          {lesson.content_type === 'video' && (
            embedUrl ? (
              <div className={styles.videoContainer}>
                <iframe src={embedUrl} allowFullScreen title={lesson.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
              </div>
            ) : (
              <div className={styles.linkCard}>
                <span className={styles.linkIcon}>🎬</span>
                <div>
                  <h4>動画教材を開く</h4>
                  <p>動画URLの形式が自動埋め込みに対応していません。下記のボタンをクリックして直接閲覧してください。</p>
                </div>
                <a href={lesson.url} target="_blank" rel="noopener noreferrer" className={`${styles.btn} ${styles.btnPrimary}`}>
                  動画を直接再生 (別タブ)
                </a>
              </div>
            )
          )}

          {lesson.content_type === 'article' && (
            <div className={styles.articleBody}>
              {(lesson.article_content || '記事の内容がありません。').split('\n').map((para, i) => {
                if (para.trim().startsWith('### ')) return <h3 key={i} style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>{para.replace('### ', '')}</h3>
                if (para.trim().startsWith('## ')) return <h2 key={i} style={{ marginTop: '1.75rem', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.5rem' }}>{para.replace('## ', '')}</h2>
                if (para.trim().startsWith('# ')) return <h1 key={i} style={{ marginTop: '2rem', marginBottom: '1rem' }}>{para.replace('# ', '')}</h1>
                return <p key={i} style={{ marginBottom: '1.25rem', color: '#d4d4d8' }}>{para}</p>
              })}
            </div>
          )}

          {(lesson.content_type === 'pdf' || lesson.content_type === 'word' || lesson.content_type === 'powerpoint' || lesson.content_type === 'url') && (
            <div className={styles.linkCard}>
              <span className={styles.linkIcon}>
                {lesson.content_type === 'pdf' ? '📄' : lesson.content_type === 'url' ? '🔗' : '📁'}
              </span>
              <div>
                <h4>{lesson.title}</h4>
                <p>
                  この教材は外部ファイルまたはWebサイトにあります。<br />
                  下記のボタンから教材を開き、内容を確認してください。学習後は「学習完了にする」ボタンを押してください。
                </p>
              </div>
              <a href={lesson.url} target="_blank" rel="noopener noreferrer" className={`${styles.btn} ${styles.btnPrimary}`} style={{ minWidth: '180px' }}>
                教材を開く &nearr;
              </a>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1.5rem', marginTop: '2rem' }}>
          <div>
            {isCompleted && (
              <span style={{ fontSize: '0.9rem', color: '#34d399', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                このレッスンの学習は完了しています！
              </span>
            )}
          </div>

          <div>
            {nextLessonId ? (
              <Link
                href={`/dashboard/courses/${course.id}/lessons/${nextLessonId}`}
                className={`${styles.btn} ${styles.btnPrimary}`}
                style={{
                  background: !isCompleted ? 'rgba(255, 255, 255, 0.03)' : undefined,
                  border: !isCompleted ? '1px solid rgba(255, 255, 255, 0.05)' : undefined,
                  color: !isCompleted ? '#71717a' : undefined,
                  cursor: !isCompleted ? 'not-allowed' : 'pointer'
                }}
                onClick={(e) => {
                  if (!isCompleted) {
                    e.preventDefault();
                    alert('次のレッスンに進むには、まずこのレッスンの学習を完了にしてください。');
                  }
                }}
              >
                次のステップへ進む &rarr;
              </Link>
            ) : (
              <Link href={`/dashboard/courses/${course.id}`} className={`${styles.btn} ${styles.btnSecondary}`}>
                コース詳細に戻り修了を確認
              </Link>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
