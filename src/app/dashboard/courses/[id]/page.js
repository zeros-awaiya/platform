import { createClient } from '@/utils/supabase/server'
import LearnerCourseDetailClientPage from './LearnerCourseDetailClientPage'

export const dynamic = 'force-dynamic'

export default async function LearnerCourseDetailPage({ params }) {
  const { id } = await params
  const supabase = await createClient()

  let course = null
  let enrollment = null
  let completedLessonIds = []

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // 1. Fetch course details and lessons
      const { data: courseData } = await supabase
        .from('courses')
        .select('*, categories(name), lessons(*)')
        .eq('id', id)
        .single()
      
      if (courseData) {
        // Sort lessons by sort_order
        courseData.lessons = (courseData.lessons || []).sort((a, b) => a.sort_order - b.sort_order)
        course = courseData

        // 2. Fetch enrollment status
        const { data: enrollData } = await supabase
          .from('enrollments')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', id)
          .single()
        enrollment = enrollData || null

        // 3. Fetch completed lessons by this user for this course
        const lessonIds = courseData.lessons.map(l => l.id)
        if (lessonIds.length > 0) {
          const { data: progressData } = await supabase
            .from('lesson_progress')
            .select('lesson_id')
            .eq('user_id', user.id)
            .in('lesson_id', lessonIds)
          completedLessonIds = progressData?.map(p => p.lesson_id) || []
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch course details:', error)
  }

  if (!course) {
    return (
      <div style={{ color: '#fca5a5', padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>コースが見つかりませんでした。</h2>
      </div>
    )
  }

  return (
    <LearnerCourseDetailClientPage
      course={course}
      enrollment={enrollment}
      completedLessonIds={completedLessonIds}
    />
  )
}
