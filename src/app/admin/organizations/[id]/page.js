import { createClient } from '@/utils/supabase/server'
import OrgDetailClientPage from './OrgDetailClientPage'

export const dynamic = 'force-dynamic'

export default async function OrgDetailPage({ params }) {
  const { id } = await params
  const supabase = await createClient()

  let org = null
  let departments = []
  let users = []

  try {
    // 1. Fetch organization details
    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()
    org = orgData

    // 2. Fetch departments
    const { data: deptData } = await supabase
      .from('departments')
      .select('*')
      .eq('organization_id', id)
      .order('name', { ascending: true })
    departments = deptData || []

    // 3. Fetch users
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('organization_id', id)
      .order('name', { ascending: true })
    users = userData || []
  } catch (error) {
    console.error('Failed to fetch org details:', error)
  }

  if (!org) {
    return (
      <div style={{ color: '#fca5a5', padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>組織が見つかりませんでした。</h2>
      </div>
    )
  }

  return (
    <OrgDetailClientPage
      org={org}
      departments={departments}
      users={users}
    />
  )
}
