import AdminSidebar from './AdminSidebar'
import styles from './admin.module.css'
import { requireRole } from '@/utils/auth/guard'
import { ROLES } from '@/lib/constants'

export const metadata = {
  title: 'あわい屋ZEROS - 本部管理',
  description: '組織向けロードマップ型学習プラットフォーム 本部管理者ダッシュボード',
}

export default async function AdminLayout({ children }) {
  // 本部管理は SYSTEM_ADMIN のみ。未認証/権限不足はリダイレクト（RLS単層依存を解消）
  await requireRole([ROLES.SYSTEM_ADMIN])

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
