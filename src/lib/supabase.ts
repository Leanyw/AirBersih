import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Helper function untuk auth - FIXED
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

// Helper untuk upload gambar
export const uploadImage = async (file: File, userId: string): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  
  const { error } = await supabase.storage
    .from('laporan-images')
    .upload(fileName, file);

  if (error) throw error;

  const { data } = supabase.storage
    .from('laporan-images')
    .getPublicUrl(fileName);

  return data.publicUrl;
};

// Test function untuk cek koneksi
export const testSupabaseConnection = async () => {
  try {
    console.log('🔄 Testing Supabase connection...');
    
    // Test query sederhana
    const { data, error } = await supabase
      .from('tutorials')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection error:', error);
      return { success: false, error };
    }
    
    console.log('✅ Supabase connected successfully');
    return { success: true, data };
  } catch (err) {
    console.error('❌ Supabase test failed:', err);
    return { success: false, error: err };
  }
};