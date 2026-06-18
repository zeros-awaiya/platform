'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertRole } from '@/utils/auth/guard'
import { getAdminClient, isMockMode, provisionUser } from '@/utils/supabase/admin'

export async function createUser(prevState, formData) {
  // 呼び出し元が本部管理者か検証（service role を使うため特に厳格に）
  const auth = await assertRole(['SYSTEM_ADMIN'])
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  const name = formData.get('name')
  const email = formData.get('email')
  const organizationId = formData.get('organizationId')
  const departmentId = formData.get('departmentId')
  const role = formData.get('role')
  const position = formData.get('position')

  if (!name || !email || !organizationId) {
    return { error: '氏名、メールアドレス、対象組織は必須です。' }
  }

  try {
    const adminClient = getAdminClient(supabase)

    // 1. public.users でメールアドレスの重複チェック
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      return { error: 'このメールアドレスは既に登録されています。' }
    }

    // 2. public.users に存在しないが auth.users に残っている（ゴーストアカウント）場合のクリーンアップ
    if (!isMockMode()) {
      const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers()
      if (!listError && users) {
        const ghostUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
        if (ghostUser) {
          // 安全のため、本当に public.users に存在しないか再確認してから削除
          const { data: doubleCheckProfile } = await supabase
            .from('users')
            .select('id')
            .eq('id', ghostUser.id)
            .maybeSingle()

          if (!doubleCheckProfile) {
            await adminClient.auth.admin.deleteUser(ghostUser.id)
          }
        }
      }
    }

    // 3. auth 作成 → profile insert（失敗時ロールバック）
    const result = await provisionUser({
      supabase,
      adminClient,
      profile: {
        name,
        email,
        organization_id: organizationId,
        department_id: departmentId === 'none' || !departmentId ? null : departmentId,
        role,
        position,
      },
    })

    if (!result.ok) {
      if (result.authError?.message === 'A user with this email address has already been registered') {
        return { error: 'このメールアドレスは既に登録されています。' }
      }
      return { error: result.profileError ? `ユーザープロファイル登録失敗: ${result.error}` : `認証アカウント作成失敗: ${result.error}` }
    }

    revalidatePath('/admin/users')
    return { success: true, tempPassword: result.tempPassword }
  } catch (err) {
    return { error: err.message }
  }
}

export async function updateUser(userId, fields) {
  const auth = await assertRole(['SYSTEM_ADMIN'])
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  const { name, role, organizationId, departmentId, position } = fields || {}
  if (!name || !organizationId) {
    return { error: '氏名と対象組織は必須です。' }
  }

  // メールアドレスは auth と同期が必要なため本UIでは変更不可（profile 項目のみ更新）
  const { error } = await supabase
    .from('users')
    .update({
      name,
      role: role || 'LEARNER',
      organization_id: organizationId,
      department_id: departmentId === 'none' || !departmentId ? null : departmentId,
      position: position || null,
    })
    .eq('id', userId)

  if (error) {
    return { error: `更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function deleteUser(userId) {
  const auth = await assertRole(['SYSTEM_ADMIN'])
  if (!auth.ok) return { error: auth.error }

  // 自分自身の削除は禁止（ロックアウト防止）
  if (auth.profile?.id === userId) {
    return { error: '自分自身のアカウントは削除できません。' }
  }

  const supabase = await createClient()

  try {
    // 1. public.users から削除（user_learning_paths 等は FK CASCADE 想定）
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (profileError) {
      return { error: `ユーザー削除に失敗しました: ${profileError.message}` }
    }

    // 2. auth ユーザーも削除（本番のみ。mock では auth 概念なし）
    if (!isMockMode()) {
      const adminClient = getAdminClient(supabase)
      await adminClient.auth.admin.deleteUser(userId)
    }

    revalidatePath('/admin/users')
    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
}

export async function toggleUserActive(userId, isActive) {
  const auth = await assertRole(['SYSTEM_ADMIN'])
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  const { error } = await supabase
    .from('users')
    .update({ is_active: isActive })
    .eq('id', userId)

  if (error) {
    return { error: `更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function assignRoadmapsToUser(userId, roadmapIds = []) {
  const auth = await assertRole(['SYSTEM_ADMIN'])
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  // 1. 既存の割り当てを全て削除
  const { error: deleteError } = await supabase
    .from('user_learning_paths')
    .delete()
    .eq('user_id', userId)

  if (deleteError) {
    return { error: `ロードマップ割り当ての更新に失敗しました(削除): ${deleteError.message}` }
  }

  // 2. 新しい割り当てを登録
  if (roadmapIds && roadmapIds.length > 0) {
    const insertData = roadmapIds.map(lpId => ({
      user_id: userId,
      learning_path_id: lpId
    }))

    const { error: insertError } = await supabase
      .from('user_learning_paths')
      .insert(insertData)

    if (insertError) {
      return { error: `ロードマップ割り当ての更新に失敗しました(追加): ${insertError.message}` }
    }
  }

  revalidatePath('/admin/users')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/roadmaps')
  return { success: true }
}
