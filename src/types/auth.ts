export interface UserProfile {
  id: string
  email?: string
  nama: string
  role: 'warga' | 'puskesmas' | 'admin'
  kecamatan: string
  puskesmas_id?: string | null
  puskesmas?: {
    id: string
    nama: string
    kecamatan: string
    alamat?: string
    phone?: string
  } | null
}

export interface AuthContextType {
  user: any | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
}