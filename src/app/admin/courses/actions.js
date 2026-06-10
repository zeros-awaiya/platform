'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

// --- Course Actions ---

export async function createCourse(title, categoryId, description = '', thumbnailUrl = '') {
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

export async function createLesson(courseId, title, contentType, url = '', filePath = '', articleContent = '', estimatedMinutes = 5) {
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
      sort_order: nextSortOrder
    }])
    .select()

  if (error) {
    return { error: `レッスンの追加に失敗しました: ${error.message}` }
  }

  revalidatePath('/admin/courses')
  return { success: true, lesson: data[0] }
}

export async function updateLesson(id, title, contentType, url, filePath, articleContent, estimatedMinutes) {
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
      estimated_minutes: parseInt(estimatedMinutes) || 0
    })
    .eq('id', id)

  if (error) {
    return { error: `レッスンの更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/admin/courses')
  return { success: true }
}

export async function deleteLesson(id, courseId) {
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
