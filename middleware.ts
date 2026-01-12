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

  const { data: { session } } = await supabase.auth.getSession()

  /* ================= PUBLIC ROUTES ================= */
  const publicPages = ['/', '/login', '/register', '/reset-password', '/auth/callback']
  const publicApi = ['/api/kecamatan', '/api/puskesmas', '/api/test', '/api/auth']

  const pathname = request.nextUrl.pathname

  /* ================= API HANDLING ================= */
  if (pathname.startsWith('/api')) {
    const isPublicApi = publicApi.some((p) => pathname.startsWith(p))
    if (!isPublicApi && !session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    return response
  }

  /* ================= PAGE HANDLING ================= */
  // Belum login → lempar ke login
  if (!session && !publicPages.includes(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  /* ================= REDIRECT DARI LOGIN ================= */
  if (session && pathname === '/login') {
    // OPTIMASI: Langsung redirect tanpa cek database dulu
    // User akan di-redirect ke dashboard default, lalu client side akan redirect ke halaman yang benar
    
    // Redirect ke dashboard sementara
    return NextResponse.redirect(new URL('/loading', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}