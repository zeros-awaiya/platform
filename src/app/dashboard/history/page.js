import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LearnerHistoryClientPage from './LearnerHistoryClientPage'

export const dynamic = 'force-dynamic'

export default async function LearnerHistoryPage() {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      redirect('/login')
    }

    // Fetch enrollments for the logged in learner
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', user.id)

    // Calculate aggregated statistics
    const userEnrollments = enrollments || []
    
    // 1. Completed courses count
    const completedCoursesCount = userEnrollments.filter(e => e.status === 'completed').length

    // 2. Sum up estimated study time in minutes
    // Fetch all lessons for courses the user has interacted with
    const courseIds = userEnrollments.map(e => e.course_id)
    let totalMinutes = 0
    let completedCoursesList = []

    if (courseIds.length > 0) {
      const { data: allCourses } = await supabase
        .from('courses')
        .select('*')

      const userCourses = (allCourses || []).filter(c => courseIds.includes(c.id))

      userEnrollments.forEach(e => {
        const course = userCourses.find(c => c.id === e.course_id)
        if (!course) return

        const lessons = course.lessons || []
        
        // Sum up total minutes of the course if completed, or proportional to progress
        const courseTotalMinutes = lessons.reduce((acc, l) => acc + (l.estimated_minutes || 0), 0)
        
        if (e.status === 'completed') {
          totalMinutes += courseTotalMinutes
          completedCoursesList.push({
            id: course.id,
            title: course.title,
            categoryName: course.categories?.name || '未分類',
            totalLessonsCount: lessons.length,
            durationMinutes: courseTotalMinutes,
            startedAt: e.started_at,
            completedAt: e.completed_at
          })
        } else {
          // If in progress, estimate based on progress percent
          totalMinutes += Math.round((courseTotalMinutes * (e.progress_percent || 0)) / 100)
        }
      })
    }

    return (
      <LearnerHistoryClientPage
        completedCoursesCount={completedCoursesCount}
        totalMinutes={totalMinutes}
        completedCoursesList={completedCoursesList}
        activeCoursesCount={userEnrollments.filter(e => e.status === 'in_progress').length}
      />
    )
  } catch (error) {
    console.error('Failed to load learner history:', error)
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#fca5a5' }}>
        学習履歴の読み込みに失敗しました。
      </div>
    )
  }
}
