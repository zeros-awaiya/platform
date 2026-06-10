import { createClient } from '@/utils/supabase/server'
import OrgClientPage from './OrgClientPage'

export const dynamic = 'force-dynamic'

export default async function OrganizationsPage() {
  const supabase = await createClient()

  let orgs = []
  try {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })
    orgs = data || []
  } catch (error) {
    console.error('Failed to fetch organizations:', error)
  }

  return <OrgClientPage initialOrgs={orgs} />
}
