'use client'

import { useState, useTransition } from 'react'
import { 
  createCourse, 
  updateCourse, 
  deleteCourse,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  saveQuizQuestions
} from './actions'
import styles from '../admin.module.css'

export default function CourseBuilderClientPage({ initialCourses, categories }) {
  const [courses, setCourses] = useState(initialCourses)
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourses[0]?.id || null)
  const [searchQuery, setSearchQuery] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  // Modal / Form Open States
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false)
  const [isAddLessonOpen, setIsAddLessonOpen] = useState(false)
  const [editLessonItem, setEditLessonItem] = useState(null)
  const [quizQuestions, setQuizQuestions] = useState([])
  const [activeContentType, setActiveContentType] = useState('video')

  const handleAddQuizQuestion = () => {
    setQuizQuestions([
      ...quizQuestions,
      {
        id: null,
        question: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_option: 'A'
      }
    ])
  }

  const handleUpdateQuizQuestion = (index, field, value) => {
    const updated = [...quizQuestions]
    updated[index] = {
      ...updated[index],
      [field]: value
    }
    setQuizQuestions(updated)
  }

  const handleRemoveQuizQuestion = (index) => {
    setQuizQuestions(quizQuestions.filter((_, idx) => idx !== index))
  }

  // Find currently selected course
  const selectedCourse = initialCourses.find(c => c.id === selectedCourseId)

  // Filter courses based on search & category filter
  const filteredCourses = initialCourses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (c.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCat = catFilter === '' || c.category_id === catFilter
    return matchesSearch && matchesCat
  })

  // Handlers for Course Management
  const handleCreateCourseSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    const formData = new FormData(e.target)
    const title = formData.get('title')
    const categoryId = formData.get('category_id')
    const description = formData.get('description')
    const thumbnailUrl = formData.get('thumbnail_url')
    const slidePdfUrl = formData.get('slide_pdf_url')
    const worksheetWordUrl = formData.get('worksheet_word_url')

    startTransition(async () => {
      const res = await createCourse(title, categoryId, description, thumbnailUrl, slidePdfUrl, worksheetWordUrl)
      if (res?.error) {
        setErrorMsg(res.error)
      } else {
        setIsCreateCourseOpen(false)
        setSelectedCourseId(res.course.id)
        e.target.reset()
      }
    })
  }

  const handleUpdateCourseSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    const formData = new FormData(e.target)
    const title = formData.get('title')
    const categoryId = formData.get('category_id')
    const description = formData.get('description')
    const thumbnailUrl = formData.get('thumbnail_url')
    const isActive = formData.get('is_active') === 'true'
    const slidePdfUrl = formData.get('slide_pdf_url')
    const worksheetWordUrl = formData.get('worksheet_word_url')

    startTransition(async () => {
      const res = await updateCourse(selectedCourse.id, title, categoryId, description, thumbnailUrl, isActive, slidePdfUrl, worksheetWordUrl)
      if (res?.error) {
        setErrorMsg(res.error)
      } else {
        alert('コース情報を更新しました。')
      }
    })
  }

  const handleDeleteCourse = async () => {
    if (confirm(`本当にコース「${selectedCourse.title}」を削除しますか？\nコース内のレッスンや受講進捗データもすべて削除されます。`)) {
      startTransition(async () => {
        const res = await deleteCourse(selectedCourse.id)
        if (res?.error) {
          setErrorMsg(res.error)
        } else {
          // Select another course if available
          const remaining = initialCourses.filter(c => c.id !== selectedCourse.id)
          setSelectedCourseId(remaining[0]?.id || null)
        }
      })
    }
  }

  // Handlers for Lesson Management
  const handleAddLessonSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    const formData = new FormData(e.target)
    const title = formData.get('title')
    const contentType = formData.get('content_type')
    const url = formData.get('url')
    const filePath = formData.get('file_path')
    const estimatedMinutes = formData.get('estimated_minutes')
    const articleContent = formData.get('article_content')
    const slidePdfUrl = formData.get('slide_pdf_url')
    const worksheetWordUrl = formData.get('worksheet_word_url')

    startTransition(async () => {
      const res = await createLesson(
        selectedCourse.id, 
        title, 
        contentType, 
        url, 
        filePath, 
        articleContent, 
        estimatedMinutes,
        slidePdfUrl,
        worksheetWordUrl
      )
      if (res?.error) {
        setErrorMsg(res.error)
      } else {
        if (contentType === 'quiz') {
          const quizRes = await saveQuizQuestions(res.lesson.id, quizQuestions)
          if (quizRes?.error) {
            setErrorMsg(quizRes.error)
            return
          }
        }
        setIsAddLessonOpen(false)
        e.target.reset()
      }
    })
  }

  const handleUpdateLessonSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    const formData = new FormData(e.target)
    const title = formData.get('title')
    const contentType = formData.get('content_type')
    const url = formData.get('url')
    const filePath = formData.get('file_path')
    const estimatedMinutes = formData.get('estimated_minutes')
    const articleContent = formData.get('article_content')
    const slidePdfUrl = formData.get('slide_pdf_url')
    const worksheetWordUrl = formData.get('worksheet_word_url')

    startTransition(async () => {
      const res = await updateLesson(
        editLessonItem.id, 
        title, 
        contentType, 
        url, 
        filePath, 
        articleContent, 
        estimatedMinutes,
        slidePdfUrl,
        worksheetWordUrl
      )
      if (res?.error) {
        setErrorMsg(res.error)
      } else {
        if (contentType === 'quiz') {
          const quizRes = await saveQuizQuestions(editLessonItem.id, quizQuestions)
          if (quizRes?.error) {
            setErrorMsg(quizRes.error)
            return
          }
        }
        setEditLessonItem(null)
      }
    })
  }

  const handleDeleteLesson = async (lessonId, lessonTitle) => {
    if (confirm(`本当にレッスン「${lessonTitle}」を削除しますか？`)) {
      startTransition(async () => {
        const res = await deleteLesson(lessonId, selectedCourse.id)
        if (res?.error) {
          setErrorMsg(res.error)
        }
      })
    }
  }

  const handleMoveLesson = async (index, direction) => {
    const lessonList = [...selectedCourse.lessons]
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= lessonList.length) return

    // Swap lessons in local list
    const temp = lessonList[index]
    lessonList[index] = lessonList[targetIndex]
    lessonList[targetIndex] = temp

    const orderedIds = lessonList.map(l => l.id)
    startTransition(async () => {
      const res = await reorderLessons(selectedCourse.id, orderedIds)
      if (res?.error) {
        alert(res.error)
      }
    })
  }

  return (
    <div>
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: '#ffffff' }}>統合コースビルダー</h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>学習教材をカテゴリ分けし、各コースのレッスンマニュアルを構築・並べ替えできます。</p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => { setErrorMsg(''); setIsCreateCourseOpen(true); }}>
          新規コース作成
        </button>
      </div>

      {/* Main Builder Interface */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: COURSE SELECTOR */}
        <div className={styles.card} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '600px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff' }}>コース一覧</h3>

          {/* Search and Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="コース名で検索..."
              className={styles.input}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '0.5rem', fontSize: '0.85rem' }}
            />
            <select
              className={styles.select}
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              style={{ padding: '0.5rem', fontSize: '0.85rem' }}
            >
              <option value="">すべてのカテゴリ</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Course List Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', flex: 1, maxHeight: '500px' }}>
            {filteredCourses.length === 0 ? (
              <span style={{ color: '#71717a', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                該当するコースがありません。
              </span>
            ) : (
              filteredCourses.map((c) => (
                <div
                  key={c.id}
                  onClick={() => { setErrorMsg(''); setSelectedCourseId(c.id); }}
                  style={{
                    background: c.id === selectedCourseId ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    border: c.id === selectedCourseId ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: c.id === selectedCourseId ? '#ffffff' : '#e4e4e7' }}>
                    {c.title}
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#71717a' }}>
                    <span>{c.categories?.name || 'カテゴリなし'}</span>
                    <span style={{ color: c.is_active ? '#4ade80' : '#fca5a5' }}>
                      {c.is_active ? '公開' : '下書き'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: EDITOR & LESSON BUILDER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {selectedCourse ? (
            <>
              {/* SECTION A: COURSE INFO EDIT */}
              <div className={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>コース詳細編集</h3>
                  <button className={`${styles.btn} ${styles.btnDanger}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={handleDeleteCourse} disabled={isPending}>
                    このコースを削除
                  </button>
                </div>

                <form onSubmit={handleUpdateCourseSubmit} key={selectedCourse.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="course-title">コース名</label>
                    <input id="course-title" name="title" type="text" defaultValue={selectedCourse.title} className={styles.input} required />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="course-category">所属カテゴリ</label>
                    <select id="course-category" name="category_id" defaultValue={selectedCourse.category_id || ''} className={styles.select}>
                      <option value="">カテゴリなし</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                    <label className={styles.label} htmlFor="course-desc">コース解説</label>
                    <textarea id="course-desc" name="description" rows="3" defaultValue={selectedCourse.description || ''} className={styles.textarea}></textarea>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="course-thumb">サムネイル画像URL</label>
                    <input id="course-thumb" name="thumbnail_url" type="text" defaultValue={selectedCourse.thumbnail_url || ''} className={styles.input} placeholder="https://example.com/image.png" />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="course-status">公開状態</label>
                    <select id="course-status" name="is_active" defaultValue={selectedCourse.is_active ? 'true' : 'false'} className={styles.select}>
                      <option value="true">公開 (全テナントへ反映)</option>
                      <option value="false">下書き (非表示)</option>
                    </select>
                  </div>



                  <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={isPending}>
                      {isPending ? '更新中...' : 'コース情報を保存'}
                    </button>
                  </div>
                </form>
              </div>

              {/* SECTION B: LESSON BUILDER (旧モジュール・教材管理の統合) */}
              <div className={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>レッスン（教材構成）</h3>
                    <p style={{ color: '#a1a1aa', fontSize: '0.8rem', marginTop: '0.25rem' }}>このコースを受講するメンバーが学ぶステップ順です。矢印で順番を調整できます。</p>
                  </div>
                  <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ fontSize: '0.85rem' }} onClick={() => { setErrorMsg(''); setQuizQuestions([]); setActiveContentType('video'); setIsAddLessonOpen(true); }}>
                    レッスンを追加
                  </button>
                </div>

                {/* Lesson Table/List */}
                <div className={styles.tableContainer} style={{ marginTop: '0', borderRadius: '12px' }}>
                  <table className={styles.table} style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th className={styles.th} style={{ width: '60px', textAlign: 'center' }}>順序</th>
                        <th className={styles.th}>レッスン名</th>
                        <th className={styles.th}>形式</th>
                        <th className={styles.th}>目安時間</th>
                        <th className={styles.th} style={{ textAlign: 'right' }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!selectedCourse.lessons || selectedCourse.lessons.length === 0) ? (
                        <tr>
                          <td colSpan="5" className={styles.td} style={{ textAlign: 'center', color: '#71717a', padding: '3rem' }}>
                            レッスンが登録されていません。右上の「レッスンを追加」から作成してください。
                          </td>
                        </tr>
                      ) : (
                        selectedCourse.lessons.map((lesson, idx) => (
                          <tr key={lesson.id} className={styles.tr}>
                            <td className={styles.td} style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                                <button 
                                  style={{ background: 'none', border: 'none', color: idx === 0 ? '#3f3f46' : '#a1a1aa', cursor: idx === 0 ? 'not-allowed' : 'pointer' }}
                                  onClick={() => handleMoveLesson(idx, -1)}
                                  disabled={idx === 0 || isPending}
                                >
                                  ▲
                                </button>
                                <button 
                                  style={{ background: 'none', border: 'none', color: idx === selectedCourse.lessons.length - 1 ? '#3f3f46' : '#a1a1aa', cursor: idx === selectedCourse.lessons.length - 1 ? 'not-allowed' : 'pointer' }}
                                  onClick={() => handleMoveLesson(idx, 1)}
                                  disabled={idx === selectedCourse.lessons.length - 1 || isPending}
                                >
                                  ▼
                                </button>
                              </div>
                            </td>
                            <td className={styles.td} style={{ fontWeight: '600', color: '#ffffff' }}>
                              {lesson.title}
                            </td>
                            <td className={styles.td}>
                              <span style={{
                                fontSize: '0.75rem',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#d4d4d8'
                              }}>
                                {lesson.content_type.toUpperCase()}
                              </span>
                            </td>
                            <td className={styles.td}>
                              {lesson.estimated_minutes} 分
                            </td>
                            <td className={styles.td} style={{ textAlign: 'right' }}>
                              <div className={styles.actionCell} style={{ justifyContent: 'flex-end' }}>
                                <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => { setErrorMsg(''); setQuizQuestions(lesson.quiz_questions || []); setActiveContentType(lesson.content_type); setEditLessonItem(lesson); }}>
                                  編集
                                </button>
                                <button className={`${styles.btn} ${styles.btnDanger}`} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => handleDeleteLesson(lesson.id, lesson.title)}>
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
              </div>
            </>
          ) : (
            <div className={styles.card} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: '#71717a' }}>
              <span>コースを選択するか、新規作成してください。</span>
            </div>
          )}

        </div>

      </div>

      {/* CREATE COURSE MODAL */}
      {isCreateCourseOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '550px' }}>
            <div className={styles.modalHeader}>新規学習コースを作成</div>
            <form onSubmit={handleCreateCourseSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="new-course-title">コース名</label>
                <input id="new-course-title" name="title" type="text" className={styles.input} placeholder="例: ChatGPT業務活用基礎" required />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="new-course-category">所属カテゴリ</label>
                <select id="new-course-category" name="category_id" className={styles.select}>
                  <option value="">カテゴリなし</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="new-course-desc">コース解説</label>
                <textarea id="new-course-desc" name="description" rows="3" placeholder="このコースで学べる内容の概要" className={styles.textarea}></textarea>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="new-course-thumb">サムネイル画像URL</label>
                <input id="new-course-thumb" name="thumbnail_url" type="text" className={styles.input} placeholder="https://example.com/thumb.jpg" />
              </div>



              {errorMsg && (
                <div className={styles.errorAlert} style={{ marginBottom: '1.25rem' }}>
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className={styles.modalActions}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setIsCreateCourseOpen(false)} disabled={isPending}>
                  キャンセル
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={isPending}>
                  {isPending ? '作成中...' : 'コースを作成'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD LESSON MODAL */}
      {isAddLessonOpen && selectedCourse && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: activeContentType === 'quiz' ? '800px' : '600px' }}>
            <div className={styles.modalHeader}>レッスンを追加</div>
            <form onSubmit={handleAddLessonSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="lesson-title">レッスン名（教材タイトル）</label>
                <input id="lesson-title" name="title" type="text" className={styles.input} placeholder="例: ChatGPTに指示を与える「プロンプト」の基本" required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="lesson-type">教材形式</label>
                  <select
                    id="lesson-type"
                    name="content_type"
                    className={styles.select}
                    value={activeContentType}
                    onChange={(e) => setActiveContentType(e.target.value)}
                    required
                  >
                    <option value="video">YouTube動画 (埋め込み)</option>
                    <option value="article">システム内解説記事 (Markdown)</option>
                    <option value="url">外部リンク (Web記事・リソース)</option>
                    <option value="pdf">PDFドキュメント (外部リンク)</option>
                    <option value="word">Wordファイル (外部リンク)</option>
                    <option value="powerpoint">PowerPoint (外部リンク)</option>
                    <option value="quiz">確認テスト (QUIZ)</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="lesson-time">目安学習時間 (分)</label>
                  <input id="lesson-time" name="estimated_minutes" type="number" min="1" defaultValue="10" className={styles.input} required />
                </div>
              </div>

              {activeContentType !== 'quiz' && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="lesson-url">教材のURL / 共有リンク</label>
                    <input id="lesson-url" name="url" type="text" className={styles.input} placeholder="例: https://www.youtube.com/watch?v=... もしくは Google Drive 共有リンク" />
                    <span style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.25rem' }}>※動画、PDF、ドキュメントの共有リンクを入力してください（解説記事の場合は不要です）。</span>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="lesson-slide-pdf">スライドPDF URL</label>
                    <input id="lesson-slide-pdf" name="slide_pdf_url" type="text" className={styles.input} placeholder="例: https://example.com/slide.pdf" />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="lesson-worksheet-word">ワークシートWord URL</label>
                    <input id="lesson-worksheet-word" name="worksheet_word_url" type="text" className={styles.input} placeholder="例: https://example.com/worksheet.docx" />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="lesson-article">システム内解説記事本文（Markdown対応・オプション）</label>
                    <textarea id="lesson-article" name="article_content" rows="6" className={styles.textarea} placeholder="記事教材の場合は、ここにMarkdown形式でテキストを入力してください。"></textarea>
                  </div>
                </>
              )}

              {activeContentType === 'quiz' && (
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ffffff' }}>クイズ問題設定（合格ライン: 80%以上正答）</h4>
                    <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={handleAddQuizQuestion}>
                      ＋ 問題を追加
                    </button>
                  </div>

                  {quizQuestions.length === 0 ? (
                    <p style={{ color: '#71717a', fontSize: '0.85rem', textAlign: 'center', padding: '2rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px dashed rgba(255, 255, 255, 0.08)', borderRadius: '8px' }}>
                      問題が追加されていません。右上の「問題を追加」から設問を設定してください。
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                      {quizQuestions.map((q, qIdx) => (
                        <div key={qIdx} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '1rem', position: 'relative' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuizQuestion(qIdx)}
                            style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            削除
                          </button>
                          <div className={styles.formGroup} style={{ marginBottom: '0.75rem' }}>
                            <label className={styles.label} style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>設問 {qIdx + 1}</label>
                            <input
                              type="text"
                              value={q.question}
                              onChange={(e) => handleUpdateQuizQuestion(qIdx, 'question', e.target.value)}
                              className={styles.input}
                              style={{ fontSize: '0.85rem' }}
                              placeholder="例: この研修で最も重要とされる行動は何ですか？"
                              required
                            />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <input
                              type="text"
                              value={q.option_a}
                              onChange={(e) => handleUpdateQuizQuestion(qIdx, 'option_a', e.target.value)}
                              className={styles.input}
                              style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                              placeholder="選択肢 A"
                              required
                            />
                            <input
                              type="text"
                              value={q.option_b}
                              onChange={(e) => handleUpdateQuizQuestion(qIdx, 'option_b', e.target.value)}
                              className={styles.input}
                              style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                              placeholder="選択肢 B"
                              required
                            />
                            <input
                              type="text"
                              value={q.option_c}
                              onChange={(e) => handleUpdateQuizQuestion(qIdx, 'option_c', e.target.value)}
                              className={styles.input}
                              style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                              placeholder="選択肢 C"
                              required
                            />
                            <input
                              type="text"
                              value={q.option_d}
                              onChange={(e) => handleUpdateQuizQuestion(qIdx, 'option_d', e.target.value)}
                              className={styles.input}
                              style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                              placeholder="選択肢 D"
                              required
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem' }}>
                            <span style={{ color: '#a1a1aa' }}>正解の選択肢:</span>
                            {['A', 'B', 'C', 'D'].map(opt => (
                              <label key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', color: '#ffffff' }}>
                                <input
                                  type="radio"
                                  name={`new_correct_${qIdx}`}
                                  value={opt}
                                  checked={q.correct_option === opt}
                                  onChange={() => handleUpdateQuizQuestion(qIdx, 'correct_option', opt)}
                                  style={{ cursor: 'pointer' }}
                                />
                                {opt}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {errorMsg && (
                <div className={styles.errorAlert} style={{ marginBottom: '1.25rem' }}>
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className={styles.modalActions}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setIsAddLessonOpen(false)} disabled={isPending}>
                  キャンセル
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={isPending}>
                  {isPending ? '追加中...' : 'レッスンを追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT LESSON MODAL */}
      {editLessonItem && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: activeContentType === 'quiz' ? '800px' : '600px' }}>
            <div className={styles.modalHeader}>レッスンを編集</div>
            <form onSubmit={handleUpdateLessonSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="edit-lesson-title">レッスン名（教材タイトル）</label>
                <input id="edit-lesson-title" name="title" type="text" defaultValue={editLessonItem.title} className={styles.input} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="edit-lesson-type">教材形式</label>
                  <select
                    id="edit-lesson-type"
                    name="content_type"
                    className={styles.select}
                    value={activeContentType}
                    onChange={(e) => setActiveContentType(e.target.value)}
                    required
                  >
                    <option value="video">YouTube動画 (埋め込み)</option>
                    <option value="article">システム内解説記事 (Markdown)</option>
                    <option value="url">外部リンク (Web記事・リソース)</option>
                    <option value="pdf">PDFドキュメント (外部リンク)</option>
                    <option value="word">Wordファイル (外部リンク)</option>
                    <option value="powerpoint">PowerPoint (外部リンク)</option>
                    <option value="quiz">確認テスト (QUIZ)</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="edit-lesson-time">目安学習時間 (分)</label>
                  <input id="edit-lesson-time" name="estimated_minutes" type="number" min="1" defaultValue={editLessonItem.estimated_minutes} className={styles.input} required />
                </div>
              </div>

              {activeContentType !== 'quiz' && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="edit-lesson-url">教材のURL / 共有リンク</label>
                    <input id="edit-lesson-url" name="url" type="text" defaultValue={editLessonItem.url || ''} className={styles.input} />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="edit-lesson-slide-pdf">スライドPDF URL</label>
                    <input id="edit-lesson-slide-pdf" name="slide_pdf_url" type="text" defaultValue={editLessonItem.slide_pdf_url || ''} className={styles.input} placeholder="例: https://example.com/slide.pdf" />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="edit-lesson-worksheet-word">ワークシートWord URL</label>
                    <input id="edit-lesson-worksheet-word" name="worksheet_word_url" type="text" defaultValue={editLessonItem.worksheet_word_url || ''} className={styles.input} placeholder="例: https://example.com/worksheet.docx" />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="edit-lesson-article">システム内解説記事本文（Markdown対応・オプション）</label>
                    <textarea id="edit-lesson-article" name="article_content" rows="6" defaultValue={editLessonItem.article_content || ''} className={styles.textarea}></textarea>
                  </div>
                </>
              )}

              {activeContentType === 'quiz' && (
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ffffff' }}>クイズ問題設定（合格ライン: 80%以上正答）</h4>
                    <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={handleAddQuizQuestion}>
                      ＋ 問題を追加
                    </button>
                  </div>

                  {quizQuestions.length === 0 ? (
                    <p style={{ color: '#71717a', fontSize: '0.85rem', textAlign: 'center', padding: '2rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px dashed rgba(255, 255, 255, 0.08)', borderRadius: '8px' }}>
                      問題が追加されていません。右上の「問題を追加」から設問を設定してください。
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                      {quizQuestions.map((q, qIdx) => (
                        <div key={qIdx} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '1rem', position: 'relative' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuizQuestion(qIdx)}
                            style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            削除
                          </button>
                          <div className={styles.formGroup} style={{ marginBottom: '0.75rem' }}>
                            <label className={styles.label} style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>設問 {qIdx + 1}</label>
                            <input
                              type="text"
                              value={q.question}
                              onChange={(e) => handleUpdateQuizQuestion(qIdx, 'question', e.target.value)}
                              className={styles.input}
                              style={{ fontSize: '0.85rem' }}
                              placeholder="例: この研修で最も重要とされる行動は何ですか？"
                              required
                            />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <input
                              type="text"
                              value={q.option_a}
                              onChange={(e) => handleUpdateQuizQuestion(qIdx, 'option_a', e.target.value)}
                              className={styles.input}
                              style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                              placeholder="選択肢 A"
                              required
                            />
                            <input
                              type="text"
                              value={q.option_b}
                              onChange={(e) => handleUpdateQuizQuestion(qIdx, 'option_b', e.target.value)}
                              className={styles.input}
                              style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                              placeholder="選択肢 B"
                              required
                            />
                            <input
                              type="text"
                              value={q.option_c}
                              onChange={(e) => handleUpdateQuizQuestion(qIdx, 'option_c', e.target.value)}
                              className={styles.input}
                              style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                              placeholder="選択肢 C"
                              required
                            />
                            <input
                              type="text"
                              value={q.option_d}
                              onChange={(e) => handleUpdateQuizQuestion(qIdx, 'option_d', e.target.value)}
                              className={styles.input}
                              style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                              placeholder="選択肢 D"
                              required
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem' }}>
                            <span style={{ color: '#a1a1aa' }}>正解の選択肢:</span>
                            {['A', 'B', 'C', 'D'].map(opt => (
                              <label key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', color: '#ffffff' }}>
                                <input
                                  type="radio"
                                  name={`edit_correct_${qIdx}`}
                                  value={opt}
                                  checked={q.correct_option === opt}
                                  onChange={() => handleUpdateQuizQuestion(qIdx, 'correct_option', opt)}
                                  style={{ cursor: 'pointer' }}
                                />
                                {opt}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {errorMsg && (
                <div className={styles.errorAlert} style={{ marginBottom: '1.25rem' }}>
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className={styles.modalActions}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setEditLessonItem(null)} disabled={isPending}>
                  キャンセル
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={isPending}>
                  {isPending ? '保存中...' : '変更を保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
