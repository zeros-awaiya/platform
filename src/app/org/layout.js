import OrgSidebar from './OrgSidebar'
import styles from './org.module.css'
import { requireRole } from '@/utils/auth/guard'

export const metadata = {
  title: 'あわい屋ZEROS - 組織管理',
  description: '組織向けロードマップ型学習プラットフォーム 組織管理者ダッシュボード',
}

export default async function OrgLayout({ children }) {
  // 組織管理は ORG_ADMIN（本部 SYSTEM_ADMIN も閲覧可）。それ以外はリダイレクト
  await requireRole(['ORG_ADMIN', 'SYSTEM_ADMIN'])

  return (
    <div className={styles.layout}>
      {/* Responsive Sidebar & Mobile Navigation */}
      <OrgSidebar />

      {/* Main Content Pane */}
      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <h1>組織管理コントロールパネル</h1>
          </div>
          <div>
            <span>組織管理者</span>
          </div>
        </header>

        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  )
}
