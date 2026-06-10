import { createClient } from '@/utils/supabase/server'
import OrgUsersClientPage from './OrgUsersClientPage'

export const dynamic = 'force-dynamic'

export default async function OrgUsersPage() {
  const supabase = await createClient()

  let users = []
  let departments = []

  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (currentUser) {
      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', currentUser.id)
        .single()

      if (profile) {
        const orgId = profile.organization_id

        // 1. Fetch users in org
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('organization_id', orgId)
          .order('name', { ascending: true })
        users = userData || []

        // 2. Fetch departments in org (for dropdown select in invitation modal)
        const { data: deptData } = await supabase
          .from('departments')
          .select('*')
          .eq('organization_id', orgId)
          .order('name', { ascending: true })
        departments = deptData || []
      }
    }
  } catch (error) {
    console.error('Failed to fetch org users page data:', error)
  }

  return <OrgUsersClientPage initialUsers={users} departments={departments} />
}
