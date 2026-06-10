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

  async exec() {
    const db = readDb()
    let data = db[this.table] || []

    // Apply filters
    for (const filter of this.filters) {
      if (filter.type === 'eq') {
        data = data.filter(row => row[filter.col] === filter.val)
      } else if (filter.type === 'neq') {
        data = data.filter(row => row[filter.col] !== filter.val)
      } else if (filter.type === 'in') {
        data = data.filter(row => filter.val.includes(row[filter.col]))
      } else if (filter.type === 'or') {
        // Mock parsing for orgId OR null filters
        // e.g. "organization_id.eq.UUID,organization_id.is.null"
        const orgIdMatch = filter.filterStr.match(/organization_id\.eq\.([a-zA-Z0-9-]+)/)
        const deptIdMatch = filter.filterStr.match(/department_id\.eq\.([a-zA-Z0-9-]+)/)
        
        if (orgIdMatch) {
          const orgId = orgIdMatch[1]
          data = data.filter(row => row.organization_id === orgId || row.organization_id === null)
        } else if (deptIdMatch) {
          const deptId = deptIdMatch[1]
          data = data.filter(row => row.department_id === deptId || row.department_id === null)
        }
      }
    }

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
        return {
          ...u,
          organizations: org ? { name: org.name } : null,
          departments: dept ? { name: dept.name } : null
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
        return {
          ...lp,
          learning_path_courses: lpcWithCourses
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

  async insert(insertData) {
    const db = readDb()
    const tableData = db[this.table] || []
    
    // Check constraint validation
    const newRows = (Array.isArray(insertData) ? insertData : [insertData]).map(row => {
      const newRow = {
        id: row.id || crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...row
      }
      return newRow
    })

    db[this.table] = [...tableData, ...newRows]
    writeDb(db)

    // Trigger mock course progress calculation if this was inserting lesson_progress
    if (this.table === 'lesson_progress') {
      await mockTriggerEnrollmentProgressUpdate(db, newRows[0].user_id, newRows[0].lesson_id)
    }

    return { data: newRows, error: null }
  }

  async update(updateData) {
    const db = readDb()
    let tableData = db[this.table] || []
    let updatedCount = 0

    tableData = tableData.map(row => {
      let matches = true
      for (const filter of this.filters) {
        if (filter.type === 'eq' && row[filter.col] !== filter.val) matches = false
        if (filter.type === 'neq' && row[filter.col] === filter.val) matches = false
      }
      if (matches) {
        updatedCount++
        return { ...row, ...updateData, updated_at: new Date().toISOString() }
      }
      return row
    })

    db[this.table] = tableData
    writeDb(db)
    return { data: null, error: null, count: updatedCount }
  }

  async delete() {
    const db = readDb()
    let tableData = db[this.table] || []
    
    const matchedRows = tableData.filter(row => {
      let matches = true
      for (const filter of this.filters) {
        if (filter.type === 'eq' && row[filter.col] !== filter.val) matches = false
        if (filter.type === 'neq' && row[filter.col] === filter.val) matches = false
      }
      return matches
    })

    const remaining = tableData.filter(row => {
      let matches = true
      for (const filter of this.filters) {
        if (filter.type === 'eq' && row[filter.col] !== filter.val) matches = false
        if (filter.type === 'neq' && row[filter.col] === filter.val) matches = false
      }
      return !matches
    })

    db[this.table] = remaining
    writeDb(db)

    // Trigger mock course progress calculation if this was deleting lesson_progress
    if (this.table === 'lesson_progress' && matchedRows.length > 0) {
      await mockTriggerEnrollmentProgressUpdate(db, matchedRows[0].user_id, matchedRows[0].lesson_id)
    }

    return { data: null, error: null }
  }
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
