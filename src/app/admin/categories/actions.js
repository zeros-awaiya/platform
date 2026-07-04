'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertRole } from '@/utils/auth/guard'
import { ROLES } from '@/lib/constants'

export async function createCategory(prevState, formData) {
  const auth = await assertRole([ROLES.SYSTEM_ADMIN])
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  const name = formData.get('name')
  const description = formData.get('description')
  const sortOrderStr = formData.get('sortOrder')

  if (!name) {
    return { error: 'カテゴリ名は必須項目です。' }
  }

  const sortOrder = sortOrderStr ? parseInt(sortOrderStr, 10) : 0

  const { error } = await supabase
    .from('categories')
    .insert([{
      name,
      description: description || null,
      sort_order: sortOrder
    }])

  if (error) {
    return { error: `登録に失敗しました: ${error.message}` }
  }

  revalidatePath('/admin/categories')
  return { success: true }
}

export async function deleteCategory(id) {
  const auth = await assertRole([ROLES.SYSTEM_ADMIN])
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  // 紐づくコースがあるか確認
  const { data: courses } = await supabase
    .from('courses')
    .select('id')
    .eq('category_id', id)

  if (courses && courses.length > 0) {
    return { error: 'このカテゴリにはまだコースが紐付いているため、削除できません。先にコースのカテゴリを変更するか削除してください。' }
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: `削除に失敗しました: ${error.message}` }
  }

  revalidatePath('/admin/categories')
  return { success: true }
}
