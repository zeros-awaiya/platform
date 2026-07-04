'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { assertRole } from '@/utils/auth/guard'
import { ROLES } from '@/lib/constants'

// --- Learning Path (Roadmap) Actions ---

export async function createRoadmap(name, description = '') {
  const auth = await assertRole([ROLES.SYSTEM_ADMIN])
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  if (!name) {
    return { error: 'ロードマップ名を入力してください。' }
  }

  const { data, error } = await supabase
    .from('learning_paths')
    .insert([{ name, description, is_active: true }])
    .select()

  if (error) {
    return { error: `ロードマップの作成に失敗しました: ${error.message}` }
  }

  revalidatePath('/admin/roadmaps')
  return { success: true, roadmap: data[0] }
}

export async function updateRoadmap(id, name, description, isActive, visibleOrgIds = []) {
  const auth = await assertRole([ROLES.SYSTEM_ADMIN])
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  if (!name) {
    return { error: 'ロードマップ名を入力してください。' }
  }

  // 1. 基本情報の更新
  const { error } = await supabase
    .from('learning_paths')
    .update({ name, description, is_active: isActive })
    .eq('id', id)

  if (error) {
    return { error: `ロードマップの更新に失敗しました: ${error.message}` }
  }

  // 2. 公開組織の同期 (一度全て削除して再登録)
  const { error: deleteError } = await supabase
    .from('learning_path_visibility')
    .delete()
    .eq('learning_path_id', id)

  if (deleteError) {
    return { error: `公開組織の更新に失敗しました(削除): ${deleteError.message}` }
  }

  if (visibleOrgIds && visibleOrgIds.length > 0) {
    const insertData = visibleOrgIds.map(orgId => ({
      learning_path_id: id,
      organization_id: orgId
    }))

    const { error: insertError } = await supabase
      .from('learning_path_visibility')
      .insert(insertData)

    if (insertError) {
      return { error: `公開組織の更新に失敗しました(追加): ${insertError.message}` }
    }
  }

  revalidatePath('/admin/roadmaps')
  return { success: true }
}

export async function deleteRoadmap(id) {
  const auth = await assertRole([ROLES.SYSTEM_ADMIN])
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  const { error } = await supabase
    .from('learning_paths')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: `ロードマップの削除に失敗しました: ${error.message}` }
  }

  revalidatePath('/admin/roadmaps')
  return { success: true }
}

// --- Roadmap Course Actions ---

export async function addCourseToRoadmap(roadmapId, courseId) {
  const auth = await assertRole([ROLES.SYSTEM_ADMIN])
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  // Verify not already added
  const { data: exists } = await supabase
    .from('learning_path_courses')
    .select('id')
    .eq('learning_path_id', roadmapId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (exists) {
    return { error: 'このコースは既にロードマップに追加されています。' }
  }

  // Get current max sort_order
  const { data: currentCourses } = await supabase
    .from('learning_path_courses')
    .select('sort_order')
    .eq('learning_path_id', roadmapId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextSortOrder = currentCourses && currentCourses.length > 0 ? currentCourses[0].sort_order + 1 : 0

  const { error } = await supabase
    .from('learning_path_courses')
    .insert([{
      learning_path_id: roadmapId,
      course_id: courseId,
      sort_order: nextSortOrder
    }])

  if (error) {
    return { error: `コースの追加に失敗しました: ${error.message}` }
  }

  revalidatePath('/admin/roadmaps')
  return { success: true }
}

export async function removeCourseFromRoadmap(roadmapId, courseId) {
  const auth = await assertRole([ROLES.SYSTEM_ADMIN])
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  const { error } = await supabase
    .from('learning_path_courses')
    .delete()
    .eq('learning_path_id', roadmapId)
    .eq('course_id', courseId)

  if (error) {
    return { error: `コースの削除に失敗しました: ${error.message}` }
  }

  revalidatePath('/admin/roadmaps')
  return { success: true }
}

export async function reorderRoadmapCourses(roadmapId, orderedCourseIds) {
  const auth = await assertRole([ROLES.SYSTEM_ADMIN])
  if (!auth.ok) return { error: auth.error }

  const supabase = await createClient()

  const promises = orderedCourseIds.map((courseId, index) => {
    return supabase
      .from('learning_path_courses')
      .update({ sort_order: index })
      .eq('learning_path_id', roadmapId)
      .eq('course_id', courseId)
  })

  const results = await Promise.all(promises)
  const failed = results.find(r => r.error)

  if (failed) {
    return { error: `並び替えの保存に一部失敗しました: ${failed.error.message}` }
  }

  revalidatePath('/admin/roadmaps')
  return { success: true }
}
