import { createClient } from '@/utils/supabase/server'
import styles from './admin.module.css'

export default async function AdminDashboard() {
  const supabase = await createClient()

  let orgCount = 0
  let userCount = 0
  let courseCount = 0
  let pathCount = 0

  try {
    const { count: orgs } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
    orgCount = orgs || 0

    const { count: users } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    userCount = users || 0

    const { count: courses } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })
    courseCount = courses || 0

    const { count: paths } = await supabase
      .from('learning_paths')
      .select('*', { count: 'exact', head: true })
    pathCount = paths || 0
  } catch (error) {
    console.error('Failed to fetch admin stats:', error)
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: '#ffffff' }}>システム全体サマリー</h2>
        <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>プラットフォーム全体の利用指標を表示しています。</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <span className={styles.cardTitle}>総組織（テナント）数</span>
          <span className={styles.cardValue}>{orgCount}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardTitle}>総ユーザー数</span>
          <span className={styles.cardValue}>{userCount}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardTitle}>作成済みコース数</span>
          <span className={styles.cardValue}>{courseCount}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardTitle}>ロードマップ数</span>
          <span className={styles.cardValue}>{pathCount}</span>
        </div>
      </div>
    </div>
  )
}
