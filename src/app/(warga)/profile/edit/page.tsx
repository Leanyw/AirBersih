'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

type EditProfileData = {
  nama: string;
  email: string;
  nik: string;
  phone: string;
  kecamatan: string;
  kelurahan: string;
};

// Dummy data kecamatan
const KECAMATAN_LIST = [
  'Semarang Barat', 'Semarang Timur', 'Semarang Utara', 
  'Semarang Selatan', 'Semarang Tengah', 'Gunungpati',
  'Mijen', 'Tembalang', 'Banyumanik', 'Candisari',
  'Gajahmungkur', 'Pedurungan', 'Genuk', 'Tugu', 'Ngaliyan'
];

export default function EditProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState<EditProfileData>({
    nama: '',
    email: '',
    nik: '',
    phone: '',
    kecamatan: '',
    kelurahan: ''
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      setFormData({
        nama: data.nama || '',
        email: data.email || '',
        nik: data.nik || '',
        phone: data.phone || '',
        kecamatan: data.kecamatan || '',
        kelurahan: data.kelurahan || ''
      });

    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Gagal memuat profil');
      router.push('/profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    setIsSaving(true);

    try {
      // Validasi
      if (!formData.nama || !formData.email || !formData.nik) {
        throw new Error('Nama, email, dan NIK wajib diisi');
      }

      // Update di database
      const { error } = await supabase
        .from('users')
        .update({
          nama: formData.nama,
          email: formData.email,
          nik: formData.nik,
          phone: formData.phone,
          kecamatan: formData.kecamatan,
          kelurahan: formData.kelurahan,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profil berhasil diupdate');
      router.push('/profile');

    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.message || 'Gagal mengupdate profil');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/profile"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                Edit Profil
              </h1>
              <p className="text-gray-600 mt-2">
                Perbarui informasi profil Anda
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nama */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  name="nama"
                  value={formData.nama}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled // Email tidak bisa diubah karena login identifier
                />
                <p className="mt-1 text-sm text-gray-500">
                  Email tidak dapat diubah karena merupakan identitas login
                </p>
              </div>

              {/* NIK */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NIK *
                </label>
                <input
                  type="text"
                  name="nik"
                  value={formData.nik}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  maxLength={16}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  No. Telepon
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0812-3456-7890"
                />
              </div>

              {/* Kecamatan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kecamatan *
                </label>
                <select
                  name="kecamatan"
                  value={formData.kecamatan}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Pilih Kecamatan</option>
                  {KECAMATAN_LIST.map(kec => (
                    <option key={kec} value={kec}>{kec}</option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Menentukan puskesmas wilayah Anda
                </p>
              </div>

              {/* Kelurahan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kelurahan *
                </label>
                <input
                  type="text"
                  name="kelurahan"
                  value={formData.kelurahan}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Informasi */}
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Catatan:</span> Perubahan kecamatan akan 
                mengubah puskesmas penanggung jawab laporan Anda. 
                Pastikan data alamat sesuai dengan KTP.
              </p>
            </div>

            {/* Actions */}
            <div className="pt-6 border-t flex justify-end gap-4">
              <Link
                href="/profile"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Batal
              </Link>
              
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Simpan Perubahan
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}