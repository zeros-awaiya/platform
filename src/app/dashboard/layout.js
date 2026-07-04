import LearnerSidebar from './LearnerSidebar'
import styles from './dashboard.module.css'
import { requireRole } from '@/utils/auth/guard'
import { ROLES } from '@/lib/constants'

export const metadata = {
  title: 'あわい屋ZEROS - 学習プラットフォーム',
  description: '組織向けロードマップ型学習プラットフォーム 受講者ダッシュボード',
}

export default async function LearnerLayout({ children }) {
  // 受講者エリア。従来どおり管理者ロールも閲覧可のままとし（ロール制限は変えない）、
  // 他レイアウト同様に「無効化済みアカウントの遮断・孤児セッションのサインアウト」を追加。
  // LEARNER 専用に絞る場合は allowedRoles を [ROLES.LEARNER] に変更する。
  await requireRole([ROLES.LEARNER, ROLES.ORG_ADMIN, ROLES.SYSTEM_ADMIN])

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
