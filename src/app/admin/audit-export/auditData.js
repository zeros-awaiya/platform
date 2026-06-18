// 監査対応PDF出力のためのデータ集計。
// 指定組織について「必須研修一覧／受講状況（出席記録）／テスト結果」を組み立てて返す。
// RLS は呼び出し元の権限（SYSTEM_ADMIN）に従う。報告書は本スコープでは含めない。

function ymd(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function statusLabel(status) {
  if (status === 'completed') return '完了'
  if (status === 'in_progress') return '受講中'
  return '未受講'
}

export async function getAuditReport(supabase, organizationId, options = {}) {
  const { from = null, to = null } = options

  const org = (await supabase
    .from('organizations').select('id, name').eq('id', organizationId).single()).data
  if (!org) return null

  const departments = (await supabase
    .from('departments').select('id, name').eq('organization_id', organizationId)).data || []
  const deptName = (id) => departments.find((d) => d.id === id)?.name || '組織全体'

  const members = (await supabase
    .from('users').select('id, name, email, department_id, role')
    .eq('organization_id', organizationId).eq('is_active', true)
    .order('name', { ascending: true })).data || []
  const memberIds = members.map((m) => m.id)
  const memberName = (id) => members.find((m) => m.id === id)?.name || '-'

  const mandatory = (await supabase
    .from('mandatory_courses').select('id, course_id, department_id, due_date')
    .eq('organization_id', organizationId)).data || []

  const courses = (await supabase.from('courses').select('id, title')).data || []
  const courseTitle = (id) => courses.find((c) => c.id === id)?.title || '不明なコース'

  const lessons = (await supabase.from('lessons').select('id, title, course_id')).data || []
  const lessonById = (id) => lessons.find((l) => l.id === id)

  let enrollments = []
  let attempts = []
  if (memberIds.length > 0) {
    enrollments = (await supabase
      .from('enrollments').select('user_id, course_id, status, completed_at, progress_percent')
      .in('user_id', memberIds)).data || []

    let query = supabase
      .from('quiz_attempts')
      .select('user_id, lesson_id, score_percent, is_passed, attempted_at')
      .in('user_id', memberIds)
    if (from) query = query.gte('attempted_at', from)
    if (to) query = query.lte('attempted_at', to)
    attempts = (await query).data || []
  }

  // §1 必須研修一覧
  const mandatoryList = mandatory.map((m) => ({
    courseTitle: courseTitle(m.course_id),
    deptName: deptName(m.department_id),
    dueDate: ymd(m.due_date),
  }))

  // §2 受講状況（出席記録）: 職員 × 必須研修コース
  const attendance = members.map((mem) => ({
    name: mem.name,
    deptName: deptName(mem.department_id),
    rows: mandatory.map((m) => {
      const e = enrollments.find((x) => x.user_id === mem.id && x.course_id === m.course_id)
      return {
        courseTitle: courseTitle(m.course_id),
        status: statusLabel(e?.status),
        completedAt: ymd(e?.completed_at),
        progress: e?.progress_percent ?? 0,
      }
    }),
  }))

  // §3 テスト結果: (職員 × クイズレッスン) の最新受験のみ
  const latest = {}
  attempts.forEach((a) => {
    const key = `${a.user_id}:${a.lesson_id}`
    if (!latest[key] || new Date(a.attempted_at) > new Date(latest[key].attempted_at)) {
      latest[key] = a
    }
  })
  const testResults = Object.values(latest).map((a) => {
    const lesson = lessonById(a.lesson_id)
    return {
      name: memberName(a.user_id),
      courseTitle: lesson ? courseTitle(lesson.course_id) : '-',
      lessonTitle: lesson?.title || '-',
      scorePercent: a.score_percent,
      isPassed: a.is_passed,
      attemptedAt: ymd(a.attempted_at),
    }
  }).sort((x, y) => x.name.localeCompare(y.name, 'ja'))

  return {
    org,
    generatedAt: new Date().toLocaleString('ja-JP'),
    period: from || to ? `${ymd(from)} 〜 ${ymd(to)}` : '全期間',
    memberCount: members.length,
    mandatoryList,
    attendance,
    testResults,
  }
}
