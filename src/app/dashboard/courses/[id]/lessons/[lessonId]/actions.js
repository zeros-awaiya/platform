'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function toggleLessonProgress(courseId, lessonId, isCompleted) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証セッションがありません。' }

  try {
    if (isCompleted) {
      // 1. Record completion in lesson_progress
      const { error } = await supabase
        .from('lesson_progress')
        .insert([{ user_id: user.id, lesson_id: lessonId }])
      
      // Ignore unique violation (already completed)
      if (error && error.code !== '23505') {
        return { error: `学習状況の記録に失敗しました: ${error.message}` }
      }
    } else {
      // 2. Remove completion from lesson_progress
      const { error } = await supabase
        .from('lesson_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
      
      if (error) {
        return { error: `学習状況のリセットに失敗しました: ${error.message}` }
      }
    }
  } catch (err) {
    return { error: err.message }
  }

  // Revalidate Cache to update UI
  revalidatePath(`/dashboard/courses/${courseId}`)
  revalidatePath(`/dashboard/courses/${courseId}/lessons/${lessonId}`)
  return { success: true }
}
