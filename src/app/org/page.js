import { createClient } from '@/utils/supabase/server'
import OrgDashboardClientPage from './OrgDashboardClientPage'

export const dynamic = 'force-dynamic'

export default async function OrgDashboard() {
  const supabase = await createClient()

  let userCount = 0
  let deptCount = 0
  let completedEnrollments = 0
  let orgName = ''
  
  let departmentStats = []
  let courseStats = []
  let alertUsers = []
  let allProgressData = []
  let notificationsList = []

  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('organization_id, organizations(name)')
        .eq('id', user.id)
        .single()

      if (profile) {
        orgName = profile.organizations?.name || ''
        const orgId = profile.organization_id

        // 1. 組織内の全メンバー (LEARNERのみ) を取得
        const { data: orgUsers } = await supabase
          .from('users')
          .select('*')
          .eq('organization_id', orgId)
          .eq('role', 'LEARNER')
        
        userCount = orgUsers?.length || 0

        // 2. 組織内の全部署を取得
        const { data: orgDepts } = await supabase
          .from('departments')
          .select('*')
          .eq('organization_id', orgId)
        
        deptCount = orgDepts?.length || 0

        // 3. 組織内の全受講状況を取得
        const { data: allEnrollments } = await supabase
          .from('enrollments')
          .select('*')
        
        const orgEnrollments = (allEnrollments || []).filter(e => e.users && e.users.organization_id === orgId)
        completedEnrollments = orgEnrollments.filter(e => e.status === 'completed').length

        // 4. 組織に割り当てられている必須受講コースを取得
        const { data: allMandatory } = await supabase
          .from('mandatory_courses')
          .select('*')
          .eq('organization_id', orgId)

        // 5. 組織で閲覧可能なコースの取得
        const { data: allVisibilities } = await supabase
          .from('course_visibility')
          .select('*')
          .eq('organization_id', orgId)
        const visibleCourseIds = (allVisibilities || []).map(v => v.course_id)
        
        const { data: allCourses } = await supabase
          .from('courses')
          .select('*')
        const visibleCourses = (allCourses || []).filter(c => visibleCourseIds.includes(c.id))

        // --- 部署別集計 ---
        departmentStats = (orgDepts || []).map(dept => {
          const deptUsers = (orgUsers || []).filter(u => u.department_id === dept.id)
          const deptUserIds = deptUsers.map(u => u.id)
          const deptEnrollments = orgEnrollments.filter(e => deptUserIds.includes(e.user_id))
          
          let avgProgress = 0
          if (deptEnrollments.length > 0) {
            const sum = deptEnrollments.reduce((acc, curr) => acc + (curr.progress_percent || 0), 0)
            avgProgress = Math.round(sum / deptEnrollments.length)
          }

          return {
            id: dept.id,
            name: dept.name,
            userCount: deptUsers.length,
            avgProgress
          }
        })

        // 部署なし（未配属）
        const noDeptUsers = (orgUsers || []).filter(u => !u.department_id)
        if (noDeptUsers.length > 0) {
          const noDeptUserIds = noDeptUsers.map(u => u.id)
          const noDeptEnrollments = orgEnrollments.filter(e => noDeptUserIds.includes(e.user_id))
          let avgProgress = 0
          if (noDeptEnrollments.length > 0) {
            const sum = noDeptEnrollments.reduce((acc, curr) => acc + (curr.progress_percent || 0), 0)
            avgProgress = Math.round(sum / noDeptEnrollments.length)
          }
          departmentStats.push({
            id: 'unassigned',
            name: '未配属',
            userCount: noDeptUsers.length,
            avgProgress
          })
        }

        // --- コース別集計 ---
        courseStats = visibleCourses.map(course => {
          const courseEnrollments = orgEnrollments.filter(e => e.course_id === course.id)
          const startedCount = courseEnrollments.length
          const completedCount = courseEnrollments.filter(e => e.status === 'completed').length
          const completionRate = userCount > 0 ? Math.round((completedCount * 100) / userCount) : 0

          return {
            id: course.id,
            title: course.title,
            startedCount,
            completedCount,
            completionRate
          }
        })

        // --- 未受講・遅延警告リスト ---
        alertUsers = []
        if (allMandatory && allMandatory.length > 0) {
          allMandatory.forEach(mc => {
            const course = visibleCourses.find(c => c.id === mc.course_id)
            if (!course) return

            const targetUsers = mc.department_id 
              ? (orgUsers || []).filter(u => u.department_id === mc.department_id)
              : (orgUsers || [])

            targetUsers.forEach(u => {
              const enrollment = orgEnrollments.find(e => e.user_id === u.id && e.course_id === mc.course_id)
              const isCompleted = enrollment?.status === 'completed'
              const progress = enrollment?.progress_percent || 0

              const dueDate = new Date(mc.due_date)
              const now = new Date()
              const isOverdue = now > dueDate && !isCompleted
              const isNearDue = !isCompleted && !isOverdue && (dueDate - now) < (7 * 24 * 60 * 60 * 1000)

              if (!isCompleted && (isOverdue || isNearDue || progress === 0)) {
                const dept = orgDepts?.find(d => d.id === u.department_id)
                alertUsers.push({
                  userId: u.id,
                  userName: u.name,
                  userEmail: u.email,
                  deptName: dept ? dept.name : '未配属',
                  courseTitle: course.title,
                  progress,
                  dueDate: mc.due_date,
                  status: isOverdue ? 'overdue' : isNearDue ? 'neardue' : 'not_started'
                })
              }
            })
          })
        }

        // --- CSVデータ ---
        allProgressData = (orgUsers || []).flatMap(u => {
          const dept = orgDepts?.find(d => d.id === u.department_id)
          const deptName = dept ? dept.name : '未配属'

          return visibleCourses.map(course => {
            const enrollment = orgEnrollments.find(e => e.user_id === u.id && e.course_id === course.id)
            const progress = enrollment ? enrollment.progress_percent : 0
            let status = '未着手'
            if (enrollment) {
              status = enrollment.status === 'completed' ? '修了' : '受講中'
            }

            return {
              userName: u.name,
              deptName: deptName,
              userEmail: u.email,
              courseTitle: course.title,
              progress: `${progress}%`,
              status: status,
              startedAt: enrollment?.started_at ? new Date(enrollment.started_at).toLocaleDateString('ja-JP') : '-',
              completedAt: enrollment?.completed_at ? new Date(enrollment.completed_at).toLocaleDateString('ja-JP') : '-'
            }
          })
        })
        // --- 通知（お知らせ）の取得 ---
        const { data: allNotifications } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })

        notificationsList = (allNotifications || [])
          .filter(n => n.organization_id === null || n.organization_id === orgId)
          .slice(0, 3)
      }
    }
  } catch (error) {
    console.error('Failed to fetch org stats:', error)
  }

  return (
    <OrgDashboardClientPage
      orgName={orgName}
      userCount={userCount}
      deptCount={deptCount}
      completedEnrollments={completedEnrollments}
      departmentStats={departmentStats}
      courseStats={courseStats}
      alertUsers={alertUsers}
      allProgressData={allProgressData}
      notifications={notificationsList}
    />
  )
}
