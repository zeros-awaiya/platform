'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from '../dashboard.module.css'

export default function LearnerCoursesClientPage({ initialCourses, categories }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  const filteredCourses = initialCourses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (c.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCat = activeTab === 'all' || c.category_id === activeTab
    return matchesSearch && matchesCat
  })

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: '#ffffff' }}>受講コース一覧</h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>あなたに割り当てられた研修および学習コンテンツの一覧です。</p>
        </div>
        <div>
          <input
            type="text"
            placeholder="コースを検索..."
            className={styles.input}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '260px', padding: '0.6rem 1rem', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('all')}
        >
          すべて
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`${styles.tab} ${activeTab === cat.id ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Courses Grid */}
      <div className={styles.courseGrid}>
        {filteredCourses.length === 0 ? (
          <div style={{ gridColumn: 'span 3', textAlign: 'center', color: '#71717a', padding: '4rem' }}>
            受講可能なコースが見つかりません。
          </div>
        ) : (
          filteredCourses.map((course) => (
            <Link
              key={course.id}
              href={`/dashboard/courses/${course.id}`}
              className={styles.courseCard}
            >
              <span className={styles.categoryTag}>{course.categories?.name || 'その他'}</span>
              <h3 className={styles.courseTitle}>{course.title}</h3>
              <p className={styles.courseDesc}>{course.description || 'このコースには解説がありません。'}</p>

              {/* Progress Tracker */}
              <div className={styles.progressWrapper}>
                <div className={styles.progressLabel}>
                  <span>
                    {course.enrollment_status === 'completed' 
                      ? '✓ 修了' 
                      : course.enrollment_status === 'in_progress' 
                        ? '学習中' 
                        : '未着手'}
                  </span>
                  <span>{course.progress_percent}%</span>
                </div>
                <div className={styles.progressBarContainer}>
                  <div
                    className={styles.progressBar}
                    style={{ width: `${course.progress_percent}%` }}
                  ></div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
