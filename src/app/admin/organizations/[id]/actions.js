'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function createDepartment(orgId, name) {
  const supabase = await createClient()

  if (!name) {
    return { error: '部署名を入力してください。' }
  }

  const { error } = await supabase
    .from('departments')
    .insert([{ organization_id: orgId, name }])

  if (error) {
    return { error: `部署作成に失敗しました: ${error.message}` }
  }

  revalidatePath(`/admin/organizations/${orgId}`)
  return { success: true }
}

export async function deleteDepartment(orgId, deptId) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('departments')
    .delete()
    .eq('id', deptId)

  if (error) {
    return { error: `部署削除に失敗しました: ${error.message}` }
  }

  revalidatePath(`/admin/organizations/${orgId}`)
  return { success: true }
}
