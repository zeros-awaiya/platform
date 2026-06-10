'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createMandatoryCourse(prevState, formData) {
  const supabase = await createClient()

  const courseId = formData.get('courseId')
  const organizationId = formData.get('organizationId')
  const departmentId = formData.get('departmentId')
  const dueDateStr = formData.get('dueDate')

  if (!courseId || !organizationId || !dueDateStr) {
    return { error: 'すべての必須項目を入力してください。' }
  }

  try {
    // 期限をISO日付に変換
    const dueDate = new Date(dueDateStr).toISOString()

    const { error } = await supabase
      .from('mandatory_courses')
      .insert({
        course_id: courseId,
        organization_id: organizationId,
        department_id: (!departmentId || departmentId === 'all') ? null : departmentId,
        due_date: dueDate
      })

    if (error) {
      return { error: error.message || '必須受講の割り当てに失敗しました。' }
    }

    revalidatePath('/admin/mandatory')
    return { success: true }
  } catch (err) {
    return { error: '無効な日付形式です。' }
  }
}

export async function deleteMandatoryCourse(id) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('mandatory_courses')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message || '必須受講の削除に失敗しました。' }
  }

  revalidatePath('/admin/mandatory')
  return { success: true }
}
