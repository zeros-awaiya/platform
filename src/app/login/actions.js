'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { ROLES } from '@/lib/constants'

export async function login(prevState, formData) {
  const supabase = await createClient()

  const email = formData.get('email')?.trim()
  const password = formData.get('password')

  if (!email || !password) {
    return { error: 'メールアドレスとパスワードを入力してください。' }
  }

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Standard Supabase error message translation if helpful
    let message = error.message
    if (message === 'Invalid login credentials') {
      message = 'メールアドレスまたはパスワードが正しくありません。'
    }
    return { error: message }
  }

  // Fetch user profile from public.users to determine role
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', data.user.id)
    .single()

  if (profileError || !profile) {
    // If profile not found, sign out to prevent orphaned session
    await supabase.auth.signOut()
    return { error: 'ユーザープロファイルが見つかりません。管理者にお問い合わせください。' }
  }

  if (!profile.is_active) {
    await supabase.auth.signOut()
    return { error: 'このアカウントは無効化されています。' }
  }

  revalidatePath('/', 'layout')
  
  // Redirect according to user role
  if (profile.role === ROLES.SYSTEM_ADMIN) {
    redirect('/admin')
  } else if (profile.role === ROLES.ORG_ADMIN) {
    redirect('/org')
  } else {
    redirect('/dashboard')
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
