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

export async function submitQuizAnswers(courseId, lessonId, userAnswers) {
  // userAnswers: { [questionId]: 'A' | 'B' | 'C' | 'D' }
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証セッションがありません。' }

  try {
    // 1. Fetch correct answers from DB
    const { data: questions, error } = await supabase
      .from('quiz_questions')
      .select('id, correct_option')
      .eq('lesson_id', lessonId)

    if (error || !questions || questions.length === 0) {
      return { error: 'クイズの設問データが取得できませんでした。' }
    }

    // 2. Score the answers
    let correctCount = 0
    const totalCount = questions.length
    const results = {} // Detailed correct/incorrect map for UI

    questions.forEach(q => {
      const isCorrect = userAnswers[q.id] === q.correct_option
      if (isCorrect) {
        correctCount++
      }
      results[q.id] = isCorrect
    })

    const scorePercent = Math.round((correctCount * 100) / totalCount)
    // Pass threshold is 80% (e.g., 4 out of 5 correct)
    const isPassed = scorePercent >= 80

    // 3. Persist the attempt for audit/compliance reporting (合否に関わらず記録・非致命)
    const { error: attemptErr } = await supabase
      .from('quiz_attempts')
      .insert([{
        user_id: user.id,
        lesson_id: lessonId,
        score_percent: scorePercent,
        is_passed: isPassed,
        correct_count: correctCount,
        total_count: totalCount,
        answers: userAnswers
      }])

    // 受験記録の失敗は採点結果の返却を妨げない（監査記録はベストエフォート）
    if (attemptErr) {
      console.error('Failed to record quiz attempt:', attemptErr.message)
    }

    if (isPassed) {
      // 3. Mark lesson as completed if passed
      const { error: progressErr } = await supabase
        .from('lesson_progress')
        .insert([{ user_id: user.id, lesson_id: lessonId }])
      
      // Ignore unique violation (already completed)
      if (progressErr && progressErr.code !== '23505') {
        return { error: `学習状況の記録に失敗しました: ${progressErr.message}` }
      }
    }

    revalidatePath(`/dashboard/courses/${courseId}`)
    revalidatePath(`/dashboard/courses/${courseId}/lessons/${lessonId}`)

    return {
      success: true,
      isPassed,
      scorePercent,
      correctCount,
      totalCount,
      results
    }
  } catch (err) {
    return { error: `サーバーエラーが発生しました: ${err.message}` }
  }
}
