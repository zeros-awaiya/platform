'use client'

import styles from '../admin.module.css'

// レッスン（教材構成）一覧カード。表示・並べ替え・編集/削除の起点（旧: 本体の SECTION B）。
export default function LessonListSection({ lessons, isPending, onAddClick, onMoveLesson, onEditLesson, onDeleteLesson }) {
  return (
    <div className={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>レッスン（教材構成）</h3>
          <p style={{ color: '#a1a1aa', fontSize: '0.8rem', marginTop: '0.25rem' }}>このコースを受講するメンバーが学ぶステップ順です。矢印で順番を調整できます。</p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ fontSize: '0.85rem' }} onClick={onAddClick}>
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
            {(!lessons || lessons.length === 0) ? (
              <tr>
                <td colSpan="5" className={styles.td} style={{ textAlign: 'center', color: '#71717a', padding: '3rem' }}>
                  レッスンが登録されていません。右上の「レッスンを追加」から作成してください。
                </td>
              </tr>
            ) : (
              lessons.map((lesson, idx) => (
                <tr key={lesson.id} className={styles.tr}>
                  <td className={styles.td} style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                      <button
                        style={{ background: 'none', border: 'none', color: idx === 0 ? '#3f3f46' : '#a1a1aa', cursor: idx === 0 ? 'not-allowed' : 'pointer' }}
                        onClick={() => onMoveLesson(idx, -1)}
                        disabled={idx === 0 || isPending}
                      >
                        ▲
                      </button>
                      <button
                        style={{ background: 'none', border: 'none', color: idx === lessons.length - 1 ? '#3f3f46' : '#a1a1aa', cursor: idx === lessons.length - 1 ? 'not-allowed' : 'pointer' }}
                        onClick={() => onMoveLesson(idx, 1)}
                        disabled={idx === lessons.length - 1 || isPending}
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
                      <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => onEditLesson(lesson)}>
                        編集
                      </button>
                      <button className={`${styles.btn} ${styles.btnDanger}`} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => onDeleteLesson(lesson.id, lesson.title)}>
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
  )
}
