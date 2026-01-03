// Types untuk aplikasi Air Bersih
// Update untuk menghandle null values dari database

export interface Report {
  id: string;
  user_id: string;
  foto_url: string | null;
  bau: string;
  rasa: string;
  warna: string;
  lokasi: string | null;
  keterangan: string | null;
  status: 'pending' | 'diproses' | 'selesai' | 'ditolak';
  feedback: string | null;
  puskesmas_id: string;
  created_at: string | null; // Accept null
  updated_at: string | null; // Accept null
  is_synced: boolean | null;
}

export interface WaterSource {
  id: string;
  nama: string;
  jenis: 'sumur' | 'pdam' | 'mata_air' | 'sungai' | 'embung';
  alamat: string | null; // Accept null
  status: 'aman' | 'rawan' | 'tidak_aman';
  kecamatan: string;
  last_checked: string | null;
  puskesmas_id: string;
  created_at: string | null; // Accept null
  latitude?: number;
  longitude?: number;
}

export interface Notification {
  id: string;
  user_id: string | null;
  puskesmas_id: string | null;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'urgent' | 'update';
  is_read: boolean;
  created_at: string | null; // Accept null
}

export interface User {
  id: string;
  email: string;
  nama: string;
  nik: string | null;
  phone: string | null;
  kecamatan: string;
  kelurahan: string;
  role: 'warga' | 'puskesmas' | 'admin' | string; // Accept string for flexibility
  puskesmas_id: string | null;
  created_at: string | null; // Accept null
  updated_at: string | null; // Accept null
}

export interface Puskesmas {
  id: string;
  nama: string;
  email: string;
  kecamatan: string;
  alamat: string | null;
  phone: string | null;
  created_at: string | null;
}

// Helper type untuk auth user
export interface AuthUser {
  id: string;
  email?: string;
  [key: string]: any;
}

// Form types
export interface ReportFormData {
  bau: string;
  rasa: string;
  warna: string;
  lokasi: string;
  keterangan: string;
}