// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client untuk browser - menggunakan SSR untuk cookie handling yang proper
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

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

// Di lib/supabase.ts
export const getUserProfile = async (userId: string) => {
  try {
    // Cek di tabel users dulu
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!userError && userData) {
      return userData;
    }

    // Jika tidak ada di users, cek di puskesmas
    const { data: puskesmasData, error: puskesmasError } = await supabase
      .from('puskesmas')
      .select('*')
      .eq('id', userId)
      .single();

    if (!puskesmasError && puskesmasData) {
      return { ...puskesmasData, role: 'puskesmas' };
    }

    // Jika tidak ditemukan di manapun, buat default
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const email = user.email?.toLowerCase() || '';
    let role = 'warga';
    
    if (email.includes('puskesmas') || email.includes('pkm')) {
      role = 'puskesmas';
    } else if (email.includes('admin')) {
      role = 'admin';
    }

    return {
      id: userId,
      email: user.email,
      nama: user.user_metadata?.nama || user.email?.split('@')[0] || 'User',
      role,
      kecamatan: 'Semarang Tengah',
      puskesmas_id: null
    };

  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

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
