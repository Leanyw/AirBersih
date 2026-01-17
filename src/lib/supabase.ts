// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client untuk server components (tanpa cookies)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client untuk server actions/API routes dengan cookies
export const createSupabaseServerClient = (cookies: any) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Cookie: cookies,
      },
    },
  })
}

// Helper functions - CLIENT SIDE ONLY
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        puskesmas (*)
      `)
      .eq('id', userId)
      .single()

    if (error) {
      console.warn('User profile not found, trying puskesmas table...')
      
      // Try puskesmas table
      const { data: puskesmasData, error: puskesmasError } = await supabase
        .from('puskesmas')
        .select('*')
        .eq('id', userId)
        .single()

      if (puskesmasError) {
        // Create default profile from auth
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return null

        const email = user.email?.toLowerCase() || ''
        let role = 'warga'
        
        if (email.includes('puskesmas') || email.includes('pkm')) {
          role = 'puskesmas'
        } else if (email.includes('admin')) {
          role = 'admin'
        }

        return {
          id: userId,
          email: user.email,
          nama: user.user_metadata?.nama || user.email?.split('@')[0] || 'User',
          role,
          kecamatan: 'Semarang Tengah',
          puskesmas_id: null
        }
      }

      return {
        ...puskesmasData,
        role: 'puskesmas'
      }
    }

    return data
  } catch (error) {
    console.error('Error getting user profile:', error)
    return null
  }
}

export const getPuskesmasByKecamatan = async (kecamatan: string) => {
  try {
    const { data, error } = await supabase
      .from('puskesmas')
      .select('*')
      .eq('kecamatan', kecamatan)
      .single()

    if (error) {
      console.error('Error getting puskesmas:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getPuskesmasByKecamatan:', error)
    return null
  }
}

export const getAllKecamatan = async () => {
  try {
    const { data, error } = await supabase
      .from('puskesmas')
      .select('kecamatan')
      .order('kecamatan')

    if (error) {
      console.error('Error getting kecamatan:', error)
      return []
    }

    return data.map(p => p.kecamatan)
  } catch (error) {
    console.error('Error in getAllKecamatan:', error)
    return []
  }
}

// Upload image
export const uploadImage = async (file: File, userId: string) => {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`
    
    const { error } = await supabase.storage
      .from('air-bersih')
      .upload(fileName, file)

    if (error) throw error

    const { data } = supabase.storage
      .from('air-bersih')
      .getPublicUrl(fileName)

    return data.publicUrl
  } catch (error) {
    console.error('Error uploading image:', error)
    throw error
  }
}
