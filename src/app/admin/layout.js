import AdminSidebar from './AdminSidebar'
import styles from './admin.module.css'

export const metadata = {
  title: 'あわい屋ZEROS - 本部管理',
  description: '組織向けロードマップ型学習プラットフォーム 本部管理者ダッシュボード',
}

export default function AdminLayout({ children }) {
  return (
    <div className={styles.layout}>
      {/* Responsive Sidebar & Mobile Navigation */}
      <AdminSidebar />

      {/* Main Content Pane */}
      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <h1>本部管理コントロールパネル</h1>
          </div>
          <div>
            <span>システム管理者</span>
          </div>
        </header>

        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  )
}
