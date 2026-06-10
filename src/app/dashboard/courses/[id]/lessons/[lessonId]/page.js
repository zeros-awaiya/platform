import { createClient } from '@/utils/supabase/server'
import LearnerLessonClientPage from './LearnerLessonClientPage'

export const dynamic = 'force-dynamic'

export default async function LearnerLessonPage({ params }) {
  const { id: courseId, lessonId } = await params
  const supabase = await createClient()

  let course = null
  let lesson = null
  let nextLessonId = null
  let isCompleted = false

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // 1. Fetch course details and lessons
      const { data: courseData } = await supabase
        .from('courses')
        .select('*, lessons(*)')
        .eq('id', courseId)
        .single()

      if (courseData) {
        // Sort lessons
        const sortedLessons = (courseData.lessons || []).sort((a, b) => a.sort_order - b.sort_order)
        courseData.lessons = sortedLessons
        course = courseData

        // Extract active lesson
        lesson = sortedLessons.find(l => l.id === lessonId)

        // Find next lesson to provide navigation
        const currentIdx = sortedLessons.findIndex(l => l.id === lessonId)
        if (currentIdx !== -1 && currentIdx < sortedLessons.length - 1) {
          nextLessonId = sortedLessons[currentIdx + 1].id
        }

        // 2. Fetch completion status
        const { data: progress } = await supabase
          .from('lesson_progress')
          .select('id')
          .eq('user_id', user.id)
          .eq('lesson_id', lessonId)
          .maybeSingle() // Use maybeSingle to prevent exception if not found
        isCompleted = !!progress
      }
    }
  } catch (error) {
    console.error('Failed to fetch lesson page data:', error)
  }

  if (!course || !lesson) {
    return (
      <div style={{ color: '#fca5a5', padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>教材が見つかりませんでした。</h2>
      </div>
    )
  }

  return (
    <LearnerLessonClientPage
      course={course}
      lesson={lesson}
      nextLessonId={nextLessonId}
      initialIsCompleted={isCompleted}
    />
  )
}
