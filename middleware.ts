// middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Refresh session jika ada
  await supabase.auth.getSession()

  /* ================= PUBLIC ROUTES ================= */
  const publicPages = ['/', '/login', '/register', '/reset-password', '/auth/callback', '/loading']
  const publicApi = ['/api/kecamatan', '/api/puskesmas', '/api/test', '/api/auth']

  const pathname = request.nextUrl.pathname

  /* ================= API HANDLING ================= */
  if (pathname.startsWith('/api')) {
    const isPublicApi = publicApi.some((p) => pathname.startsWith(p))
    if (!isPublicApi) {
      // Cek session untuk API yang tidak public
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized' },
          { status: 401 }
        )
      }
    }
    return response
  }

  /* ================= PAGE HANDLING ================= */
  // Cek session untuk halaman
  const { data: { session } } = await supabase.auth.getSession()

  // Jika belum login dan bukan public page → redirect ke login
  if (!session && !publicPages.includes(pathname)) {
    console.log('Redirecting to login from:', pathname)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Jika sudah login dan mengakses login page → redirect ke dashboard
  if (session && (pathname === '/login' || pathname === '/register')) {
    console.log('Already logged in, redirecting from:', pathname)
    
    // Redirect ke loading page untuk menentukan role
    return NextResponse.redirect(new URL('/loading', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}