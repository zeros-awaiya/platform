import { createClient } from '@/utils/supabase/server'
import AuditExportClientPage from './AuditExportClientPage'

export const metadata = {
  title: '監査PDF出力 | あわい屋ZEROS 本部管理',
  description: '組織ごとの研修実施記録（必須研修・受講状況・テスト結果）を監査用にPDF出力します。',
}

export default async function AuditExportPage() {
  const supabase = await createClient()

  const { data: organizations, error } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('status', 'active')
    .order('name', { ascending: true })

  // 取得失敗を「組織なし」と誤認させない（監査導線のため明示エラー）
  if (error) {
    console.error('Failed to load organizations for audit export:', error)
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#fca5a5' }}>
        組織一覧の取得に失敗しました: {error.message}
      </div>
    )
  }

  return <AuditExportClientPage organizations={organizations || []} />
}
