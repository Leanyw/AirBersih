'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  Smartphone, 
  Mail, 
  Shield, 
  Save,
  Eye,
  EyeOff,
  Building,
  MapPin,
  Phone,
  User,
  Mail as MailIcon,
  Globe,
  Lock,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

type PuskesmasSettingsData = {
  phone: string;
  notifications_enabled: boolean;
  sms_notifications: boolean;
  email_notifications: boolean;
  current_password?: string;
  new_password?: string;
  confirm_password?: string;
  nama_puskesmas?: string;
  alamat?: string;
  kecamatan?: string;
  kelurahan?: string;
  email?: string;
  kode_puskesmas?: string;
};

type TabType = 'profile' | 'puskesmas-info' | 'notifications' | 'security';

export default function PuskesmasSettingsPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  
  const [settings, setSettings] = useState<PuskesmasSettingsData>({
    phone: '',
    notifications_enabled: true,
    sms_notifications: true,
    email_notifications: true,
    nama_puskesmas: '',
    alamat: '',
    kecamatan: '',
    kelurahan: '',
    email: '',
    kode_puskesmas: ''
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  useEffect(() => {
    if (user) {
      fetchPuskesmasSettings();
    }
  }, [user]);

  const fetchPuskesmasSettings = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      console.log('🔍 Fetching puskesmas settings for user:', user.id);
      
      // Coba ambil data dari tabel users dulu dengan query yang lebih sederhana
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(); // Gunakan maybeSingle() agar tidak error jika tidak ada data

      if (error) {
        console.error('❌ Puskesmas settings fetch error:', error);
        
        // Jika error bukan karena data tidak ditemukan, tampilkan pesan
        if (error.code !== 'PGRST116') {
          toast.error('Gagal memuat pengaturan puskesmas');
        }
      }

      if (data) {
        console.log('✅ Puskesmas settings data loaded:', data);
        
        setSettings({
          phone: data.phone || '',
          nama_puskesmas: data.nama || '',
          email: data.email || user.email || '',
          kecamatan: data.kecamatan || '',
          kelurahan: data.kelurahan || '',
          alamat: data.alamat || '',
          kode_puskesmas: data.kode_puskesmas || '',
          notifications_enabled: data.notifications_enabled ?? true,
          sms_notifications: data.sms_notifications ?? true,
          email_notifications: data.email_notifications ?? true,
        });
      } else {
        // Jika data tidak ditemukan, gunakan data dari auth dan default values
        console.log('ℹ️ No puskesmas data found, using defaults');
        
        setSettings({
          phone: '',
          nama_puskesmas: user.email?.split('@')[0] || 'Puskesmas',
          email: user.email || '',
          kecamatan: 'Semarang Barat',
          kelurahan: 'Belum diisi',
          alamat: 'Belum diisi',
          kode_puskesmas: 'P' + Math.random().toString(36).substr(2, 8).toUpperCase(),
          notifications_enabled: true,
          sms_notifications: true,
          email_notifications: true,
        });
      }

    } catch (error) {
      console.error('❌ Error in fetchPuskesmasSettings:', error);
      toast.error('Gagal memuat pengaturan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveProfile = async () => {
    if (!user) {
      toast.error('User tidak ditemukan');
      return;
    }
  
    setIsSaving(true);
  
    try {
      console.log('💾 Saving puskesmas profile for:', user.id);
      
      // Cek apakah data sudah ada di database
      const { data: existingData, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      let error;
      
      if (existingData) {
        // Update data yang sudah ada
        const { error: updateError } = await supabase
          .from('users')
          .update({
            phone: settings.phone,
            nama: settings.nama_puskesmas,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
          
        error = updateError;
      } else {
        // Insert data baru
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            nama: settings.nama_puskesmas || user.email?.split('@')[0] || 'Puskesmas',
            phone: settings.phone,
            kecamatan: settings.kecamatan || 'Semarang Barat',
            kelurahan: settings.kelurahan || 'Belum diisi',
            alamat: settings.alamat || 'Belum diisi',
            kode_puskesmas: settings.kode_puskesmas || 'P' + Math.random().toString(36).substr(2, 8).toUpperCase(),
            notifications_enabled: true,
            sms_notifications: true,
            email_notifications: true,
            role: 'puskesmas',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        error = insertError;
      }

      if (error) {
        console.error('❌ Save profile error:', error);
        toast.error(error.message || 'Gagal menyimpan profil');
        return;
      }
  
      toast.success('Profil berhasil diupdate');
  
    } catch (error: any) {
      console.error('❌ Save profile error:', error);
      toast.error(error.message || 'Gagal menyimpan profil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePuskesmasInfo = async () => {
    if (!user) {
      toast.error('User tidak ditemukan');
      return;
    }
  
    setIsSaving(true);
  
    try {
      console.log('💾 Saving puskesmas info for:', user.id);
      
      // Cek apakah data sudah ada di database
      const { data: existingData, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      let error;
      
      if (existingData) {
        // Update data yang sudah ada
        const { error: updateError } = await supabase
          .from('users')
          .update({
            kecamatan: settings.kecamatan,
            kelurahan: settings.kelurahan,
            alamat: settings.alamat,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
          
        error = updateError;
      } else {
        // Insert data baru
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            nama: settings.nama_puskesmas || user.email?.split('@')[0] || 'Puskesmas',
            phone: settings.phone || '',
            kecamatan: settings.kecamatan || 'Semarang Barat',
            kelurahan: settings.kelurahan || 'Belum diisi',
            alamat: settings.alamat || 'Belum diisi',
            kode_puskesmas: settings.kode_puskesmas || 'P' + Math.random().toString(36).substr(2, 8).toUpperCase(),
            notifications_enabled: true,
            sms_notifications: true,
            email_notifications: true,
            role: 'puskesmas',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        error = insertError;
      }

      if (error) {
        console.error('❌ Save puskesmas info error:', error);
        toast.error(error.message || 'Gagal menyimpan informasi puskesmas');
        return;
      }
  
      toast.success('Informasi puskesmas berhasil diupdate');
  
    } catch (error: any) {
      console.error('❌ Save puskesmas info error:', error);
      toast.error(error.message || 'Gagal menyimpan informasi puskesmas');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!user) {
      toast.error('User tidak ditemukan');
      return;
    }

    setIsSaving(true);

    try {
      // Cek apakah data sudah ada di database
      const { data: existingData, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      let error;
      
      if (existingData) {
        // Update data yang sudah ada
        const { error: updateError } = await supabase
          .from('users')
          .update({
            notifications_enabled: settings.notifications_enabled,
            sms_notifications: settings.sms_notifications,
            email_notifications: settings.email_notifications,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
          
        error = updateError;
      } else {
        // Insert data baru
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            nama: settings.nama_puskesmas || user.email?.split('@')[0] || 'Puskesmas',
            phone: settings.phone || '',
            kecamatan: settings.kecamatan || 'Semarang Barat',
            kelurahan: settings.kelurahan || 'Belum diisi',
            alamat: settings.alamat || 'Belum diisi',
            kode_puskesmas: settings.kode_puskesmas || 'P' + Math.random().toString(36).substr(2, 8).toUpperCase(),
            notifications_enabled: settings.notifications_enabled,
            sms_notifications: settings.sms_notifications,
            email_notifications: settings.email_notifications,
            role: 'puskesmas',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        error = insertError;
      }

      if (error) {
        console.error('❌ Save notifications error:', error);
        toast.error(error.message || 'Gagal menyimpan notifikasi');
        return;
      }

      toast.success('Pengaturan notifikasi berhasil disimpan');

    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan notifikasi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) {
      toast.error('User tidak ditemukan');
      return;
    }

    // Validasi
    if (!settings.current_password || !settings.new_password || !settings.confirm_password) {
      toast.error('Semua kolom password harus diisi');
      return;
    }

    if (settings.new_password !== settings.confirm_password) {
      toast.error('Password baru tidak cocok');
      return;
    }

    if (settings.new_password.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    setIsSaving(true);

    try {
      // Update password di Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: settings.new_password
      });

      if (error) {
        console.error('❌ Change password error:', error);
        throw error;
      }

      // Reset password fields
      setSettings(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }));

      toast.success('Password berhasil diubah');

    } catch (error: any) {
      console.error('Change password error:', error);
      toast.error(error.message || 'Gagal mengubah password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) {
      toast.error('User tidak ditemukan');
      return;
    }

    const confirmed = window.confirm(
      '⚠️ PERINGATAN: Hapus Akun Puskesmas\n\n' +
      'Menghapus akun puskesmas akan menghapus: \n' +
      '• Semua data laporan di wilayah Anda\n' +
      '• Semua notifikasi terkait\n' +
      '• Data profil puskesmas\n' +
      '• Warga tidak akan bisa melapor ke puskesmas ini\n\n' +
      'Tindakan ini TIDAK DAPAT DIBATALKAN.\n\n' +
      'Yakin ingin menghapus akun puskesmas?'
    );

    if (!confirmed) return;

    try {
      setIsSaving(true);
      
      // Hapus user dari tabel users
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (userError) {
        console.error('Error deleting user:', userError);
        // Lanjutkan meskipun error, mungkin user tidak ada di tabel users
      }

      // Sign out
      await signOut();
      
      toast.success('Akun puskesmas berhasil dihapus');
      router.push('/');

    } catch (error: any) {
      console.error('Delete account error:', error);
      toast.error(error.message || 'Gagal menghapus akun puskesmas');
    } finally {
      setIsSaving(false);
    }
  };

  // Daftar kecamatan
  const kecamatanList = [
    'Semarang Barat',
    'Semarang Timur',
    'Semarang Selatan',
    'Semarang Utara',
    'Semarang Tengah',
    'Tembalang',
    'Banyumanik',
    'Gunungpati',
    'Mijen',
    'Ngaliyan',
    'Pedurungan',
    'Genuk',
    'Gayamsari',
    'Candisari'
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-white">
      
      <div className="relative mb-6">
        <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-30"></div>
        <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
      </div>

      <h2 className="text-xl font-bold text-blue-700">
        Air Bersih
      </h2>
      <p className="text-sm text-gray-600">
        Memuat data laporan...
      </p>
    </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Anda belum login</h2>
          <p className="text-gray-600 mt-2">Silakan login terlebih dahulu</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                Pengaturan Puskesmas
              </h1>
              <p className="text-gray-600 mt-2">
                Kelola informasi dan preferensi puskesmas Anda
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg flex items-center gap-2">
                <Building className="w-5 h-5" />
                <span className="font-medium">Akun Puskesmas</span>
              </div>
              <button
                onClick={fetchPuskesmasSettings}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                title="Refresh data"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Building className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">
                      {settings.nama_puskesmas || user.email?.split('@')[0] || 'Puskesmas'}
                    </h3>
                    <p className="text-sm text-gray-500">{settings.kecamatan || 'Belum diatur'}</p>
                  </div>
                </div>
              </div>
              
              <nav className="space-y-1 p-4">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                    activeTab === 'profile'
                      ? 'bg-blue-50 text-blue-600 font-medium border border-blue-100'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <User className="w-5 h-5" />
                    Profil & Kontak
                  </span>
                </button>
                
                <button
                  onClick={() => setActiveTab('puskesmas-info')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                    activeTab === 'puskesmas-info'
                      ? 'bg-blue-50 text-blue-600 font-medium border border-blue-100'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Building className="w-5 h-5" />
                    Info Puskesmas
                  </span>
                </button>
                
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                    activeTab === 'notifications'
                      ? 'bg-blue-50 text-blue-600 font-medium border border-blue-100'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Bell className="w-5 h-5" />
                    Notifikasi
                  </span>
                </button>
                
                <button
                  onClick={() => setActiveTab('security')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                    activeTab === 'security'
                      ? 'bg-blue-50 text-blue-600 font-medium border border-blue-100'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Shield className="w-5 h-5" />
                    Keamanan
                  </span>
                </button>
              </nav>
              
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="text-xs text-gray-500">
                  <div className="font-medium mb-1">Kode Puskesmas</div>
                  <div className="font-mono bg-white px-2 py-1 rounded border">
                    {settings.kode_puskesmas || 'P' + Math.random().toString(36).substr(2, 8).toUpperCase()}
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    Email: {settings.email || user.email}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Tab: Profile */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <User className="w-6 h-6 text-blue-600" />
                  Informasi Kontak Puskesmas
                </h2>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          Nama Puskesmas
                        </span>
                      </label>
                      <input
                        type="text"
                        name="nama_puskesmas"
                        value={settings.nama_puskesmas || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Contoh: Puskesmas Semarang Barat"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="flex items-center gap-2">
                          <MailIcon className="w-4 h-4" />
                          Email Puskesmas
                        </span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={settings.email || user.email || ''}
                        disabled
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Email tidak dapat diubah
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Nomor Telepon Puskesmas
                      </span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        name="phone"
                        value={settings.phone}
                        onChange={handleChange}
                        className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="024-1234567"
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      Nomor telepon resmi puskesmas untuk dihubungi warga
                    </p>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-gray-700">Info Penting</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Pastikan informasi kontak Anda selalu terupdate agar warga dapat menghubungi dengan mudah.
                        </p>
                      </div>
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                </div>
              </div>
            )}

            {/* Tab: Puskesmas Info */}
            {activeTab === 'puskesmas-info' && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Building className="w-6 h-6 text-blue-600" />
                  Informasi Lokasi & Wilayah
                </h2>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Kecamatan
                        </span>
                      </label>
                      <select
                        name="kecamatan"
                        value={settings.kecamatan || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Pilih Kecamatan</option>
                        {kecamatanList.map((kec) => (
                          <option key={kec} value={kec}>{kec}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Kecamatan tempat puskesmas bertugas
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          Kelurahan
                        </span>
                      </label>
                      <input
                        type="text"
                        name="kelurahan"
                        value={settings.kelurahan || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Contoh: Pudakpayung"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Kelurahan utama yang dilayani
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Alamat Lengkap Puskesmas
                      </span>
                    </label>
                    <textarea
                      name="alamat"
                      value={settings.alamat || ''}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Contoh: Jl. Dr. Sutomo No. 12, Semarang"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Alamat fisik puskesmas untuk kunjungan warga
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Penting untuk Diperhatikan
                    </h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Kecamatan menentukan wilayah kerja puskesmas Anda</li>
                      <li>• Warga hanya dapat melihat puskesmas di kecamatan mereka</li>
                      <li>• Laporan warga akan otomatis masuk ke puskesmas sesuai kecamatan</li>
                      <li>• Pastikan kecamatan sudah benar sebelum menyimpan</li>
                    </ul>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-gray-700">Wilayah Kerja</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Anda akan menangani laporan dari warga di kecamatan: 
                          <span className="font-semibold ml-2 text-blue-600">
                            {settings.kecamatan || 'Belum ditentukan'}
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={handleSavePuskesmasInfo}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isSaving ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          <Save className="w-5 h-5" />
                        )}
                        Simpan Informasi
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Notifications */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Bell className="w-6 h-6 text-blue-600" />
                  Pengaturan Notifikasi
                </h2>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800">Aktifkan Notifikasi</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Terima semua notifikasi dari sistem
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="notifications_enabled"
                        checked={settings.notifications_enabled}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className={`space-y-4 ${!settings.notifications_enabled ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-800">Notifikasi SMS</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Terima notifikasi via SMS saat ada laporan baru
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="sms_notifications"
                          checked={settings.sms_notifications}
                          onChange={handleChange}
                          disabled={!settings.notifications_enabled}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-800">Notifikasi Email</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Terima notifikasi via email untuk laporan dan statistik
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="email_notifications"
                          checked={settings.email_notifications}
                          onChange={handleChange}
                          disabled={!settings.notifications_enabled}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Informasi Notifikasi
                    </h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Notifikasi SMS: Untuk laporan darurat/urgent</li>
                      <li>• Notifikasi Email: Laporan harian dan statistik mingguan</li>
                      <li>• Pastikan nomor telepon dan email sudah benar</li>
                    </ul>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveNotifications}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isSaving ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          <Save className="w-5 h-5" />
                        )}
                        Simpan Pengaturan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Security */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Change Password */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Lock className="w-6 h-6 text-blue-600" />
                    Ubah Password
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password Saat Ini
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          name="current_password"
                          value={settings.current_password || ''}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Masukkan password saat ini"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password Baru
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          name="new_password"
                          value={settings.new_password || ''}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Minimal 6 karakter"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Konfirmasi Password Baru
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirm_password"
                          value={settings.confirm_password || ''}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Ketik ulang password baru"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={handleChangePassword}
                        disabled={isSaving}
                        className="w-full flex justify-center items-center gap-2 px-6 bg-gradient-to-br from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isSaving ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          <Save className="w-5 h-5" />
                        )}
                        Ubah Password
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delete Account */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    Hapus Akun Puskesmas
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h3 className="font-medium text-red-800 mb-2">⚠️ PERINGATAN TINGGI</h3>
                      <p className="text-sm text-red-700 mb-3">
                        Menghapus akun puskesmas akan berdampak pada:
                      </p>
                      <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                        <li><strong>Semua laporan</strong> dari warga di wilayah Anda akan terhapus</li>
                        <li><strong>Warga tidak bisa melapor</strong> ke puskesmas ini lagi</li>
                        <li><strong>Data statistik</strong> dan laporan bulanan akan hilang</li>
                        <li><strong>Tindakan ini permanen</strong> dan tidak dapat dikembalikan</li>
                        <li><strong>Hubungi admin</strong> jika ada masalah teknis</li>
                      </ul>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-yellow-800 mb-1">Alternatif yang Aman</h4>
                        <p className="text-sm text-yellow-700">
                          Sebelum menghapus akun, pertimbangkan untuk:
                        </p>
                        <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                          <li>• Transfer data ke puskesmas lain</li>
                          <li>• Backup data laporan terlebih dahulu</li>
                          <li>• Nonaktifkan sementara akun (hubungi admin)</li>
                        </ul>
                      </div>
                    </div>

                    <button
                      onClick={handleDeleteAccount}
                      disabled={isSaving}
                      className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all font-medium flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <AlertTriangle className="w-5 h-5" />
                          Hapus Akun Puskesmas
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}