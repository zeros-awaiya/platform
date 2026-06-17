'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { createClient as createServiceRoleClient } from '@supabase/supabase-js'

function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseServiceKey) {
    throw new Error('環境変数 SUPABASE_SERVICE_ROLE_KEY が設定されていません。')
  }
  return createServiceRoleClient(supabaseUrl, supabaseServiceKey)
}

export async function createUser(prevState, formData) {
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
    // 招待パスワードの自動生成
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'

    const isMockMode = 
      !process.env.NEXT_PUBLIC_SUPABASE_URL || 
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project') ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'your-supabase-anon-key'
    
    const adminClient = isMockMode ? supabase : getServiceRoleClient()

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
    if (!isMockMode) {
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

    // Auth ユーザーの作成
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name, organization_id: organizationId }
    })

    if (authError) {
      if (authError.message === 'A user with this email address has already been registered') {
        return { error: 'このメールアドレスは既に登録されています。' }
      }
      return { error: `認証アカウント作成失敗: ${authError.message}` }
    }

    // Profile の作成
    const { error: profileError } = await supabase
      .from('users')
      .insert([{
        id: authUser.user.id,
        organization_id: organizationId,
        department_id: departmentId === 'none' || !departmentId ? null : departmentId,
        name,
        email,
        role: role || 'LEARNER',
        position: position || null,
        is_active: true
      }])

    if (profileError) {
      await adminClient.auth.admin.deleteUser(authUser.user.id)
      return { error: `ユーザープロファイル登録失敗: ${profileError.message}` }
    }

    revalidatePath('/admin/users')
    return { success: true, tempPassword }
  } catch (err) {
    return { error: err.message }
  }
}

export async function toggleUserActive(userId, isActive) {
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
