import { NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/utils/supabase/admin'
import { verifyIntegrationToken } from '@/utils/integrationAuth'

// 外部（介護研修サポート）が必須研修コンテンツを「借りる」ための読取API。
// セッション無しのため RLS をバイパスする service_role を使用する。
// 受講・採点・監査は介護研修サポート側で行うため、本APIは読取専用。
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function json(status, body) {
  return NextResponse.json(body, { status })
}

// quiz_questions（option_a..d / correct_option 'A'..'D'）を
// 介護研修サポートの形式（options 配列 / correctAnswer 0始まり）へ整形。
function toQuestion(q) {
  return {
    question: q.question,
    options: [q.option_a, q.option_b, q.option_c, q.option_d],
    correctAnswer: 'ABCD'.indexOf(q.correct_option),
    explanation: '',
  }
}

export async function GET(request) {
  const auth = verifyIntegrationToken(request)
  if (!auth.ok) {
    if (auth.status === 500) {
      console.error('[integrations/courses] INTEGRATION_TOKEN が未設定です（設定不備）。')
    }
    return json(auth.status, { status: 'error', message: auth.message })
  }

  // ?ids=a,b,c で対象コースを絞り込み（未指定なら is_active な全コース）
  const idsParam = request.nextUrl.searchParams.get('ids')
  const courseIds = idsParam
    ? idsParam.split(',').map((s) => s.trim()).filter(Boolean)
    : null

  try {
    const supabase = getServiceRoleClient()

    let courseQuery = supabase
      .from('courses')
      .select('id, title, description')
      .eq('is_active', true)
    if (courseIds) {
      courseQuery = courseQuery.in('id', courseIds)
    }
    const { data: courses, error: courseError } = await courseQuery
    if (courseError) throw courseError

    if (!courses || courses.length === 0) {
      return json(200, { courses: [] })
    }

    const ids = courses.map((c) => c.id)

    const { data: lessons, error: lessonError } = await supabase
      .from('lessons')
      .select(
        'id, course_id, title, content_type, url, article_content, ' +
          'slide_pdf_url, worksheet_word_url, estimated_minutes, sort_order',
      )
      .in('course_id', ids)
      .order('sort_order', { ascending: true })
    if (lessonError) throw lessonError

    const quizLessonIds = (lessons || [])
      .filter((l) => l.content_type === 'quiz')
      .map((l) => l.id)

    let questionsByLesson = {}
    if (quizLessonIds.length > 0) {
      const { data: questions, error: questionError } = await supabase
        .from('quiz_questions')
        .select('lesson_id, question, option_a, option_b, option_c, option_d, correct_option, sort_order')
        .in('lesson_id', quizLessonIds)
        .order('sort_order', { ascending: true })
      if (questionError) throw questionError

      questionsByLesson = (questions || []).reduce((acc, q) => {
        ;(acc[q.lesson_id] ||= []).push(toQuestion(q))
        return acc
      }, {})
    }

    const lessonsByCourse = (lessons || []).reduce((acc, l) => {
      ;(acc[l.course_id] ||= []).push(l)
      return acc
    }, {})

    const result = courses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      lessons: (lessonsByCourse[c.id] || []).map((l) => ({
        id: l.id,
        title: l.title,
        content_type: l.content_type,
        url: l.url,
        article_content: l.article_content,
        slide_pdf_url: l.slide_pdf_url,
        worksheet_word_url: l.worksheet_word_url,
        estimated_minutes: l.estimated_minutes,
        sort_order: l.sort_order,
        ...(l.content_type === 'quiz' ? { questions: questionsByLesson[l.id] || [] } : {}),
      })),
    }))

    return json(200, { courses: result })
  } catch (error) {
    // 握りつぶさない。スタックは漏らさず message のみ構造化ログに残す。
    console.error('[integrations/courses] fetch failed:', error?.message || error)
    return json(500, { status: 'error', message: 'fetch failed' })
  }
}
