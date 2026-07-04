'use client'

import styles from '../admin.module.css'
import { CONTENT_TYPE_OPTIONS } from '@/lib/constants'
import QuizQuestionsEditor from './QuizQuestionsEditor'

// レッスン追加/編集モーダル（旧: CourseBuilderClientPage 内の2つのほぼ同一モーダル）。
// mode: 'add' | 'edit'。edit のときのみ lesson を受け取り既定値に使う。
// name/id 属性は旧実装と同一（add=lesson-*, edit=edit-lesson-*）。変更すると保存が壊れる。
export default function LessonFormModal({
  mode,
  lesson,
  activeContentType,
  onContentTypeChange,
  quizEditorProps,
  errorMsg,
  isPending,
  onSubmit,
  onClose,
}) {
  const isEdit = mode === 'edit'
  const idPrefix = isEdit ? 'edit-lesson' : 'lesson'

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} style={{ maxWidth: activeContentType === 'quiz' ? '800px' : '600px' }}>
        <div className={styles.modalHeader}>{isEdit ? 'レッスンを編集' : 'レッスンを追加'}</div>
        <form onSubmit={onSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={`${idPrefix}-title`}>レッスン名（教材タイトル）</label>
            <input
              id={`${idPrefix}-title`}
              name="title"
              type="text"
              defaultValue={isEdit ? lesson.title : undefined}
              className={styles.input}
              placeholder={isEdit ? undefined : '例: ChatGPTに指示を与える「プロンプト」の基本'}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor={`${idPrefix}-type`}>教材形式</label>
              <select
                id={`${idPrefix}-type`}
                name="content_type"
                className={styles.select}
                value={activeContentType}
                onChange={(e) => onContentTypeChange(e.target.value)}
                required
              >
                {CONTENT_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor={`${idPrefix}-time`}>目安学習時間 (分)</label>
              <input
                id={`${idPrefix}-time`}
                name="estimated_minutes"
                type="number"
                min="1"
                defaultValue={isEdit ? lesson.estimated_minutes : '10'}
                className={styles.input}
                required
              />
            </div>
          </div>

          {activeContentType !== 'quiz' && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor={`${idPrefix}-url`}>教材のURL / 共有リンク</label>
                <input
                  id={`${idPrefix}-url`}
                  name="url"
                  type="text"
                  defaultValue={isEdit ? (lesson.url || '') : undefined}
                  className={styles.input}
                  placeholder={isEdit ? undefined : '例: https://www.youtube.com/watch?v=... もしくは Google Drive 共有リンク'}
                />
                {!isEdit && (
                  <span style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.25rem' }}>※動画、PDF、ドキュメントの共有リンクを入力してください（解説記事の場合は不要です）。</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor={`${idPrefix}-slide-pdf`}>スライドPDF URL</label>
                <input
                  id={`${idPrefix}-slide-pdf`}
                  name="slide_pdf_url"
                  type="text"
                  defaultValue={isEdit ? (lesson.slide_pdf_url || '') : undefined}
                  className={styles.input}
                  placeholder="例: https://example.com/slide.pdf"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor={`${idPrefix}-worksheet-word`}>ワークシートWord URL</label>
                <input
                  id={`${idPrefix}-worksheet-word`}
                  name="worksheet_word_url"
                  type="text"
                  defaultValue={isEdit ? (lesson.worksheet_word_url || '') : undefined}
                  className={styles.input}
                  placeholder="例: https://example.com/worksheet.docx"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor={`${idPrefix}-article`}>システム内解説記事本文（Markdown対応・オプション）</label>
                <textarea
                  id={`${idPrefix}-article`}
                  name="article_content"
                  rows="6"
                  defaultValue={isEdit ? (lesson.article_content || '') : undefined}
                  className={styles.textarea}
                  placeholder={isEdit ? undefined : '記事教材の場合は、ここにMarkdown形式でテキストを入力してください。'}
                ></textarea>
              </div>
            </>
          )}

          {activeContentType === 'quiz' && (
            <QuizQuestionsEditor {...quizEditorProps} />
          )}

          {errorMsg && (
            <div className={styles.errorAlert} style={{ marginBottom: '1.25rem' }}>
              <span>{errorMsg}</span>
            </div>
          )}

          <div className={styles.modalActions}>
            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose} disabled={isPending}>
              キャンセル
            </button>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={isPending}>
              {isEdit ? (isPending ? '保存中...' : '変更を保存') : (isPending ? '追加中...' : 'レッスンを追加')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
