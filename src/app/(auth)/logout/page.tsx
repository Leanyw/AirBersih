'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.signOut().then(() => {
      router.replace('/login')
    })
  }, [])

  return <p>Logging out...</p>
}
