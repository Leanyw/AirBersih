// app/loading/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoadingPage() {
  const router = useRouter()

  useEffect(() => {
    const checkAndRedirect = async () => {
      try {
        // Tunggu 1 detik untuk memastikan session sudah tersinkronisasi
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        console.log('Loading page - Session check:', { 
          hasSession: !!session, 
          error,
          userEmail: session?.user?.email 
        })
        
        if (!session) {
          console.log('Loading page - No session, redirecting to login')
          router.replace('/login')
          return
        }

        // Get user profile untuk menentukan role
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()
        
        console.log('Loading page - Profile:', { profile, profileError })
        
        let redirectPath = '/dashboard'
        
        if (profile?.role === 'admin') {
          redirectPath = '/dashboard/admin'
        } else if (profile?.role === 'puskesmas') {
          redirectPath = '/dashboard/puskesmas'
        }
        
        console.log('Loading page - Redirecting to:', redirectPath)
        router.replace(redirectPath)
      } catch (error) {
        console.error('Loading page error:', error)
        router.replace('/login')
      }
    }

    checkAndRedirect()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Mengalihkan...</p>
      </div>
    </div>
  )
}