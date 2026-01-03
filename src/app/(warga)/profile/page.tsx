'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  Edit, 
  Camera,
  Shield,
  Clock,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';

type UserProfile = {
  id: string;
  nama: string;
  email: string;
  nik: string;
  phone: string;
  kecamatan: string;
  kelurahan: string;
  profile_picture: string | null;
  created_at: string;
  role: string;
};

type Puskesmas = {
  id: string;
  nama: string;
  email: string;
  alamat: string;
  phone: string;
  kecamatan: string;
};

type ReportStats = {
  total: number;
  pending: number;
  diproses: number;
  selesai: number;
};

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [puskesmas, setPuskesmas] = useState<Puskesmas | null>(null);
  const [stats, setStats] = useState<ReportStats>({
    total: 0,
    pending: 0,
    diproses: 0,
    selesai: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    } else {
      router.push('/login');
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      setIsLoading(true);

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch puskesmas berdasarkan kecamatan
      const { data: puskesmasData, error: puskesmasError } = await supabase
        .from('puskesmas')
        .select('*')
        .eq('kecamatan', profileData.kecamatan)
        .single();

      if (!puskesmasError && puskesmasData) {
        setPuskesmas(puskesmasData);
      }

      // Fetch report statistics
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select('status')
        .eq('user_id', user?.id);

      if (!reportsError) {
        const stats: ReportStats = {
          total: reports?.length || 0,
          pending: reports?.filter(r => r.status === 'pending').length || 0,
          diproses: reports?.filter(r => r.status === 'diproses').length || 0,
          selesai: reports?.filter(r => r.status === 'selesai').length || 0
        };
        setStats(stats);
      }

    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Gagal memuat data profil');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validasi file
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar');
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB
      toast.error('Ukuran maksimal foto 2MB');
      return;
    }

    setIsUploading(true);

    try {
      // Upload ke Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `profiles/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      // Dapatkan URL public
      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(fileName);

      // Update profile di database
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_picture: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update state
      setProfile(prev => prev ? { ...prev, profile_picture: publicUrl } : null);
      toast.success('Foto profil berhasil diupdate');

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Gagal mengupload foto');
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat profil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Profil tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Profil Saya
          </h1>
          <p className="text-gray-600 mt-2">
            Kelola informasi akun dan data pribadi Anda
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Kolom Kiri - Profile Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="relative">
                {/* Header Background */}
                <div className="h-32 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                
                {/* Profile Picture */}
                <div className="absolute -bottom-16 left-6">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-200 overflow-hidden">
                      {profile.profile_picture ? (
                        <Image
                          src={profile.profile_picture}
                          alt="Profile"
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-blue-100">
                          <User className="w-16 h-16 text-blue-600" />
                        </div>
                      )}
                    </div>
                    
                    {/* Upload Button */}
                    <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                      {isUploading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* Profile Info */}
              <div className="pt-20 pb-6 px-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      {profile.nama}
                    </h2>
                    <p className="text-gray-600 mt-1">Warga {profile.kelurahan}</p>
                  </div>
                  
                  <button
                    onClick={() => router.push('/profile/edit')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Profil
                  </button>
                </div>

                {/* Info Grid */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{profile.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <Phone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">No. Telepon</p>
                      <p className="font-medium">{profile.phone || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Shield className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">NIK</p>
                      <p className="font-medium">{profile.nik}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <MapPin className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Alamat</p>
                      <p className="font-medium">
                        {profile.kelurahan}, {profile.kecamatan}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Member Since */}
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-gray-500">
                    Bergabung sejak {formatDate(profile.created_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Puskesmas Info */}
            {puskesmas && (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="px-6 py-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Puskesmas Wilayah Anda
                  </h3>
                </div>
                
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <Building className="w-6 h-6 text-blue-600" />
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 text-lg">
                        {puskesmas.nama}
                      </h4>
                      
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{puskesmas.alamat}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <a 
                            href={`mailto:${puskesmas.email}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {puskesmas.email}
                          </a>
                        </div>
                        
                        {puskesmas.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <a 
                              href={`tel:${puskesmas.phone}`}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {puskesmas.phone}
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
                          Puskesmas ini melayani wilayah Kecamatan {puskesmas.kecamatan}. 
                          Untuk konsultasi atau laporan darurat, hubungi kontak di atas.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Kolom Kanan - Stats & Actions */}
          <div className="space-y-6">
            {/* Laporan Stats */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Statistik Laporan</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Total Laporan</span>
                    <span className="font-medium">{stats.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${stats.total > 0 ? 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1 text-gray-600">
                      <Clock className="w-3 h-3" /> Menunggu
                    </span>
                    <span className="font-medium text-yellow-600">{stats.pending}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full" 
                      style={{ width: `${stats.total > 0 ? (stats.pending/stats.total)*100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Diproses</span>
                    <span className="font-medium text-blue-600">{stats.diproses}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-400 h-2 rounded-full" 
                      style={{ width: `${stats.total > 0 ? (stats.diproses/stats.total)*100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1 text-gray-600">
                      <CheckCircle className="w-3 h-3" /> Selesai
                    </span>
                    <span className="font-medium text-green-600">{stats.selesai}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${stats.total > 0 ? (stats.selesai/stats.total)*100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Aksi Cepat</h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/lapor')}
                  className="w-full text-left px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Buat Laporan Baru
                </button>
                
                <button
                  onClick={() => router.push('/settings')}
                  className="w-full text-left px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Pengaturan Akun
                </button>
                
                <button
                  onClick={() => router.push('/sumber-air')}
                  className="w-full text-left px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  Cari Sumber Air
                </button>
                
                <button
                  onClick={() => signOut()}
                  className="w-full text-left px-4 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Keluar Akun
                </button>
              </div>
            </div>

            {/* Badges */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Pencapaian</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Warga Aktif</p>
                    <p className="text-sm text-gray-600">Bergabung sejak {new Date(profile.created_at).getFullYear()}</p>
                  </div>
                </div>
                
                {stats.total > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <User className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Peduli Lingkungan</p>
                      <p className="text-sm text-gray-600">{stats.total} laporan dibuat</p>
                    </div>
                  </div>
                )}
                
                {stats.selesai > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Responsif</p>
                      <p className="text-sm text-gray-600">{stats.selesai} laporan selesai</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}