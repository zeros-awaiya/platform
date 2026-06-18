import { createClient } from '@/utils/supabase/server'
import AuditExportClientPage from './AuditExportClientPage'

export const metadata = {
  title: '監査PDF出力 | あわい屋ZEROS 本部管理',
  description: '組織ごとの研修実施記録（必須研修・受講状況・テスト結果）を監査用にPDF出力します。',
}

export default async function AuditExportPage() {
  const supabase = await createClient()

  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('status', 'active')
    .order('name', { ascending: true })

  return <AuditExportClientPage organizations={organizations || []} />
}
