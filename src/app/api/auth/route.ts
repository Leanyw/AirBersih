// app/api/auth/callback/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.json(
      { error: 'No code provided' },
      { status: 400 }
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  try {
    // Buat client supabase tanpa cookies
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Tukar code untuk session
    const { data: { session }, error: authError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (authError) {
      console.error('Auth callback error:', authError)
      const redirectUrl = new URL('/login', requestUrl.origin)
      redirectUrl.searchParams.set('error', authError.message)
      return NextResponse.redirect(redirectUrl)
    }

    if (session) {
      console.log('Auth successful for user:', session.user.email)
      
      // Dapatkan role user
      let userRole = 'warga'
      
      try {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (profile && !profileError) {
          userRole = profile.role
        }
      } catch (error) {
        console.log('Error getting user profile, using default role:', error)
      }

      // Redirect berdasarkan role
      let redirectPath = '/dashboard'
      if (userRole === 'admin') {
        redirectPath = '/dashboard/admin'
      } else if (userRole === 'puskesmas') {
        redirectPath = '/dashboard/puskesmas'
      }

      // Buat response redirect
      const redirectResponse = NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
      
      // Set access token sebagai cookie
      if (session.access_token) {
        redirectResponse.cookies.set('sb-access-token', session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 1 week
          path: '/',
        })
      }

      // Set refresh token sebagai cookie
      if (session.refresh_token) {
        redirectResponse.cookies.set('sb-refresh-token', session.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 1 week
          path: '/',
        })
      }

      return redirectResponse
    }
  } catch (error: any) {
    console.error('Auth callback exception:', error)
    const redirectUrl = new URL('/login', requestUrl.origin)
    redirectUrl.searchParams.set('error', error.message || 'auth_failed')
    return NextResponse.redirect(redirectUrl)
  }

  // Fallback redirect ke login
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}