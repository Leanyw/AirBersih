// app/loading/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoadingPage() {
  const router = useRouter()

  useEffect(() => {
    const checkAndRedirect = async () => {
      // Tunggu 1 detik untuk pastikan semua session sync
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.log('No session found, redirecting to login')
        window.location.href = '/login'
        return
      }

      // Ambil user profile dari Supabase langsung
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()
      
      let redirectPath = '/dashboard' // default untuk warga
      
      if (profile?.role === 'admin') {
        redirectPath = '/dashboard/admin'
      } else if (profile?.role === 'puskesmas') {
        redirectPath = '/dashboard/puskesmas'
      }
      
      console.log('Redirecting to:', redirectPath)
      
      // Hard redirect untuk hindari state issues
      window.location.href = redirectPath
    }

    checkAndRedirect()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Mengarahkan ke dashboard...</p>
      </div>
    </div>
  )
}