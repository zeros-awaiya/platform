'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function createOrganization(prevState, formData) {
  const supabase = await createClient()
  const name = formData.get('name')
  const status = formData.get('status') || 'active'

  if (!name) {
    return { error: '組織名を入力してください。' }
  }

  const { error } = await supabase
    .from('organizations')
    .insert([{ name, status }])

  if (error) {
    return { error: `作成に失敗しました: ${error.message}` }
  }

  revalidatePath('/admin/organizations')
  return { success: true }
}

export async function updateOrganization(id, name, status) {
  const supabase = await createClient()

  if (!name) {
    return { error: '組織名を入力してください。' }
  }

  const { error } = await supabase
    .from('organizations')
    .update({ name, status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { error: `更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/admin/organizations')
  return { success: true }
}

export async function deleteOrganization(id) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('organizations')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: `削除に失敗しました: ${error.message}` }
  }

  revalidatePath('/admin/organizations')
  return { success: true }
}
