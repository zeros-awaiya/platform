'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertRole } from '@/utils/auth/guard'
import { ROLES } from '@/lib/constants'

export async function createNotification(prevState, formData) {
  const auth = await assertRole([ROLES.SYSTEM_ADMIN])
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  const title = formData.get('title')
  const content = formData.get('content')
  const targetType = formData.get('targetType') // 'all' or 'organization'
  const organizationId = formData.get('organizationId')

  if (!title || !content || !targetType) {
    return { error: 'タイトル、本文、対象範囲は必須項目です。' }
  }

  const targetOrgId = targetType === 'organization' ? organizationId : null
  if (targetType === 'organization' && !targetOrgId) {
    return { error: '対象の組織を指定してください。' }
  }

  const { error } = await supabase
    .from('notifications')
    .insert([{
      title,
      content,
      organization_id: targetOrgId
    }])

  if (error) {
    return { error: `通知の送信に失敗しました: ${error.message}` }
  }

  revalidatePath('/admin/notifications')
  return { success: true }
}

export async function deleteNotification(id) {
  const auth = await assertRole([ROLES.SYSTEM_ADMIN])
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: `削除に失敗しました: ${error.message}` }
  }

  revalidatePath('/admin/notifications')
  return { success: true }
}
