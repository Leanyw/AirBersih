'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Camera, 
  Upload, 
  X, 
  ArrowLeft, 
  AlertCircle,
  CheckCircle,
  Clock,
  Home
} from 'lucide-react';
import toast from 'react-hot-toast';

// Definisikan tipe untuk form data
type FormData = {
  bau: string;
  rasa: string;
  warna: string;
  lokasi: string;
  keterangan: string;
};

// Opsi-opsi untuk dropdown
const BAU_OPTIONS = [
  { value: 'normal', label: 'Normal (tidak berbau)' },
  { value: 'anyir', label: 'Anyir/bau amis' },
  { value: 'busuk', label: 'Bau busuk' },
  { value: 'amis', label: 'Bau amonia' },
  { value: 'lainnya', label: 'Bau lainnya' }
];

const RASA_OPTIONS = [
  { value: 'normal', label: 'Normal (tidak berasa)' },
  { value: 'pahit', label: 'Pahit' },
  { value: 'asin', label: 'Asin' },
  { value: 'anyir', label: 'Anyir' },
  { value: 'logam', label: 'Rasa logam' },
  { value: 'lainnya', label: 'Rasa lainnya' }
];

const WARNA_OPTIONS = [
  { value: 'jernih', label: 'Jernih' },
  { value: 'keruh', label: 'Keruh' },
  { value: 'kuning', label: 'Kuning' },
  { value: 'coklat', label: 'Coklat' },
  { value: 'hijau', label: 'Hijau' }
];

export default function BuatLaporanPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State untuk form
  const [formData, setFormData] = useState<FormData>({
    bau: '',
    rasa: '',
    warna: '',
    lokasi: '',
    keterangan: '',
  });
  
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [userKecamatan, setUserKecamatan] = useState('');

  // Cek status koneksi
  useEffect(() => {
    const checkConnection = () => {
      setIsOffline(!navigator.onLine);
    };
    
    checkConnection();
    
    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);
    
    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
    };
  }, []);

  // Ambil data user dan lokasi
  useEffect(() => {
    if (!user || authLoading) return;

    fetchUserData();
  }, [user, authLoading]);

  const fetchUserData = async () => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('kecamatan, kelurahan')
        .eq('id', user?.id)
        .single();

      if (error) {
        console.warn('Tidak bisa mengambil data user:', error.message);
        return;
      }

      if (userData) {
        setUserKecamatan(userData.kecamatan);
        
        // Ambil lokasi-lokasi umum dari water_sources di kecamatan ini
        const { data: sources } = await supabase
          .from('water_sources')
          .select('nama, alamat')
          .eq('kecamatan', userData.kecamatan)
          .limit(5);

        if (sources) {
          const options = sources.map(source => `${source.nama}, ${source.alamat}`);
          setLokasiOptions(options);
        }
      }
    } catch (error) {
      console.warn('Error fetching user data:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validasi ukuran file (maksimal 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran foto maksimal 5MB');
        return;
      }
      
      // Validasi tipe file
      if (!file.type.startsWith('image/')) {
        toast.error('File harus berupa gambar');
        return;
      }
      
      setFoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFoto = () => {
    setFoto(null);
    setFotoPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    if (!formData.bau) {
      toast.error('Harap pilih kondisi bau air');
      return false;
    }
    
    if (!formData.rasa) {
      toast.error('Harap pilih kondisi rasa air');
      return false;
    }
    
    if (!formData.warna) {
      toast.error('Harap pilih kondisi warna air');
      return false;
    }
    
    if (!formData.lokasi.trim()) {
      toast.error('Harap isi lokasi sumber air');
      return false;
    }
    
    if (!formData.keterangan.trim()) {
      toast.error('Harap isi keterangan tambahan');
      return false;
    }
    
    return true;
  };

  const uploadImageToStorage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('laporan-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        return null;
      }

      // Dapatkan URL publik
      const { data } = supabase.storage
        .from('laporan-images')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('Error in uploadImageToStorage:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Silakan login terlebih dahulu');
      router.push('/login');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload foto jika ada
      let fotoUrl = '';
      if (foto) {
        const uploadedUrl = await uploadImageToStorage(foto);
        if (uploadedUrl) {
          fotoUrl = uploadedUrl;
        }
      }

      // 2. Ambil data user untuk mendapatkan puskesmas_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('puskesmas_id')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error getting user data:', userError);
        throw new Error('Gagal mengambil data pengguna');
      }

      if (!userData?.puskesmas_id) {
        throw new Error('Puskesmas tidak ditemukan untuk wilayah Anda');
      }

      // 3. Buat laporan di database
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .insert({
          user_id: user.id,
          foto_url: fotoUrl || null,
          bau: formData.bau,
          rasa: formData.rasa,
          warna: formData.warna,
          lokasi: formData.lokasi,
          keterangan: formData.keterangan,
          status: 'pending',
          puskesmas_id: userData.puskesmas_id,
          is_synced: true
        })
        .select()
        .single();

      if (reportError) {
        console.error('Error creating report:', reportError);
        throw reportError;
      }

      // 4. Buat notifikasi otomatis
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Laporan Berhasil Dikirim',
          message: `Laporan Anda tentang air ${formData.bau} di ${formData.lokasi} telah diterima dan sedang diproses.`,
          type: 'update',
          is_read: false
        });

      // 5. Tampilkan pesan sukses
      toast.success('Laporan berhasil dikirim!');
      
      // 6. Reset form
      setFormData({
        bau: '',
        rasa: '',
        warna: '',
        lokasi: '',
        keterangan: '',
      });
      removeFoto();
      
      // 7. Redirect ke halaman laporan
      setTimeout(() => {
        router.push('/laporan');
      }, 1500);

    } catch (error: any) {
      console.error('Error submitting report:', error);
      
      // Jika offline, simpan ke localStorage
      if (isOffline) {
        try {
          const offlineReports = JSON.parse(localStorage.getItem('offline_reports') || '[]');
          const offlineReport = {
            ...formData,
            foto: fotoPreview,
            created_at: new Date().toISOString(),
            status: 'pending_offline'
          };
          
          offlineReports.push(offlineReport);
          localStorage.setItem('offline_reports', JSON.stringify(offlineReports));
          
          toast.success('Laporan disimpan secara offline. Akan dikirim saat online kembali.');
          
          // Reset form
          setFormData({
            bau: '',
            rasa: '',
            warna: '',
            lokasi: '',
            keterangan: '',
          });
          removeFoto();
          
          setTimeout(() => {
            router.push('/laporan');
          }, 1500);
        } catch (offlineError) {
          toast.error('Gagal menyimpan laporan offline');
        }
      } else {
        toast.error(error.message || 'Gagal mengirim laporan');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Jika masih loading auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Memuat halaman...</p>
        </div>
      </div>
    );
  }

  // Jika user belum login
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Anda harus login terlebih dahulu</h2>
          <p className="text-gray-600 mb-6">Silakan login untuk mengakses halaman ini</p>
          <Link
            href="/login"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Login Sekarang
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span>Kembali</span>
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                  Buat Laporan Baru
                </h1>
                <p className="text-gray-600 mt-1">
                  Laporkan kondisi air yang tidak normal di wilayah {userKecamatan}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="hidden md:flex items-center text-blue-600 hover:text-blue-800"
            >
              <Home className="w-5 h-5 mr-2" />
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Offline Warning */}
        {isOffline && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-yellow-800 font-medium">
                  Mode Offline Terdeteksi
                </p>
                <p className="text-yellow-700 text-sm mt-1">
                  Laporan akan disimpan sementara di perangkat Anda dan dikirim otomatis saat koneksi internet tersedia.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info Status */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-yellow-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Status Proses</p>
                  <p className="text-xs text-gray-500">1-2 hari kerja</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Diproses Oleh</p>
                  <p className="text-xs text-gray-500">Puskesmas setempat</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Konfirmasi</p>
                  <p className="text-xs text-gray-500">Via notifikasi</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* Foto Upload */}
            <div>
              <label className="block text-lg font-semibold text-gray-800 mb-4">
                Foto Kondisi Air
                <span className="text-gray-400 text-sm font-normal ml-2">(Opsional, maksimal 5MB)</span>
              </label>
              
              {fotoPreview ? (
                <div className="relative">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                    <img
                      src={fotoPreview}
                      alt="Preview foto"
                      className="w-full h-64 object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={removeFoto}
                    className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                    title="Hapus foto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 transition-colors bg-gray-50"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFotoChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <Camera className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                  <p className="text-gray-600 font-medium">Klik untuk upload foto</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Format: JPG, PNG, GIF • Maksimal: 5MB
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Foto akan membantu analisis kondisi air
                  </p>
                </div>
              )}
            </div>

            {/* Grid untuk input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Bau */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  Bau Air <span className="text-red-500">*</span>
                </label>
                <select
                  name="bau"
                  value={formData.bau}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Pilih kondisi bau air</option>
                  {BAU_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Pilih deskripsi bau yang paling sesuai
                </p>
              </div>

              {/* Rasa */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  Rasa Air <span className="text-red-500">*</span>
                </label>
                <select
                  name="rasa"
                  value={formData.rasa}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Pilih kondisi rasa air</option>
                  {RASA_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Rasakan sedikit di ujung lidah (jangan ditelan)
                </p>
              </div>

              {/* Warna */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  Warna Air <span className="text-red-500">*</span>
                </label>
                <select
                  name="warna"
                  value={formData.warna}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Pilih kondisi warna air</option>
                  {WARNA_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Lihat air dalam gelas bening di tempat terang
                </p>
              </div>

              {/* Lokasi */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  Lokasi Sumber Air <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lokasi"
                  value={formData.lokasi}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Contoh: Sumur depan rumah RT 03, Sungai Kali Garang"
                  required
                  disabled={isSubmitting}
                  list="lokasi-options"
                />
                {lokasiOptions.length > 0 && (
                  <datalist id="lokasi-options">
                    {lokasiOptions.map((option, index) => (
                      <option key={index} value={option} />
                    ))}
                  </datalist>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Sebutkan lokasi spesifik sumber air
                </p>
              </div>
            </div>

            {/* Keterangan */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3">
                Keterangan Tambahan <span className="text-red-500">*</span>
              </label>
              <textarea
                name="keterangan"
                value={formData.keterangan}
                onChange={handleChange}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Deskripsikan secara detail:
• Sejak kapan terjadi masalah?
• Apakah ada perubahan warna/bau secara bertahap?
• Apakah ada warga lain yang mengalami hal sama?
• Apakah ada gejala kesehatan yang dirasakan?
• Informasi lain yang relevan..."
                required
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-2">
                Semakin detail keterangan, semakin cepat penanganan
              </p>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Tips Melapor yang Efektif:
              </h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li>• Ambil foto dengan pencahayaan cukup dan fokus pada air</li>
                <li>• Deskripsikan bau, rasa, dan warna dengan spesifik</li>
                <li>• Sebutkan lokasi tepat (RT/RW, nama jalan, landmark)</li>
                <li>• Ceritakan kronologi kejadian (sejak kapan, perubahan)</li>
                <li>• Puskesmas akan merespon dalam 1-2 hari kerja</li>
                <li>• Anda akan mendapat notifikasi saat ada perkembangan</li>
                <li>• Jika kondisi darurat, hubungi puskesmas langsung</li>
              </ul>
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    {isOffline ? 'Menyimpan Offline...' : 'Mengirim Laporan...'}
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <Upload className="w-5 h-5 mr-3" />
                    {isOffline ? 'Simpan Laporan (Offline)' : 'Kirim Laporan'}
                  </span>
                )}
              </button>
              
              <Link
                href="/laporan"
                className="flex-1 bg-gray-100 text-gray-700 py-4 px-6 rounded-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-all duration-200 font-semibold text-center"
              >
                Lihat Laporan Saya
              </Link>
              
              <Link
                href="/dashboard"
                className="flex-1 border-2 border-gray-300 text-gray-700 py-4 px-6 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-all duration-200 font-semibold text-center"
              >
                Batalkan
              </Link>
            </div>

            {isOffline && (
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  💡 <strong>Mode Offline Aktif:</strong> Laporan akan disimpan sementara di perangkat Anda.
                  Saat online kembali, laporan akan dikirim otomatis.
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Info Tambahan */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
            <h3 className="font-semibold text-gray-800 mb-3">Proses Setelah Melapor:</h3>
            <ol className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full mr-3">1</span>
                <span>Laporan Anda masuk ke sistem puskesmas setempat</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full mr-3">2</span>
                <span>Petugas akan memverifikasi dan menindaklanjuti laporan</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full mr-3">3</span>
                <span>Anda akan mendapat notifikasi saat status berubah</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full mr-3">4</span>
                <span>Hasil pemeriksaan akan diinformasikan melalui aplikasi</span>
              </li>
            </ol>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
            <h3 className="font-semibold text-gray-800 mb-3">Kontak Darurat:</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Puskesmas Terdekat</p>
                <p className="text-sm text-gray-600">Buka: Senin-Jumat, 08:00-14:00</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Kantor Dinas Kesehatan</p>
                <p className="text-sm text-gray-600">📞 024-1234567</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Kondisi Darurat</p>
                <p className="text-sm text-gray-600">Segera hubungi puskesmas terdekat atau 119</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}