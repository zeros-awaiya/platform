'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createClient as createServiceRoleClient } from '@supabase/supabase-js'

// Helper: Service Role Client (For provisioning users securely on server side)
function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseServiceKey) {
    throw new Error('環境変数 SUPABASE_SERVICE_ROLE_KEY が設定されていません。')
  }
  
  return createServiceRoleClient(supabaseUrl, supabaseServiceKey)
}

export async function inviteUser(email, name, role, departmentId, position) {
  try {
    const supabase = await createClient()

    // 1. Verify that the caller is an ORG_ADMIN
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return { error: '認証セッションがありません。' }

    const { data: profile } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', currentUser.id)
      .single()

    if (!profile || profile.role !== 'ORG_ADMIN') {
      return { error: 'ユーザー招待の権限がありません（組織管理者専用）。' }
    }

    const orgId = profile.organization_id

    // 2. Provision Auth User using Supabase Admin API
    const isMockMode = 
      !process.env.NEXT_PUBLIC_SUPABASE_URL || 
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project') ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'your-supabase-anon-key'
    const adminClient = isMockMode ? supabase : getServiceRoleClient()
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!' // Secure temporary password

    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name, organization_id: orgId }
    })

    if (authError) {
      return { error: `アカウント認証情報の作成に失敗しました: ${authError.message}` }
    }

    // 3. Create Public Profile
    const { error: profileError } = await supabase
      .from('users')
      .insert([{
        id: authUser.user.id,
        organization_id: orgId,
        department_id: departmentId || null,
        name,
        email,
        role: role || 'LEARNER',
        position: position || null,
        is_active: true
      }])

    if (profileError) {
      // Rollback Auth User if profile creation fails
      await adminClient.auth.admin.deleteUser(authUser.user.id)
      return { error: `プロフィール作成に失敗しました: ${profileError.message}` }
    }

    revalidatePath('/org/users')
    return { success: true, tempPassword }
  } catch (err) {
    return { error: err.message }
  }
}

export async function toggleUserActive(targetUserId, isActive) {
  try {
    const supabase = await createClient()

    // 1. Verify caller is ORG_ADMIN
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return { error: '認証セッションがありません。' }

    const { data: profile } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', currentUser.id)
      .single()

    if (!profile || profile.role !== 'ORG_ADMIN') {
      return { error: '権限がありません。' }
    }

    // 2. Verify target user belongs to the same organization
    const { data: targetUser } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', targetUserId)
      .single()

    if (!targetUser || targetUser.organization_id !== profile.organization_id) {
      return { error: '対象のユーザーが自組織に見つかりません。' }
    }

    // 3. Update public.users status
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

    // 1. Verify caller is ORG_ADMIN
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return { error: '認証セッションがありません。' }

    const { data: profile } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', currentUser.id)
      .single()

    if (!profile || profile.role !== 'ORG_ADMIN') {
      return { error: '一括インポートの権限がありません（組織管理者専用）。' }
    }

    const orgId = profile.organization_id

    // 2. Extract unique department names from CSV list
    const deptNames = [...new Set(usersList.map(u => u.departmentName).filter(Boolean))]

    // Fetch existing departments for this org
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

    // Auto-create missing departments
    for (const dName of deptNames) {
      if (!deptMap[dName]) {
        const { data: newDept, error: deptErr } = await supabase
          .from('departments')
          .insert({
            organization_id: orgId,
            name: dName
          })
          .select('id')
          .single()

        if (deptErr) {
          return { error: `部署「${dName}」の自動登録に失敗しました: ${deptErr.message}` }
        }
        deptMap[dName] = newDept.id
      }
    }

    // 3. Loop and import users
    const isMockMode = 
      !process.env.NEXT_PUBLIC_SUPABASE_URL || 
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project') ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'your-supabase-anon-key'
    const adminClient = isMockMode ? supabase : getServiceRoleClient()

    const importedUsers = []
    const failedUsers = []

    for (const u of usersList) {
      const { name, email, departmentName, position } = u
      const departmentId = departmentName ? deptMap[departmentName] : null
      const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'

      // Create Auth User
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name, organization_id: orgId }
      })

      if (authError) {
        failedUsers.push({ email, name, error: authError.message })
        continue
      }

      // Create Profile
      const { error: profileError } = await supabase
        .from('users')
        .insert([{
          id: authUser.user.id,
          organization_id: orgId,
          department_id: departmentId,
          name,
          email,
          role: 'LEARNER',
          position: position || null,
          is_active: true
        }])

      if (profileError) {
        // Rollback Auth User
        await adminClient.auth.admin.deleteUser(authUser.user.id)
        failedUsers.push({ email, name, error: profileError.message })
      } else {
        importedUsers.push({ email, name, tempPassword })
      }
    }

    revalidatePath('/org/users')
    return {
      success: true,
      importedCount: importedUsers.length,
      failedCount: failedUsers.length,
      importedUsers,
      failedUsers
    }
  } catch (err) {
    return { error: err.message }
  }
}
