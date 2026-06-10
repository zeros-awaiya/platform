import { createClient } from '@/utils/supabase/server'
import LearnerDashboardClientPage from './LearnerDashboardClientPage'

export const dynamic = 'force-dynamic'

export default async function LearnerDashboardPage() {
  const supabase = await createClient()

  let userProfile = null
  let nextRecommendedCourses = []
  let studyingCourses = []
  let completedCount = 0
  let totalVisibleCourses = 0
  let mandatoryCoursesList = []
  let notificationsList = []

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // 1. Fetch user profile and organization info
      const { data: profile } = await supabase
        .from('users')
        .select('*, organizations(name)')
        .eq('id', user.id)
        .single()
      userProfile = profile

      if (profile) {
        const orgId = profile.organization_id
        const deptId = profile.department_id

        // 2. Fetch user enrollments (learning status)
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('*, courses(*, categories(name))')
          .eq('user_id', user.id)

        const enrollMap = new Map(enrollments?.map(e => [e.course_id, e]) || [])
        completedCount = enrollments?.filter(e => e.status === 'completed').length || 0
        studyingCourses = enrollments?.filter(e => e.status === 'in_progress').map(e => ({
          ...e.courses,
          progress_percent: e.progress_percent,
          enrollment_status: e.status
        })) || []

        // 3. Calculate total visible courses for the user
        const { data: orgCourses } = await supabase
          .from('courses')
          .select('id')
          .eq('is_active', true)
          .eq('organization_id', orgId)
        
        const { data: visHq } = await supabase
          .from('course_visibility')
          .select('course_id')
          .eq('organization_id', orgId)

        const combinedIds = new Set([
          ...(orgCourses?.map(c => c.id) || []),
          ...(visHq?.map(vh => vh.course_id) || [])
        ])
        totalVisibleCourses = combinedIds.size

        // 4. Fetch mandatory courses assigned to this user's organization/department
        let mandatoryQuery = supabase
          .from('mandatory_courses')
          .select('*, courses(*, categories(name))')
          .eq('organization_id', orgId)
        
        if (deptId) {
          mandatoryQuery = mandatoryQuery.or(`department_id.eq.${deptId},department_id.is.null`)
        } else {
          mandatoryQuery = mandatoryQuery.eq('department_id', null)
        }

        const { data: mandatories } = await mandatoryQuery
        
        mandatoryCoursesList = (mandatories || []).map(m => {
          const course = m.courses
          if (!course) return null
          const enroll = enrollMap.get(course.id)
          return {
            ...course,
            due_date: m.due_date,
            progress_percent: enroll ? enroll.progress_percent : 0,
            enrollment_status: enroll ? enroll.status : 'not_started'
          }
        }).filter(Boolean)

        // 5. Calculate "Next Recommended Course" from active roadmaps
        const { data: lpData } = await supabase
          .from('learning_paths')
          .select('*, learning_path_courses(*, courses(id, title, description, category_id, categories(name))))')
          .eq('is_active', true)
          .or(`organization_id.eq.${orgId},organization_id.is.null`)

        const completedCourseIds = enrollments?.filter(e => e.status === 'completed').map(e => e.course_id) || []
        
        const recCoursesMap = new Map()
        
        ;(lpData || []).forEach(lp => {
          const sortedLpc = (lp.learning_path_courses || []).sort((a, b) => a.sort_order - b.sort_order)
          
          // Find the first course in the path that is NOT completed
          const nextStep = sortedLpc.find(lpc => lpc.courses && !completedCourseIds.includes(lpc.courses.id))
          if (nextStep && nextStep.courses) {
            const course = nextStep.courses
            const enroll = enrollMap.get(course.id)
            recCoursesMap.set(course.id, {
              ...course,
              roadmapName: lp.name,
              progress_percent: enroll ? enroll.progress_percent : 0,
              enrollment_status: enroll ? enroll.status : 'not_started'
            })
          }
        })
        
        nextRecommendedCourses = Array.from(recCoursesMap.values())
        // 6. Fetch recent notifications (global or targeting this organization)
        const { data: allNotifications } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })

        notificationsList = (allNotifications || [])
          .filter(n => n.organization_id === null || n.organization_id === orgId)
          .slice(0, 3)
      }
    }
  } catch (error) {
    console.error('Failed to load learner dashboard data:', error)
  }

  return (
    <LearnerDashboardClientPage
      profile={userProfile}
      nextRecommendedCourses={nextRecommendedCourses}
      studyingCourses={studyingCourses}
      completedCount={completedCount}
      totalVisibleCourses={totalVisibleCourses}
      mandatoryCourses={mandatoryCoursesList}
      notifications={notificationsList}
    />
  )
}
