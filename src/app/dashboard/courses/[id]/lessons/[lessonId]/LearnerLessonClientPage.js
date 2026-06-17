'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toggleLessonProgress, submitQuizAnswers } from './actions'
import styles from '../../../../dashboard.module.css'

export default function LearnerLessonClientPage({ course, lesson, nextLessonId, initialIsCompleted }) {
  const [isCompleted, setIsCompleted] = useState(initialIsCompleted)
  const [isPending, startTransition] = useTransition()

  // Quiz-specific States
  const [userAnswers, setUserAnswers] = useState({})
  const [quizResult, setQuizResult] = useState(null)
  const [quizError, setQuizError] = useState('')

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

  const handleQuizSubmit = (e) => {
    e.preventDefault()
    setQuizError('')

    const answeredCount = Object.keys(userAnswers).length
    const totalQuestions = lesson.quiz_questions?.length || 0
    if (answeredCount < totalQuestions) {
      setQuizError('すべての設問に回答してください。')
      return
    }

    startTransition(async () => {
      const res = await submitQuizAnswers(course.id, lesson.id, userAnswers)
      if (res?.error) {
        setQuizError(res.error)
      } else {
        setQuizResult(res)
        if (res.isPassed) {
          setIsCompleted(true)
        }
      }
    })
  }

  const handleRetakeQuiz = () => {
    setUserAnswers({})
    setQuizResult(null)
    setQuizError('')
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
                {lesson.content_type === 'quiz' ? '確認テスト' : lesson.content_type.toUpperCase()}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#71717a' }}>目安時間: {lesson.estimated_minutes}分</span>
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff' }}>{lesson.title}</h2>

            {(lesson.slide_pdf_url || lesson.worksheet_word_url) && (
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {lesson.slide_pdf_url && (
                  <a
                    href={lesson.slide_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.btn}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#fca5a5',
                      fontSize: '0.8rem',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      textDecoration: 'none',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    スライドPDF
                  </a>
                )}
                {lesson.worksheet_word_url && (
                  <a
                    href={lesson.worksheet_word_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.btn}
                    style={{
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      color: '#93c5fd',
                      fontSize: '0.8rem',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      textDecoration: 'none',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    ワークシートWord
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Completion Action (hidden for quizzes as they complete via quiz submission) */}
          {lesson.content_type !== 'quiz' && (
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
          )}
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

          {lesson.content_type === 'quiz' && (
            <div>
              {isCompleted && !quizResult ? (
                // If already completed in database (e.g. on page reload)
                <div style={{ textAlign: 'center', padding: '3rem 2rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '16px' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '1.25rem' }}>✓</div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#34d399', marginBottom: '0.5rem' }}>
                    この確認テストは修了済みです
                  </h3>
                  <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    テストは合格基準を満たし、学習記録として保存されています。
                  </p>
                  <button
                    onClick={() => {
                      setIsCompleted(false)
                      handleRetakeQuiz()
                    }}
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    style={{ fontSize: '0.85rem' }}
                  >
                    テストをもう一度受ける
                  </button>
                </div>
              ) : !quizResult ? (
                // 設問一覧フォーム
                <form onSubmit={handleQuizSubmit}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {(lesson.quiz_questions || []).map((q, idx) => (
                      <div key={q.id} style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '1.5rem' }}>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#ffffff', marginBottom: '1rem', lineHeight: '1.4' }}>
                          問{idx + 1}. {q.question}
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {[
                            { key: 'A', text: q.option_a },
                            { key: 'B', text: q.option_b },
                            { key: 'C', text: q.option_c },
                            { key: 'D', text: q.option_d }
                          ].map(opt => (
                            <label
                              key={opt.key}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem 1rem',
                                background: userAnswers[q.id] === opt.key ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                                border: userAnswers[q.id] === opt.key ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                color: userAnswers[q.id] === opt.key ? '#ffffff' : '#a1a1aa'
                              }}
                            >
                              <input
                                type="radio"
                                name={`question_${q.id}`}
                                value={opt.key}
                                checked={userAnswers[q.id] === opt.key}
                                onChange={() => setUserAnswers({ ...userAnswers, [q.id]: opt.key })}
                                style={{ accentColor: '#818cf8', width: '16px', height: '16px' }}
                              />
                              <span style={{ fontSize: '0.9rem' }}>{opt.key}. {opt.text}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {quizError && (
                    <div className={styles.errorAlert} style={{ marginTop: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <span>⚠️ {quizError}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2.5rem' }}>
                    <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ padding: '0.75rem 2.5rem', fontSize: '0.95rem' }} disabled={isPending}>
                      {isPending ? '採点中...' : '確認テストを提出する'}
                    </button>
                  </div>
                </form>
              ) : (
                // 採点結果画面
                <div style={{ textAlign: 'center', padding: '3rem 2rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
                    {quizResult.isPassed ? '🎉' : '😢'}
                  </div>
                  <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: quizResult.isPassed ? '#34d399' : '#f87171', marginBottom: '0.5rem' }}>
                    {quizResult.isPassed ? '確認テスト合格！' : '不合格です'}
                  </h3>
                  <p style={{ color: '#a1a1aa', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                    得点: <strong style={{ fontSize: '1.5rem', color: '#ffffff' }}>{quizResult.scorePercent}点</strong> （合格基準: 80点以上）
                  </p>
                  
                  <div style={{ maxWidth: '400px', margin: '0 auto 2.5rem auto', textAlign: 'left', background: 'rgba(0, 0, 0, 0.15)', borderRadius: '8px', padding: '1rem' }}>
                    <h4 style={{ fontSize: '0.9rem', color: '#e4e4e7', marginBottom: '0.75rem', fontWeight: '700' }}>採点結果詳細:</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {(lesson.quiz_questions || []).map((q, idx) => (
                        <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: '#a1a1aa' }}>問 {idx + 1}</span>
                          <span style={{ fontWeight: '700', color: quizResult.results[q.id] ? '#34d399' : '#f87171' }}>
                            {quizResult.results[q.id] ? '○ 正解' : '× 不正解'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!quizResult.isPassed ? (
                    <button onClick={handleRetakeQuiz} className={`${styles.btn} ${styles.btnPrimary}`} style={{ padding: '0.6rem 2rem' }}>
                      もう一度挑戦する
                    </button>
                  ) : (
                    <div style={{ color: '#34d399', fontWeight: '600' }}>
                      合格しました！次のレッスンへ進むことができます。
                    </div>
                  )}
                </div>
              )}
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
