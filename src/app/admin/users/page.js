import { createClient } from '@/utils/supabase/server'
import AdminUsersClientPage from './AdminUsersClientPage'

export const metadata = {
  title: 'ユーザー管理 | あわい屋ZEROS 本部管理',
  description: 'システム内の全ユーザーアカウントの管理を行います。'
}

export default async function AdminUsersPage() {
  const supabase = await createClient()

  // 全ユーザーのフェッチ
  const { data: users } = await supabase
    .from('users')
    .select('*, user_learning_paths(learning_path_id)')
    .order('created_at', { ascending: false })

  // 選択肢用の全組織のフェッチ
  const { data: organizations } = await supabase
    .from('organizations')
    .select('*')

  // 選択肢用の全部署のフェッチ
  const { data: departments } = await supabase
    .from('departments')
    .select('*')

  // 選択肢用の全アクティブロードマップのフェッチ
  const { data: roadmaps } = await supabase
    .from('learning_paths')
    .select('id, name, organization_id')
    .eq('is_active', true)
    .order('name', { ascending: true })

  return (
    <AdminUsersClientPage
      initialUsers={users || []}
      organizations={organizations || []}
      departments={departments || []}
      roadmaps={roadmaps || []}
    />
  )
}
