'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { getAdminClient, provisionUser } from '@/utils/supabase/admin'
import { assertRole } from '@/utils/auth/guard'
import { ROLES } from '@/lib/constants'

export async function inviteUser(email, name, role, departmentId, position) {
  try {
    const supabase = await createClient()

    const auth = await assertRole([ROLES.ORG_ADMIN])
    if (!auth.ok) return { error: auth.error }
    const orgId = auth.profile.organization_id

    const result = await provisionUser({
      supabase,
      adminClient: getAdminClient(supabase),
      profile: {
        name,
        email: email?.trim(),
        organization_id: orgId,
        department_id: departmentId || null,
        role: role || ROLES.LEARNER,
        position,
      },
    })

    if (!result.ok) {
      return { error: result.profileError ? `プロフィール作成に失敗しました: ${result.error}` : `アカウント認証情報の作成に失敗しました: ${result.error}` }
    }

    revalidatePath('/org/users')
    return { success: true, tempPassword: result.tempPassword }
  } catch (err) {
    return { error: err.message }
  }
}

export async function toggleUserActive(targetUserId, isActive) {
  try {
    const supabase = await createClient()

    const auth = await assertRole([ROLES.ORG_ADMIN])
    if (!auth.ok) return { error: auth.error }

    // 対象ユーザーが自組織に属するか検証
    const { data: targetUser } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', targetUserId)
      .single()

    if (!targetUser || targetUser.organization_id !== auth.profile.organization_id) {
      return { error: '対象のユーザーが自組織に見つかりません。' }
    }

    const { error } = await supabase
      .from('users')
      .update({ is_active: isActive })
      .eq('id', targetUserId)

    if (error) {
      return { error: `更新に失敗しました: ${error.message}` }
    }

    revalidatePath('/org/users')
    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
}

export async function importUsersFromCSV(usersList) {
  try {
    const supabase = await createClient()

    const auth = await assertRole([ROLES.ORG_ADMIN])
    if (!auth.ok) return { error: auth.error }
    const orgId = auth.profile.organization_id

    // CSV から部署名を抽出
    const deptNames = [...new Set(usersList.map(u => u.departmentName).filter(Boolean))]

    const { data: existingDepts } = await supabase
      .from('departments')
      .select('id, name')
      .eq('organization_id', orgId)

    const deptMap = {}
    if (existingDepts) {
      existingDepts.forEach(d => {
        deptMap[d.name] = d.id
      })
    }

    // 不足している部署を自動作成
    for (const dName of deptNames) {
      if (!deptMap[dName]) {
        const { data: newDept, error: deptErr } = await supabase
          .from('departments')
          .insert({ organization_id: orgId, name: dName })
          .select('id')
          .single()

        if (deptErr) {
          return { error: `部署「${dName}」の自動登録に失敗しました: ${deptErr.message}` }
        }
        deptMap[dName] = newDept.id
      }
    }

    // ユーザーを一括プロビジョニング
    const adminClient = getAdminClient(supabase)
    const importedUsers = []
    const failedUsers = []

    for (const u of usersList) {
      const { name, email, departmentName, position } = u
      const departmentId = departmentName ? deptMap[departmentName] : null

      const result = await provisionUser({
        supabase,
        adminClient,
        profile: {
          name,
          email: email?.trim(),
          organization_id: orgId,
          department_id: departmentId,
          role: 'LEARNER',
          position,
        },
      })

      if (!result.ok) {
        failedUsers.push({ email, name, error: result.error })
      } else {
        importedUsers.push({ email, name, tempPassword: result.tempPassword })
      }
    }

    revalidatePath('/org/users')
    return {
      success: true,
      importedCount: importedUsers.length,
      failedCount: failedUsers.length,
      importedUsers,
      failedUsers,
    }
  } catch (err) {
    return { error: err.message }
  }
}
