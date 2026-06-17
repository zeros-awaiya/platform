import { createClient } from '@/utils/supabase/server'
import CourseBuilderClientPage from './CourseBuilderClientPage'

export const dynamic = 'force-dynamic'

export default async function CoursesAdminPage() {
  const supabase = await createClient()

  let courses = []
  let categories = []

  try {
    // 1. Fetch categories (for drop-down select)
    const { data: catData } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
    categories = catData || []

    // 2. Fetch courses with categories and ordered lessons (including quiz questions)
    const { data: courseData } = await supabase
      .from('courses')
      .select('*, categories(name), lessons(*, quiz_questions(*))')
      .order('created_at', { ascending: false })
      
    // Sort lessons and quiz questions inside javascript to ensure they are ordered correctly
    courses = (courseData || []).map(course => ({
      ...course,
      lessons: (course.lessons || []).map(lesson => ({
        ...lesson,
        quiz_questions: (lesson.quiz_questions || []).sort((a, b) => a.sort_order - b.sort_order)
      })).sort((a, b) => a.sort_order - b.sort_order)
    }))

  } catch (error) {
    console.error('Failed to fetch course builder data:', error)
  }

  return (
    <CourseBuilderClientPage
      initialCourses={courses}
      categories={categories}
    />
  )
}
