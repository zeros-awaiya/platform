import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LearnerProfileClientPage from './LearnerProfileClientPage'

export const dynamic = 'force-dynamic'

export default async function LearnerProfilePage() {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      redirect('/login')
    }

    // Fetch user profile data
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#fca5a5' }}>
          ユーザープロフィールが見つかりませんでした。
        </div>
      )
    }

    return (
      <LearnerProfileClientPage profile={profile} />
    )
  } catch (error) {
    console.error('Failed to load learner profile:', error)
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#fca5a5' }}>
        プロフィールの読み込みに失敗しました。
      </div>
    )
  }
}
