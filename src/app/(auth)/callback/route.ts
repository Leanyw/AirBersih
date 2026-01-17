// app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    try {
      // Construct the redirect URL dengan code
      const redirectUrl = new URL('/api/auth/callback', requestUrl.origin)
      redirectUrl.searchParams.set('code', code)
      
      // Redirect ke API handler untuk memproses code
      return NextResponse.redirect(redirectUrl)
    } catch (error) {
      console.error('Auth callback exception:', error)
    }
  }

  // Jika tidak ada code atau error, redirect ke login
  return NextResponse.redirect(new URL('/login', request.url))
}