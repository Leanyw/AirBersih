import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase';

// Middleware untuk proteksi API endpoints
export async function authMiddleware(request: NextRequest) {
  // Skip middleware untuk public endpoints
  const publicPaths = ['/api/kecamatan', '/api/puskesmas', '/api/auth'];
  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Check authentication untuk protected endpoints
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Unauthorized', 
        message: 'Silakan login terlebih dahulu' 
      },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

// Configure which paths to protect
export const config = {
  matcher: [
    '/api/reports/:path*',
    '/api/dashboard/:path*',
    '/api/users/:path*',
    '/api/notifications/:path*',
  ],
};