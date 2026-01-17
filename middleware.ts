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

  // PERBAIKAN: Hanya refresh session, tidak perlu await
  supabase.auth.getSession()

  /* ================= PUBLIC ROUTES ================= */
  // Tambahkan semua route yang boleh diakses tanpa login
  const publicPages = [
    '/',
    '/login', 
    '/register', 
    '/reset-password', 
    '/auth/callback',
    '/api/auth/callback'
  ]
  
  const publicApi = [
    '/api/kecamatan', 
    '/api/puskesmas', 
    '/api/test', 
    '/api/auth'
  ]

  const pathname = request.nextUrl.pathname

  /* ================= SKIP MIDDLEWARE UNTUK PUBLIC ROUTES ================= */
  if (publicPages.includes(pathname) || 
      pathname.startsWith('/_next') || 
      pathname.startsWith('/static') ||
      pathname.match(/\.(ico|png|jpg|jpeg|gif|webp|svg|css|js)$/)) {
    return response
  }

  /* ================= API HANDLING ================= */
  if (pathname.startsWith('/api')) {
    const isPublicApi = publicApi.some((p) => pathname.startsWith(p))
    if (!isPublicApi) {
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
  // Cek session
  const { data: { session } } = await supabase.auth.getSession()
  
  // DEBUG: Log session info
  console.log('Middleware - Path:', pathname)
  console.log('Middleware - Has Session:', !!session)
  if (session) {
    console.log('Middleware - User:', session.user.email)
  }

  // Jika TIDAK ada session dan BUKAN public page → redirect ke login
  if (!session && !publicPages.includes(pathname)) {
    console.log('Redirecting to login from:', pathname)
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Jika ADA session dan mengakses login/register → redirect ke dashboard
  if (session && (pathname === '/login' || pathname === '/register')) {
    console.log('Already logged in, redirecting from:', pathname)
    
    // Ambil role dari database atau dari session
    let redirectPath = '/dashboard' // default
    
    // Coba ambil dari session metadata atau langsung redirect
    // Kita akan biarkan client side redirect di loading page
    const loadingUrl = new URL('/loading', request.url)
    return NextResponse.redirect(loadingUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}