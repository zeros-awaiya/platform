import LearnerSidebar from './LearnerSidebar'
import styles from './dashboard.module.css'

export const metadata = {
  title: 'あわい屋ZEROS - 学習プラットフォーム',
  description: '組織向けロードマップ型学習プラットフォーム 受講者ダッシュボード',
}

export default function LearnerLayout({ children }) {
  return (
    <div className={styles.layout}>
      {/* Responsive Sidebar & Mobile Navigation */}
      <LearnerSidebar />

      {/* Main Content Pane */}
      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <h1>受講者ポータル</h1>
          </div>
          <div>
            <span>受講者</span>
          </div>
        </header>

        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  )
}
