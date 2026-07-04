import fs from 'fs'
import path from 'path'
import { cookies } from 'next/headers'

const DB_PATH = path.join(process.cwd(), 'src/utils/supabase/mock_db.json')

function readDb() {
  try {
    const fileContent = fs.readFileSync(DB_PATH, 'utf8')
    return JSON.parse(fileContent)
  } catch (error) {
    console.error('Error reading mock DB:', error)
    return {}
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8')
  } catch (error) {
    console.error('Error writing mock DB:', error)
  }
}

export async function getMockUser() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('mock-session')
  if (!sessionCookie) return { data: { user: null } }
  
  try {
    const user = JSON.parse(sessionCookie.value)
    return { data: { user } }
  } catch {
    return { data: { user: null } }
  }
}

export async function setMockUser(user) {
  const cookieStore = await cookies()
  if (user) {
    cookieStore.set('mock-session', JSON.stringify(user), { path: '/' })
  } else {
    cookieStore.delete('mock-session')
  }
}

class QueryBuilder {
  constructor(table) {
    this.table = table
    this.filters = []
    this.isSingle = false
    this.orderCol = null
    this.orderAsc = true
    this.countOptions = null
    // insert/update/upsert/delete は実クライアント同様、await 時に実行する
    // （旧実装は即時実行だったため .update(x).eq(...) の順序で壊れていた）
    this.pendingOp = null
  }

  select(fields = '*', options = null) {
    if (options && options.count) {
      this.countOptions = options.count
    }
    return this
  }

  limit(num) {
    // Mock limit (no-op)
    return this
  }

  eq(col, val) {
    this.filters.push({ type: 'eq', col, val })
    return this
  }

  neq(col, val) {
    this.filters.push({ type: 'neq', col, val })
    return this
  }

  gte(col, val) {
    this.filters.push({ type: 'gte', col, val })
    return this
  }

  lte(col, val) {
    this.filters.push({ type: 'lte', col, val })
    return this
  }

  is(col, val) {
    this.filters.push({ type: 'is', col, val })
    return this
  }

  or(filterStr) {
    this.filters.push({ type: 'or', filterStr })
    return this
  }

  in(col, valArray) {
    this.filters.push({ type: 'in', col, val: valArray })
    return this
  }

  order(col, { ascending = true } = {}) {
    this.orderCol = col
    this.orderAsc = ascending
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  maybeSingle() {
    this.isSingle = true
    return this
  }

  // 1行が現在の全フィルタに一致するか（読み書き共通）
  matchesFilters(row) {
    for (const filter of this.filters) {
      if (filter.type === 'eq' && row[filter.col] !== filter.val) return false
      if (filter.type === 'neq' && row[filter.col] === filter.val) return false
      if (filter.type === 'in' && !filter.val.includes(row[filter.col])) return false
      if (filter.type === 'gte' && !(row[filter.col] >= filter.val)) return false
      if (filter.type === 'lte' && !(row[filter.col] <= filter.val)) return false
      // is(null) は「値なし」扱い（undefined のカラムも null と同様にマッチ）
      if (filter.type === 'is') {
        if (filter.val === null ? row[filter.col] != null : row[filter.col] !== filter.val) return false
      }
      if (filter.type === 'or') {
        // Mock parsing for orgId OR null filters
        // e.g. "organization_id.eq.UUID,organization_id.is.null"
        const orgIdMatch = filter.filterStr.match(/organization_id\.eq\.([a-zA-Z0-9-]+)/)
        const deptIdMatch = filter.filterStr.match(/department_id\.eq\.([a-zA-Z0-9-]+)/)

        if (orgIdMatch) {
          const orgId = orgIdMatch[1]
          if (!(row.organization_id === orgId || row.organization_id === null)) return false
        } else if (deptIdMatch) {
          const deptId = deptIdMatch[1]
          if (!(row.department_id === deptId || row.department_id === null)) return false
        }
      }
    }
    return true
  }

  async exec() {
    if (this.pendingOp) {
      return this.execWrite()
    }

    const db = readDb()
    let data = db[this.table] || []

    // Apply filters
    data = data.filter(row => this.matchesFilters(row))

    // Apply order
    if (this.orderCol) {
      data = [...data].sort((a, b) => {
        const valA = a[this.orderCol]
        const valB = b[this.orderCol]
        if (valA < valB) return this.orderAsc ? -1 : 1
        if (valA > valB) return this.orderAsc ? 1 : -1
        return 0
      })
    }

    // Mock joins/relations
    if (this.table === 'users') {
      data = data.map(u => {
        const org = db.organizations.find(o => o.id === u.organization_id)
        const dept = db.departments.find(d => d.id === u.department_id)
        const ulps = (db.user_learning_paths || []).filter(ulp => ulp.user_id === u.id)
        return {
          ...u,
          organizations: org ? { name: org.name } : null,
          departments: dept ? { name: dept.name } : null,
          user_learning_paths: ulps
        }
      })
    } else if (this.table === 'courses') {
      data = data.map(c => {
        const cat = db.categories.find(cat => cat.id === c.category_id)
        const lessons = (db.lessons || []).filter(l => l.course_id === c.id)
        return {
          ...c,
          categories: cat ? { name: cat.name } : null,
          lessons: lessons
        }
      })
    } else if (this.table === 'course_visibility') {
      data = data.map(cv => {
        const c = db.courses.find(c => c.id === cv.course_id)
        const cat = c ? db.categories.find(cat => cat.id === c.category_id) : null
        return {
          ...cv,
          courses: c ? { ...c, categories: cat ? { name: cat.name } : null } : null
        }
      })
    } else if (this.table === 'learning_paths') {
      data = data.map(lp => {
        const lpc = (db.learning_path_courses || []).filter(item => item.learning_path_id === lp.id)
        const lpcWithCourses = lpc.map(item => {
          const c = db.courses.find(c => c.id === item.course_id)
          const cat = c ? db.categories.find(cat => cat.id === c.category_id) : null
          return {
            ...item,
            courses: c ? { ...c, categories: cat ? { name: cat.name } : null } : null
          }
        })
        const vis = (db.learning_path_visibility || []).filter(v => v.learning_path_id === lp.id)
        return {
          ...lp,
          learning_path_courses: lpcWithCourses,
          learning_path_visibility: vis
        }
      })
    } else if (this.table === 'learning_path_visibility') {
      data = data.map(v => {
        const lp = db.learning_paths.find(item => item.id === v.learning_path_id)
        let lpData = null
        if (lp) {
          const lpc = (db.learning_path_courses || []).filter(item => item.learning_path_id === lp.id)
          const lpcWithCourses = lpc.map(item => {
            const c = db.courses.find(c => c.id === item.course_id)
            const cat = c ? db.categories.find(cat => cat.id === c.category_id) : null
            return {
              ...item,
              courses: c ? { ...c, categories: cat ? { name: cat.name } : null } : null
            }
          })
          lpData = { ...lp, learning_path_courses: lpcWithCourses }
        }
        return {
          ...v,
          learning_paths: lpData
        }
      })
    } else if (this.table === 'user_learning_paths') {
      data = data.map(ulp => {
        const lp = db.learning_paths.find(item => item.id === ulp.learning_path_id)
        let lpData = null
        if (lp) {
          const lpc = (db.learning_path_courses || []).filter(item => item.learning_path_id === lp.id)
          const lpcWithCourses = lpc.map(item => {
            const c = db.courses.find(c => c.id === item.course_id)
            const cat = c ? db.categories.find(cat => cat.id === c.category_id) : null
            return {
              ...item,
              courses: c ? { ...c, categories: cat ? { name: cat.name } : null } : null
            }
          })
          lpData = { ...lp, learning_path_courses: lpcWithCourses }
        }
        return {
          ...ulp,
          learning_paths: lpData
        }
      })
    } else if (this.table === 'enrollments') {
      data = data.map(e => {
        const c = db.courses.find(c => c.id === e.course_id)
        const cat = c ? db.categories.find(cat => cat.id === c.category_id) : null
        const u = db.users.find(u => u.id === e.user_id)
        return {
          ...e,
          courses: c ? { ...c, categories: cat ? { name: cat.name } : null } : null,
          users: u || null
        }
      })
    } else if (this.table === 'mandatory_courses') {
      data = data.map(mc => {
        const c = db.courses.find(c => c.id === mc.course_id)
        const cat = c ? db.categories.find(cat => cat.id === c.category_id) : null
        const org = db.organizations.find(o => o.id === mc.organization_id)
        const dept = db.departments.find(d => d.id === mc.department_id)
        return {
          ...mc,
          courses: c ? { ...c, categories: cat ? { name: cat.name } : null } : null,
          organizations: org ? { name: org.name } : null,
          departments: dept ? { name: dept.name } : null
        }
      })
    }

    if (this.isSingle) {
      return { data: data[0] || null, error: null, count: data.length > 0 ? 1 : 0 }
    }

    return { data, error: null, count: data.length }
  }

  then(onfulfilled, onrejected) {
    return this.exec().then(onfulfilled, onrejected)
  }

  // 書き込みは実クライアント同様チェーン可能（.insert().select().single() 等）。
  // 実行は await（then）時に execWrite() で行う。
  insert(insertData) {
    this.pendingOp = { type: 'insert', rows: insertData }
    return this
  }

  update(updateData) {
    this.pendingOp = { type: 'update', data: updateData }
    return this
  }

  upsert(upsertData, options = null) {
    this.pendingOp = { type: 'upsert', rows: upsertData, options }
    return this
  }

  delete() {
    this.pendingOp = { type: 'delete' }
    return this
  }

  async execWrite() {
    const op = this.pendingOp
    const db = readDb()
    const tableData = db[this.table] || []

    if (op.type === 'insert') {
      const inputRows = Array.isArray(op.rows) ? op.rows : [op.rows]

      // lesson_progress は本番の UNIQUE(user_id, lesson_id) を模倣（コードが 23505 を握る前提のため）
      if (this.table === 'lesson_progress') {
        const dup = inputRows.find(row =>
          tableData.some(r => r.user_id === row.user_id && r.lesson_id === row.lesson_id)
        )
        if (dup) {
          return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint (mock)' } }
        }
      }

      // id が undefined/null のまま来た場合はキーごと除去（生成IDの上書きを防ぐ）
      const newRows = inputRows.map(row => {
        const base = { ...row }
        if (base.id === undefined || base.id === null) delete base.id
        return {
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...base
        }
      })

      db[this.table] = [...tableData, ...newRows]
      writeDb(db)

      // Trigger mock course progress calculation if this was inserting lesson_progress
      if (this.table === 'lesson_progress') {
        for (const row of newRows) {
          await mockTriggerEnrollmentProgressUpdate(db, row.user_id, row.lesson_id)
        }
      }

      const data = this.isSingle ? (newRows[0] || null) : newRows
      return { data, error: null }
    }

    if (op.type === 'update') {
      let updatedCount = 0
      db[this.table] = tableData.map(row => {
        if (this.matchesFilters(row)) {
          updatedCount++
          return { ...row, ...op.data, updated_at: new Date().toISOString() }
        }
        return row
      })
      writeDb(db)
      return { data: null, error: null, count: updatedCount }
    }

    if (op.type === 'upsert') {
      const inputRows = Array.isArray(op.rows) ? op.rows : [op.rows]
      const conflictCols = op.options?.onConflict
        ? op.options.onConflict.split(',').map(s => s.trim())
        : ['id']

      let rows = [...tableData]
      for (const row of inputRows) {
        const idx = rows.findIndex(existing =>
          conflictCols.every(col => row[col] !== undefined && existing[col] === row[col])
        )
        if (idx !== -1) {
          rows[idx] = { ...rows[idx], ...row, updated_at: new Date().toISOString() }
        } else {
          const base = { ...row }
          if (base.id === undefined || base.id === null) delete base.id
          rows.push({
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...base
          })
        }
      }
      db[this.table] = rows
      writeDb(db)
      return { data: null, error: null }
    }

    if (op.type === 'delete') {
      const matchedRows = tableData.filter(row => this.matchesFilters(row))
      db[this.table] = tableData.filter(row => !this.matchesFilters(row))
      writeDb(db)

      // Trigger mock course progress calculation if this was deleting lesson_progress
      if (this.table === 'lesson_progress') {
        for (const row of matchedRows) {
          await mockTriggerEnrollmentProgressUpdate(db, row.user_id, row.lesson_id)
        }
      }

      // lessons 削除時: FKカスケード相当（進捗・設問の除去）＋
      // trg_recalc_enrollments_after_lesson_delete 相当（該当コースの進捗率再計算）
      if (this.table === 'lessons' && matchedRows.length > 0) {
        const deletedIds = matchedRows.map(r => r.id)
        db.lesson_progress = (db.lesson_progress || []).filter(lp => !deletedIds.includes(lp.lesson_id))
        db.quiz_questions = (db.quiz_questions || []).filter(q => !deletedIds.includes(q.lesson_id))
        writeDb(db)

        const courseIds = [...new Set(matchedRows.map(r => r.course_id))]
        for (const courseId of courseIds) {
          mockRecalcCourseEnrollments(db, courseId)
        }
      }

      return { data: null, error: null }
    }

    return { data: null, error: { message: `unsupported mock operation: ${op.type}` } }
  }
}

// trg_recalc_enrollments_after_lesson_delete 相当:
// レッスン削除後、そのコースの全受講者の enrollments を現構成で再計算する。
// %は本番トリガーと同じ整数除算（切り捨て）。completed_at は降格時も保持。
function mockRecalcCourseEnrollments(db, courseId) {
  const courseLessonIds = (db.lessons || []).filter(l => l.course_id === courseId).map(l => l.id)
  const total = courseLessonIds.length

  db.enrollments = (db.enrollments || []).map(e => {
    if (e.course_id !== courseId) return e
    const done = (db.lesson_progress || []).filter(
      lp => lp.user_id === e.user_id && courseLessonIds.includes(lp.lesson_id)
    ).length
    const pct = total > 0 ? Math.floor((done * 100) / total) : 0
    const status = pct === 100 ? 'completed' : pct > 0 ? 'in_progress' : 'not_started'
    return {
      ...e,
      progress_percent: pct,
      status,
      completed_at: pct === 100 && e.status !== 'completed' ? new Date().toISOString() : e.completed_at,
    }
  })
  writeDb(db)
}

// Mock Postgres trigger function for course progress calculation
async function mockTriggerEnrollmentProgressUpdate(db, userId, lessonId) {
  // Find course_id for this lesson
  const lesson = db.lessons.find(l => l.id === lessonId)
  if (!lesson) return

  const courseId = lesson.course_id
  const totalLessons = db.lessons.filter(l => l.course_id === courseId).length

  // Find completed lesson IDs by this user in this course
  const courseLessonIds = db.lessons.filter(l => l.course_id === courseId).map(l => l.id)
  const completedCount = db.lesson_progress.filter(lp => lp.user_id === userId && courseLessonIds.includes(lp.lesson_id)).length

  // Calculate percent
  const percent = totalLessons > 0 ? Math.round((completedCount * 100) / totalLessons) : 0
  const status = percent === 100 ? 'completed' : percent > 0 ? 'in_progress' : 'not_started'

  // Update enrollments array
  let enrollments = db.enrollments || []
  const existingIdx = enrollments.findIndex(e => e.user_id === userId && e.course_id === courseId)

  if (existingIdx !== -1) {
    enrollments[existingIdx] = {
      ...enrollments[existingIdx],
      status,
      progress_percent: percent,
      completed_at: status === 'completed' ? new Date().toISOString() : enrollments[existingIdx].completed_at,
      last_accessed_at: new Date().toISOString()
    }
  } else {
    enrollments.push({
      id: crypto.randomUUID(),
      user_id: userId,
      course_id: courseId,
      status,
      progress_percent: percent,
      started_at: new Date().toISOString(),
      completed_at: status === 'completed' ? new Date().toISOString() : null,
      last_accessed_at: new Date().toISOString()
    })
  }

  db.enrollments = enrollments
  writeDb(db)
}

export function createMockClient() {
  return {
    auth: {
      getUser: getMockUser,
      signInWithPassword: async ({ email, password }) => {
        const db = readDb()
        const user = db.users.find(u => u.email === email)
        if (!user) return { error: { message: 'メールアドレスまたはパスワードが正しくありません。' } }
        if (!user.is_active) return { error: { message: 'このアカウントは無効化されています。' } }
        
        const authUserObj = { id: user.id, email: user.email, user_metadata: { name: user.name, organization_id: user.organization_id } }
        await setMockUser(authUserObj)
        return { data: { user: authUserObj }, error: null }
      },
      signOut: async () => {
        await setMockUser(null)
        return { error: null }
      },
      // Admin mock client actions (called inside Server Actions using Service Role Client)
      admin: {
        createUser: async ({ email, password, user_metadata }) => {
          const newUserId = crypto.randomUUID()
          const authUserObj = {
            id: newUserId,
            email,
            user_metadata
          }
          return { data: { user: authUserObj }, error: null }
        },
        deleteUser: async (id) => {
          return { error: null }
        }
      }
    },
    from: (table) => {
      return new QueryBuilder(table)
    }
  }
}
