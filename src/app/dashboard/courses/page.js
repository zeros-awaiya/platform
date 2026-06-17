import { createClient } from '@/utils/supabase/server'
import LearnerCoursesClientPage from './LearnerCoursesClientPage'

export const dynamic = 'force-dynamic'

export default async function LearnerCoursesPage() {
  const supabase = await createClient()

  let courses = []
  let categories = []

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (profile) {
        const orgId = profile.organization_id

        // 1. Fetch categories
        const { data: catData } = await supabase
          .from('categories')
          .select('*')
          .order('sort_order', { ascending: true })
        categories = catData || []

        // 2. Fetch enrollments for progress matching
        const { data: enrollData } = await supabase
          .from('enrollments')
          .select('course_id, progress_percent, status')
          .eq('user_id', user.id)
        const enrollMap = new Map(enrollData?.map(e => [e.course_id, e]) || [])

        // 3. Fetch visible courses
        // A. Organization-specific courses
        const { data: orgCourses } = await supabase
          .from('courses')
          .select('*, categories(name)')
          .eq('is_active', true)
          .eq('organization_id', orgId)

        // B. HQ courses visible to this organization
        const { data: visHq } = await supabase
          .from('course_visibility')
          .select('course_id, courses(*, categories(name))')
          .eq('organization_id', orgId)

        // Filter and extract courses that are active
        const hqCourses = visHq
          ?.map(vh => vh.courses)
          .filter(c => c && c.is_active) || []

        // C. HQ courses that are active globally (organization_id IS NULL)
        const { data: hqActiveCourses } = await supabase
          .from('courses')
          .select('*, categories(name)')
          .eq('is_active', true)
          .is('organization_id', null)

        // Combine courses and deduplicate by ID
        const combined = [
          ...(orgCourses || []), 
          ...hqCourses,
          ...(hqActiveCourses || [])
        ]
        const uniqueMap = new Map(combined.map(c => [c.id, c]))
        
        courses = Array.from(uniqueMap.values()).map(course => {
          const enroll = enrollMap.get(course.id)
          return {
            ...course,
            progress_percent: enroll ? enroll.progress_percent : 0,
            enrollment_status: enroll ? enroll.status : 'not_started'
          }
        })
      }
    }
  } catch (error) {
    console.error('Failed to fetch learner courses:', error)
  }

  return (
    <LearnerCoursesClientPage
      initialCourses={courses}
      categories={categories}
    />
  )
}
