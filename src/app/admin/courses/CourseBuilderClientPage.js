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
import LessonFormModal from './LessonFormModal'
import LessonListSection from './LessonListSection'

export default function CourseBuilderClientPage({ initialCourses, categories }) {
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

    startTransition(async () => {
      const res = await createCourse(title, categoryId, description, thumbnailUrl)
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

    startTransition(async () => {
      const res = await updateCourse(selectedCourse.id, title, categoryId, description, thumbnailUrl, isActive)
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
              <LessonListSection
                lessons={selectedCourse.lessons}
                isPending={isPending}
                onAddClick={() => { setErrorMsg(''); setQuizQuestions([]); setActiveContentType('video'); setIsAddLessonOpen(true); }}
                onMoveLesson={handleMoveLesson}
                onEditLesson={(lesson) => { setErrorMsg(''); setQuizQuestions(lesson.quiz_questions || []); setActiveContentType(lesson.content_type); setEditLessonItem(lesson); }}
                onDeleteLesson={handleDeleteLesson}
              />
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
        <LessonFormModal
          mode="add"
          lesson={null}
          activeContentType={activeContentType}
          onContentTypeChange={setActiveContentType}
          quizEditorProps={{
            questions: quizQuestions,
            onAdd: handleAddQuizQuestion,
            onUpdate: handleUpdateQuizQuestion,
            onRemove: handleRemoveQuizQuestion,
            radioNamePrefix: 'new_correct',
          }}
          errorMsg={errorMsg}
          isPending={isPending}
          onSubmit={handleAddLessonSubmit}
          onClose={() => setIsAddLessonOpen(false)}
        />
      )}

      {/* EDIT LESSON MODAL */}
      {editLessonItem && (
        <LessonFormModal
          mode="edit"
          lesson={editLessonItem}
          activeContentType={activeContentType}
          onContentTypeChange={setActiveContentType}
          quizEditorProps={{
            questions: quizQuestions,
            onAdd: handleAddQuizQuestion,
            onUpdate: handleUpdateQuizQuestion,
            onRemove: handleRemoveQuizQuestion,
            radioNamePrefix: 'edit_correct',
          }}
          errorMsg={errorMsg}
          isPending={isPending}
          onSubmit={handleUpdateLessonSubmit}
          onClose={() => setEditLessonItem(null)}
        />
      )}
    </div>
  )
}
