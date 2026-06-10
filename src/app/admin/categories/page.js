import { createClient } from '@/utils/supabase/server'
import CategoriesClientPage from './CategoriesClientPage'

export const metadata = {
  title: 'カテゴリ管理 | あわい屋ZEROS 本部管理',
  description: '学習コースを分類するためのカテゴリ一覧を管理します。'
}

export default async function AdminCategoriesPage() {
  const supabase = await createClient()

  // 全カテゴリをソート順で取得
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })

  return (
    <CategoriesClientPage
      initialCategories={categories || []}
    />
  )
}
