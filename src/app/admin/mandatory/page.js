import { createClient } from '@/utils/supabase/server'
import MandatoryClientPage from './MandatoryClientPage'

export const metadata = {
  title: '必須受講管理 | あわい屋ZEROS 本部管理',
  description: '各組織や部署に対する必須受講コースの割り当てを管理します。'
}

export default async function MandatoryPage() {
  const supabase = await createClient()

  // 必須受講設定の全件取得
  const { data: mandatoryCourses } = await supabase
    .from('mandatory_courses')
    .select('*')
    .order('created_at', { ascending: false })

  // 割り当て対象となるアクティブなコース
  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('is_active', true)

  // 割り当て対象となるアクティブな組織
  const { data: organizations } = await supabase
    .from('organizations')
    .select('*')
    .eq('status', 'active')

  // 各組織に紐づく部署一覧
  const { data: departments } = await supabase
    .from('departments')
    .select('*')

  return (
    <MandatoryClientPage
      initialMandatoryCourses={mandatoryCourses || []}
      courses={courses || []}
      organizations={organizations || []}
      departments={departments || []}
    />
  )
}
