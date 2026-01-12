import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Untuk Server Components dan API Routes
export async function createSupabaseServerClient() {
  const cookieStore = await cookies() // TAMBAH AWAIT!
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Cookie bisa read-only di middleware
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Cookie bisa read-only di middleware
          }
        },
      },
    }
  )
}

// Get user in server context
export async function getServerUser() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Server auth error:', error)
      return null
    }
    
    return user
  } catch (error) {
    console.error('Error getting server user:', error)
    return null
  }
}