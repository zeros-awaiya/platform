import { createClient } from '@/utils/supabase/server'
import NotificationsClientPage from './NotificationsClientPage'

export const metadata = {
  title: '通知管理 | あわい屋ZEROS 本部管理',
  description: '受講者に向けて、システム全体または各組織ごとにお知らせ・通知を発信します。'
}

export default async function AdminNotificationsPage() {
  const supabase = await createClient()

  // 全通知を取得
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })

  // 選択肢用の全組織を取得
  const { data: organizations } = await supabase
    .from('organizations')
    .select('*')
    .eq('status', 'active')

  return (
    <NotificationsClientPage
      initialNotifications={notifications || []}
      organizations={organizations || []}
    />
  )
}
