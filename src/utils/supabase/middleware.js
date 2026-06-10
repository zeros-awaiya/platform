import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  // Check if Supabase keys are not set or left as defaults (Mock Mode)
  const isMockMode = 
    !supabaseUrl || 
    supabaseUrl.includes('your-supabase-project') ||
    !supabaseAnonKey || 
    supabaseAnonKey === 'your-supabase-anon-key'

  let user = null

  if (isMockMode) {
    const sessionCookie = request.cookies.get('mock-session')
    if (sessionCookie) {
      try {
        user = JSON.parse(sessionCookie.value)
      } catch (e) {
        // ignore JSON parsing errors
      }
    }
  } else {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // IMPORTANT: Do NOT remove this, this is required for Server Components to read the session!
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser()
    user = supabaseUser
  }

  const url = new URL(request.url)
  
  // Exclude static assets, icons, login, and home page from redirection
  const isAuthPage = url.pathname === '/login'
  const isApi = url.pathname.startsWith('/api')
  const isStatic = url.pathname.includes('.') || url.pathname.startsWith('/_next')
  const isHome = url.pathname === '/'

  if (!user && !isAuthPage && !isApi && !isStatic && !isHome) {
    // Redirect unauthenticated user to login page
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (user && isAuthPage) {
    // If logged in, redirect away from login page to dashboard
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return supabaseResponse
}
