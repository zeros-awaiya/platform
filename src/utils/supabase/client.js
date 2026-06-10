import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const isMockMode = 
    !process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project') ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'your-supabase-anon-key'

  if (isMockMode) {
    // Return a dummy client on the browser side to prevent 'next/headers' import issues
    return {
      auth: {
        getUser: async () => ({ data: { user: null } }),
        signInWithPassword: async () => ({ error: { message: 'Mock Mode Client Auth Error' } }),
        signOut: async () => ({ error: null })
      },
      from: () => {
        const dummyQuery = () => {
          const self = {
            select: () => self,
            eq: () => self,
            neq: () => self,
            in: () => self,
            or: () => self,
            order: () => self,
            single: async () => ({ data: null, error: null }),
            maybeSingle: async () => ({ data: null, error: null }),
            then: (onfulfilled) => onfulfilled({ data: [], error: null })
          }
          return self
        }
        return dummyQuery()
      }
    }
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
