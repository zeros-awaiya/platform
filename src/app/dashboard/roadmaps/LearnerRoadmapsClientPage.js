'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from '../dashboard.module.css'

export default function LearnerRoadmapsClientPage({ roadmaps }) {
  const [selectedPathId, setSelectedPathId] = useState(roadmaps[0]?.id || null)

  const selectedPath = roadmaps.find(r => r.id === selectedPathId)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: '#ffffff' }}>学習ロードマップ</h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>組織が推奨するステップに沿って体系的に学習を進めましょう。</p>
        </div>

        {/* Roadmap Selector Dropdown */}
        {roadmaps.length > 1 && (
          <select
            className={styles.select}
            value={selectedPathId}
            onChange={(e) => setSelectedPathId(e.target.value)}
            style={{ width: '260px', padding: '0.6rem 1rem', fontSize: '0.85rem' }}
          >
            {roadmaps.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        )}
      </div>

      {roadmaps.length === 0 ? (
        <div className={styles.card} style={{ textAlign: 'center', padding: '4rem', color: '#71717a' }}>
          あなたに割り当てられた学習ロードマップはありません。
        </div>
      ) : selectedPath ? (
        <div className={styles.roadmapContainer}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ffffff' }}>{selectedPath.name}</h3>
            {selectedPath.description && (
              <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.5rem', maxWidth: '480px', marginInline: 'auto', lineHeight: '1.5' }}>
                {selectedPath.description}
              </p>
            )}
          </div>

          <div className={styles.roadmapPath}>
            {selectedPath.courses.map((course, idx) => {
              const isCompleted = course.roadmap_status === 'completed'
              const isActive = course.roadmap_status === 'active'
              const isLocked = course.roadmap_status === 'locked'

              // Determine connector line status styling
              let lineClass = styles.roadmapLine
              if (isCompleted) {
                const nextStep = selectedPath.courses[idx + 1]
                if (nextStep && nextStep.roadmap_status === 'completed') {
                  lineClass += ` ${styles.roadmapLineCompleted}`
                } else {
                  lineClass += ` ${styles.roadmapLineActive}`
                }
              }

              return (
                <div key={course.id} className={styles.roadmapStep}>
                  
                  {/* Vertical connector line (hide for last item) */}
                  {idx < selectedPath.courses.length - 1 && (
                    <div className={lineClass}></div>
                  )}

                  {/* Circular Status Node */}
                  <div className={`${styles.roadmapNode} ${
                    isCompleted 
                      ? styles.roadmapNodeCompleted 
                      : isActive 
                        ? styles.roadmapNodeActive 
                        : styles.roadmapNodeLocked
                  }`}>
                    {isCompleted ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : isLocked ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    ) : (
                      idx + 1
                    )}
                  </div>

                  {/* Course card linking to details */}
                  <Link
                    href={`/dashboard/courses/${course.id}`}
                    className={`${styles.roadmapCard} ${
                      isActive 
                        ? styles.roadmapCardActive 
                        : isLocked 
                          ? styles.roadmapCardLocked 
                          : ''
                    }`}
                  >
                    <div>
                      <span className={styles.categoryTag} style={{ color: isLocked ? '#52525b' : undefined }}>
                        {course.categories?.name || 'その他'}
                      </span>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: isLocked ? '#71717a' : '#ffffff', marginTop: '0.25rem' }}>
                        {course.title}
                      </h4>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                      {isCompleted ? (
                        <span style={{ color: '#10b981', fontWeight: '600' }}>修了済み</span>
                      ) : isActive ? (
                        <span style={{ color: '#818cf8', fontWeight: '700', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>
                          学習を開始 &rarr;
                        </span>
                      ) : (
                        <span style={{ color: '#52525b' }}>ロック中</span>
                      )}
                    </div>
                  </Link>

                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
