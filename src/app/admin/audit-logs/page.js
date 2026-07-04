import { createClient } from '@/utils/supabase/server'
import styles from '../admin.module.css'
import { formatDateTime } from '@/utils/format'

export const metadata = {
  title: '監査ログ | あわい屋ZEROS 本部管理',
  description: 'システム内で行われた重要な操作履歴を確認します。'
}

export default async function AdminAuditLogsPage() {
  const supabase = await createClient()

  // 監査ログを最新順にフェッチ
  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      {/* ヘッダー */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.25rem' }}>システム監査ログ</h2>
        <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>プラットフォーム全体の登録・変更・削除など、管理者やシステムの操作履歴（証跡）を表示します。</p>
      </div>

      {/* ログテーブル */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th} style={{ width: '180px' }}>日時</th>
              <th className={styles.th} style={{ width: '150px' }}>操作ユーザー</th>
              <th className={styles.th} style={{ width: '120px' }}>アクション</th>
              <th className={styles.th}>操作詳細</th>
              <th className={styles.th} style={{ width: '120px', textAlign: 'right' }}>IPアドレス</th>
            </tr>
          </thead>
          <tbody>
            {!logs || logs.length === 0 ? (
              <tr>
                <td colSpan="5" className={styles.td} style={{ textAlign: 'center', color: '#71717a', padding: '3rem' }}>
                  記録されている監査ログはありません。
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className={styles.tr}>
                  <td className={styles.td} style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className={styles.td} style={{ fontWeight: '600', color: '#ffffff' }}>
                    {log.user_name || 'システム自動'}
                  </td>
                  <td className={styles.td}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      background: log.action === '組織登録' ? 'rgba(16, 185, 129, 0.15)' : log.action === 'メンバー招待' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: log.action === '組織登録' ? '#34d399' : log.action === 'メンバー招待' ? '#818cf8' : '#fbbf24',
                      border: log.action === '組織登録' ? '1px solid rgba(16, 185, 129, 0.3)' : log.action === 'メンバー招待' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td className={styles.td} style={{ fontSize: '0.9rem', color: '#e4e4e7' }}>
                    {log.details}
                  </td>
                  <td className={styles.td} style={{ fontSize: '0.85rem', color: '#71717a', textAlign: 'right', fontFamily: 'monospace' }}>
                    {log.ip_address || '-'}
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
