import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { ROLES } from '@/lib/constants'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile to redirect to correct dashboard
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // Session is orphaned (auth user exists but public profile doesn't)
    // Sign out and redirect to login
    await supabase.auth.signOut()
    redirect('/login')
  }

  if (profile.role === ROLES.SYSTEM_ADMIN) {
    redirect('/admin')
  } else if (profile.role === ROLES.ORG_ADMIN) {
    redirect('/org')
  } else {
    redirect('/dashboard')
  }
}
