'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { assertRole } from '@/utils/auth/guard'
import { ROLES } from '@/lib/constants'

// --- Course Actions ---

export async function createCourse(title, categoryId, description = '', thumbnailUrl = '') {
  const auth = await assertRole([ROLES.SYSTEM_ADMIN])
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  if (!title) {
    return { error: 'コース名を入力してください。' }
  }

  const { data, error } = await supabase
    .from('courses')
    .insert([{ 
      title, 
      category_id: categoryId || null, 
      description, 
      thumbnail_url: thumbnailUrl,
      is_active: true 
    }])
    .select()

  if (error) {
    return { error: `コースの作成に失敗しました: ${error.message}` }
  }

  revalidatePath('/admin/courses')
  return { success: true, course: data[0] }
}

export async function updateCourse(id, title, categoryId, description, thumbnailUrl, isActive) {
  const auth = await assertRole([ROLES.SYSTEM_ADMIN])
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  if (!title) {
    return { error: 'コース名を入力してください。' }
  }

  const { error } = await supabase
    .from('courses')
    .update({ 
      title, 
      category_id: categoryId || null, 
      description, 
      thumbnail_url: thumbnailUrl,
      is_active: isActive,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    return { error: `コースの更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/admin/courses')
  return { success: true }
}

export async function deleteCourse(id) {
  const auth = await assertRole([ROLES.SYSTEM_ADMIN])
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: `コースの削除に失敗しました: ${error.message}` }
  }

  revalidatePath('/admin/courses')
  return { success: true }
}

// --- Lesson Actions ---

export async function createLesson(courseId, title, contentType, url = '', filePath = '', articleContent = '', estimatedMinutes = 5, slidePdfUrl = '', worksheetWordUrl = '') {
  const auth = await assertRole([ROLES.SYSTEM_ADMIN])
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  if (!title) {
    return { error: 'レッスン名を入力してください。' }
  }

  // Get current max sort_order
  const { data: currentLessons } = await supabase
    .from('lessons')
    .select('sort_order')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextSortOrder = currentLessons && currentLessons.length > 0 ? currentLessons[0].sort_order + 1 : 0

  const { data, error } = await supabase
    .from('lessons')
    .insert([{
      course_id: courseId,
      title,
      content_type: contentType,
      url: url || null,
      file_path: filePath || null,
      article_content: articleContent || null,
      estimated_minutes: parseInt(estimatedMinutes) || 0,
      slide_pdf_url: slidePdfUrl || null,
      worksheet_word_url: worksheetWordUrl || null,
      sort_order: nextSortOrder
    }])
    .select()

  if (error) {
    return { error: `レッスンの追加に失敗しました: ${error.message}` }
  }

  revalidatePath('/admin/courses')
  return { success: true, lesson: data[0] }
}

export async function updateLesson(id, title, contentType, url, filePath, articleContent, estimatedMinutes, slidePdfUrl = '', worksheetWordUrl = '') {
  const auth = await assertRole([ROLES.SYSTEM_ADMIN])
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  if (!title) {
    return { error: 'レッスン名を入力してください。' }
  }

  const { error } = await supabase
    .from('lessons')
    .update({
      title,
      content_type: contentType,
      url: url || null,
      file_path: filePath || null,
      article_content: articleContent || null,
      estimated_minutes: parseInt(estimatedMinutes) || 0,
      slide_pdf_url: slidePdfUrl || null,
      worksheet_word_url: worksheetWordUrl || null
    })
    .eq('id', id)

  if (error) {
    return { error: `レッスンの更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/admin/courses')
  return { success: true }
}

export async function deleteLesson(id, courseId) {
  const auth = await assertRole([ROLES.SYSTEM_ADMIN])
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: `レッスンの削除に失敗しました: ${error.message}` }
  }

  revalidatePath('/admin/courses')
  return { success: true }
}

export async function reorderLessons(courseId, orderedIds) {
  const auth = await assertRole([ROLES.SYSTEM_ADMIN])
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  // Use a transaction or individual updates
  // Supabase doesn't easily support multi-row updates in a single query with different values,
  // but since lessons in a single course are usually few (e.g., 5-20), running updates in parallel is fine.
  const promises = orderedIds.map((id, index) => {
    return supabase
      .from('lessons')
      .update({ sort_order: index })
      .eq('id', id)
  })

  const results = await Promise.all(promises)
  const failed = results.find(r => r.error)

  if (failed) {
    return { error: `並び替えの保存に一部失敗しました: ${failed.error.message}` }
  }

  revalidatePath('/admin/courses')
  return { success: true }
}

export async function saveQuizQuestions(lessonId, questions) {
  // questions: Array of { id, question, option_a, option_b, option_c, option_d, correct_option }
  const auth = await assertRole([ROLES.SYSTEM_ADMIN])
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  // 1. Fetch existing questions to detect deletions
  const { data: existing, error: fetchErr } = await supabase
    .from('quiz_questions')
    .select('id')
    .eq('lesson_id', lessonId)

  if (fetchErr) {
    return { error: `既存の問題の取得に失敗しました: ${fetchErr.message}` }
  }

  const existingIds = existing?.map(q => q.id) || []
  const incomingIds = questions.filter(q => q.id).map(q => q.id)
  
  // 2. Delete questions not present in incoming list
  const toDelete = existingIds.filter(id => !incomingIds.includes(id))
  if (toDelete.length > 0) {
    const { error: delErr } = await supabase
      .from('quiz_questions')
      .delete()
      .in('id', toDelete)
    if (delErr) {
      return { error: `不要になった問題の削除に失敗しました: ${delErr.message}` }
    }
  }

  // 3. Upsert (Insert/Update) current questions
  if (questions.length > 0) {
    const upsertData = questions.map((q, idx) => ({
      id: q.id || undefined, // Generates new UUID if undefined
      lesson_id: lessonId,
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_option: q.correct_option,
      sort_order: idx
    }))

    const { error: upsertErr } = await supabase
      .from('quiz_questions')
      .upsert(upsertData)

    if (upsertErr) {
      return { error: `問題の保存に失敗しました: ${upsertErr.message}` }
    }
  }

  revalidatePath('/admin/courses')
  return { success: true }
}
