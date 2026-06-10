import { createClient } from '@/utils/supabase/server'
import RoadmapBuilderClientPage from './RoadmapBuilderClientPage'

export const dynamic = 'force-dynamic'

export default async function RoadmapsAdminPage() {
  const supabase = await createClient()

  let roadmaps = []
  let allCourses = []

  try {
    // 1. Fetch all active courses to allow adding them to roadmaps
    const { data: courseData } = await supabase
      .from('courses')
      .select('id, title, category_id, categories(name)')
      .eq('is_active', true)
      .order('title', { ascending: true })
    allCourses = courseData || []

    // 2. Fetch learning paths with associated courses
    const { data: lpData } = await supabase
      .from('learning_paths')
      .select('*, learning_path_courses(*, courses(id, title, description, category_id, categories(name))))')
      .order('created_at', { ascending: false })

    // Process and sort courses inside roadmaps
    roadmaps = (lpData || []).map(lp => {
      const sortedLpc = (lp.learning_path_courses || []).sort((a, b) => a.sort_order - b.sort_order)
      return {
        ...lp,
        courses: sortedLpc.map(lpc => lpc.courses).filter(Boolean)
      }
    })

  } catch (error) {
    console.error('Failed to fetch roadmap builder data:', error)
  }

  return (
    <RoadmapBuilderClientPage
      initialRoadmaps={roadmaps}
      allCourses={allCourses}
    />
  )
}
