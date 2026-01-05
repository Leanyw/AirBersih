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

const storageBucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'laporan-images';

// Update fungsi uploadImage
export const uploadImage = async (file: File, userId: string): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  
  const { error } = await supabase.storage
    .from(storageBucket) // 🔥 PAKAI VARIABLE
    .upload(fileName, file);

  if (error) throw error;

  const { data } = supabase.storage
    .from(storageBucket) // 🔥 PAKAI VARIABLE
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

// FUNGSI BARU: Cek apakah bucket ada
export const checkBucketExists = async (): Promise<{ exists: boolean; error?: string }> => {
  try {
    console.log('🔍 Checking if bucket exists...');
    
    // Coba list buckets
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error listing buckets:', error);
      return { exists: false, error: error.message };
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'laporan-images');
    console.log('📦 Bucket exists:', bucketExists);
    
    return { exists: bucketExists || false };
  } catch (error: any) {
    console.error('Bucket check failed:', error);
    return { exists: false, error: error.message };
  }
};

// FUNGSI BARU: Simpan sementara di localStorage jika offline
export const saveImageOffline = async (file: File, userId: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      
      // Simpan ke localStorage dengan key unik
      const key = `offline_image_${userId}_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify({
        data: base64data,
        filename: file.name,
        type: file.type,
        timestamp: new Date().toISOString()
      }));
      
      console.log('💾 Image saved offline with key:', key);
      resolve(key); // Return key untuk referensi
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

// FUNGSI BARU: Ambil gambar dari offline storage
export const getOfflineImage = (key: string): string | null => {
  const item = localStorage.getItem(key);
  if (!item) return null;
  
  try {
    const data = JSON.parse(item);
    return data.data; // base64 string
  } catch (error) {
    console.error('Error getting offline image:', error);
    return null;
  }
};