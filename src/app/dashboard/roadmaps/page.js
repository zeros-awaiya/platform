import { createClient } from '@/utils/supabase/server'
import LearnerRoadmapsClientPage from './LearnerRoadmapsClientPage'

export const dynamic = 'force-dynamic'

export default async function LearnerRoadmapsPage() {
  const supabase = await createClient()

  let roadmaps = []
  let debugErrors = {}

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

        // 1. Fetch user's enrollments to map progress
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('course_id, progress_percent, status')
          .eq('user_id', user.id)
        
        const progressMap = new Map(enrollments?.map(e => [e.course_id, e.progress_percent]) || [])
        const completedCourseIds = enrollments?.filter(e => e.status === 'completed').map(e => e.course_id) || []

        // 2. Fetch active roadmaps visible to user (own organization, visibility-mapped HQ, or individually assigned)
        
        // A. 自組織専用のロードマップ
        const { data: orgLps, error: orgLpsErr } = await supabase
          .from('learning_paths')
          .select('*, learning_path_courses(*, courses(id, title, description, category_id, categories(name))))')
          .eq('is_active', true)
          .eq('organization_id', orgId)
        if (orgLpsErr) {
          console.error('orgLps query error in roadmaps page:', orgLpsErr)
          debugErrors.orgLps = orgLpsErr
        }

        // B. 本部ロードマップのうち、自組織に公開されているもの
        const { data: visHqLpsData, error: visHqLpsErr } = await supabase
          .from('learning_path_visibility')
          .select('learning_path_id, learning_paths(*, learning_path_courses(*, courses(id, title, description, category_id, categories(name))))')
          .eq('organization_id', orgId)
        if (visHqLpsErr) {
          console.error('visHqLps query error in roadmaps page:', visHqLpsErr)
          debugErrors.visHqLps = visHqLpsErr
        }

        const visHqLps = visHqLpsData
          ?.map(v => v.learning_paths)
          .filter(lp => lp && lp.is_active) || []

        // C. 個人に個別割り当てされているロードマップ
        const { data: assignedLpsData, error: assignedLpsErr } = await supabase
          .from('user_learning_paths')
          .select('learning_path_id, learning_paths(*, learning_path_courses(*, courses(id, title, description, category_id, categories(name))))')
          .eq('user_id', user.id)
        if (assignedLpsErr) {
          console.error('assignedLps query error in roadmaps page:', assignedLpsErr)
          debugErrors.assignedLps = assignedLpsErr
        }

        const assignedLps = assignedLpsData
          ?.map(a => a.learning_paths)
          .filter(lp => lp && lp.is_active) || []

        // 結合して重複を排除
        const combinedLps = [
          ...(orgLps || []),
          ...visHqLps,
          ...assignedLps
        ]
        const uniqueLpMap = new Map(combinedLps.map(lp => [lp.id, lp]))
        const lpData = Array.from(uniqueLpMap.values())

        // 3. Process each roadmap and calculate step states (Completed, Next Active, Locked)
        roadmaps = (lpData || []).map(lp => {
          // Sort course steps by sort_order
          const sortedLpc = (lp.learning_path_courses || []).sort((a, b) => a.sort_order - b.sort_order)
          
          let activeFound = false
          const courses = sortedLpc.map((lpc, index) => {
            const course = lpc.courses
            if (!course) return null

            const isCourseCompleted = completedCourseIds.includes(course.id)
            let status = 'locked'

            if (isCourseCompleted) {
              status = 'completed'
            } else if (!activeFound) {
              status = 'active' // First uncompleted step is the "Next Action"
              activeFound = true
            } else {
              status = 'locked'
            }

            return {
              ...course,
              roadmap_status: status,
              progress_percent: progressMap.get(course.id) || 0
            }
          }).filter(Boolean)

          return {
            ...lp,
            courses
          }
        }) // filter(lp => lp.courses.length > 0)
      }
    }
  } catch (error) {
    console.error('Failed to fetch learner roadmaps:', error)
  }

  return (
    <LearnerRoadmapsClientPage
      roadmaps={roadmaps}
      debugErrors={debugErrors}
    />
  )
}
