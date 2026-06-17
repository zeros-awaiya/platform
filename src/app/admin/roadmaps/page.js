import { createClient } from '@/utils/supabase/server'
import RoadmapBuilderClientPage from './RoadmapBuilderClientPage'

export const dynamic = 'force-dynamic'

export default async function RoadmapsAdminPage() {
  const supabase = await createClient()

  let roadmaps = []
  let allCourses = []
  let organizations = []

  try {
    // 1. Fetch all active courses to allow adding them to roadmaps
    const { data: courseData } = await supabase
      .from('courses')
      .select('id, title, category_id, categories(name)')
      .eq('is_active', true)
      .order('title', { ascending: true })
    allCourses = courseData || []

    // 1-2. Fetch all organizations for visibility setting
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name')
      .order('name', { ascending: true })
    organizations = orgs || []

    // 2. Fetch learning paths with associated courses and visibilities
    const { data: lpData } = await supabase
      .from('learning_paths')
      .select('*, learning_path_visibility(*), learning_path_courses(*, courses(id, title, description, category_id, categories(name))))')
      .order('created_at', { ascending: false })

    // Process and sort courses inside roadmaps
    roadmaps = (lpData || []).map(lp => {
      const sortedLpc = (lp.learning_path_courses || []).sort((a, b) => a.sort_order - b.sort_order)
      return {
        ...lp,
        courses: sortedLpc.map(lpc => lpc.courses).filter(Boolean),
        visibility: lp.learning_path_visibility?.map(v => v.organization_id) || []
      }
    })

  } catch (error) {
    console.error('Failed to fetch roadmap builder data:', error)
  }

  return (
    <RoadmapBuilderClientPage
      initialRoadmaps={roadmaps}
      allCourses={allCourses}
      organizations={organizations}
    />
  )
}
