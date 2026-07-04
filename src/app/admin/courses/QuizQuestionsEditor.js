'use client'

import styles from '../admin.module.css'

// クイズ設問エディタ。レッスン追加/編集モーダル共通（radio の name 接頭辞だけが異なる）。
export default function QuizQuestionsEditor({ questions, onAdd, onUpdate, onRemove, radioNamePrefix }) {
  return (
    <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ffffff' }}>クイズ問題設定（合格ライン: 80%以上正答）</h4>
        <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={onAdd}>
          ＋ 問題を追加
        </button>
      </div>

      {questions.length === 0 ? (
        <p style={{ color: '#71717a', fontSize: '0.85rem', textAlign: 'center', padding: '2rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px dashed rgba(255, 255, 255, 0.08)', borderRadius: '8px' }}>
          問題が追加されていません。右上の「問題を追加」から設問を設定してください。
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '0.5rem' }}>
          {questions.map((q, qIdx) => (
            <div key={qIdx} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '1rem', position: 'relative' }}>
              <button
                type="button"
                onClick={() => onRemove(qIdx)}
                style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                削除
              </button>
              <div className={styles.formGroup} style={{ marginBottom: '0.75rem' }}>
                <label className={styles.label} style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>設問 {qIdx + 1}</label>
                <input
                  type="text"
                  value={q.question}
                  onChange={(e) => onUpdate(qIdx, 'question', e.target.value)}
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
                  onChange={(e) => onUpdate(qIdx, 'option_a', e.target.value)}
                  className={styles.input}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                  placeholder="選択肢 A"
                  required
                />
                <input
                  type="text"
                  value={q.option_b}
                  onChange={(e) => onUpdate(qIdx, 'option_b', e.target.value)}
                  className={styles.input}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                  placeholder="選択肢 B"
                  required
                />
                <input
                  type="text"
                  value={q.option_c}
                  onChange={(e) => onUpdate(qIdx, 'option_c', e.target.value)}
                  className={styles.input}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                  placeholder="選択肢 C"
                  required
                />
                <input
                  type="text"
                  value={q.option_d}
                  onChange={(e) => onUpdate(qIdx, 'option_d', e.target.value)}
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
                      name={`${radioNamePrefix}_${qIdx}`}
                      value={opt}
                      checked={q.correct_option === opt}
                      onChange={() => onUpdate(qIdx, 'correct_option', opt)}
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
  )
}
