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
  Smartphone as PhoneIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

type SettingsData = {
  phone: string;
  notifications_enabled: boolean;
  sms_notifications: boolean;
  email_notifications: boolean;
  current_password?: string;
  new_password?: string;
  confirm_password?: string;
};

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  
  const [settings, setSettings] = useState<SettingsData>({
    phone: '',
    notifications_enabled: true,
    sms_notifications: true,
    email_notifications: true,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security'>('profile');

  useEffect(() => {
    if (user) {
      fetchUserSettings();
    }
  }, [user]);

  const fetchUserSettings = async () => {
    try {
      setIsLoading(true);
      
      console.log('🔍 Fetching settings for user:', user?.id);
      
      // Query yang lebih komprehensif
      const { data, error } = await supabase
        .from('users')
        .select('phone, notifications_enabled, sms_notifications, email_notifications, nama, email, kecamatan, kelurahan')
        .eq('id', user?.id)
        .single();
  
      if (error) {
        console.error('❌ Settings fetch error:', error);
        
        // Jika user tidak ditemukan, buat dulu
        if (error.code === 'PGRST116') {
          console.log('⚠️ User not found, creating basic profile...');
          
          const { data: authUser } = await supabase.auth.getUser();
          
          if (authUser.user) {
            const { error: createError } = await supabase
              .from('users')
              .insert({
                id: authUser.user.id,
                email: authUser.user.email,
                nama: authUser.user.email?.split('@')[0] || 'User',
                kecamatan: 'Semarang Barat',
                kelurahan: 'Belum diisi',
                phone: '',
                notifications_enabled: true,
                sms_notifications: true,
                email_notifications: true,
                role: 'warga',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            
            if (!createError) {
              // Coba fetch lagi
              return fetchUserSettings();
            }
          }
        }
        
        toast.error('Gagal memuat pengaturan');
        return;
      }
  
      console.log('✅ Settings data:', data);
      
      setSettings({
        phone: data.phone || '',
        notifications_enabled: data.notifications_enabled ?? true,
        sms_notifications: data.sms_notifications ?? true,
        email_notifications: data.email_notifications ?? true,
      });
  
    } catch (error) {
      console.error('❌ Error in fetchUserSettings:', error);
      toast.error('Gagal memuat pengaturan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
  
    setIsSaving(true);
  
    try {
      console.log('💾 Saving profile for user:', user.id);
      
      const { error } = await supabase
        .from('users')
        .update({
          phone: settings.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
  
      if (error) {
        console.error('❌ Update profile error:', error);
        
        // Jika row tidak ditemukan, buat baru
        if (error.code === 'PGRST116') {
          const { data: authUser } = await supabase.auth.getUser();
          
          if (authUser.user) {
            const { error: createError } = await supabase
              .from('users')
              .insert({
                id: authUser.user.id,
                email: authUser.user.email,
                nama: authUser.user.email?.split('@')[0] || 'User',
                phone: settings.phone,
                kecamatan: 'Semarang Barat',
                kelurahan: 'Belum diisi',
                role: 'warga',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            
            if (createError) {
              throw createError;
            }
          }
        } else {
          throw error;
        }
      }
  
      toast.success('Profil berhasil diupdate');
  
    } catch (error: any) {
      console.error('❌ Save profile error:', error);
      toast.error(error.message || 'Gagal menyimpan profil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!user) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          notifications_enabled: settings.notifications_enabled,
          sms_notifications: settings.sms_notifications,
          email_notifications: settings.email_notifications,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Pengaturan notifikasi berhasil disimpan');

    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan notifikasi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;

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

      if (error) throw error;

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
    if (!user) return;

    const confirmed = window.confirm(
      'Apakah Anda yakin ingin menghapus akun? ' +
      'Semua data laporan dan informasi akan dihapus permanen. ' +
      'Tindakan ini tidak dapat dibatalkan.'
    );

    if (!confirmed) return;

    try {
      // Hapus semua data user terlebih dahulu
      const { error: reportsError } = await supabase
        .from('reports')
        .delete()
        .eq('user_id', user.id);

      if (reportsError) throw reportsError;

      // Hapus user dari tabel users
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (userError) throw userError;

      // Sign out
      await signOut();
      
      toast.success('Akun berhasil dihapus');
      router.push('/');

    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus akun');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat pengaturan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Pengaturan Akun
          </h1>
          <p className="text-gray-600 mt-2">
            Kelola preferensi dan keamanan akun Anda
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <nav className="space-y-1 p-4">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'profile'
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <PhoneIcon className="w-5 h-5" />
                    Profil & Kontak
                  </span>
                </button>
                
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'notifications'
                      ? 'bg-blue-50 text-blue-600 font-medium'
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
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'security'
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Shield className="w-5 h-5" />
                    Keamanan
                  </span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Tab: Profile */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">
                  Informasi Kontak
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nomor Telepon
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <PhoneIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        name="phone"
                        value={settings.phone}
                        onChange={handleChange}
                        className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0812-3456-7890"
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      Digunakan untuk notifikasi SMS dari puskesmas
                    </p>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveProfile}
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
                </div>
              </div>
            )}

            {/* Tab: Notifications */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">
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
                          Terima notifikasi via SMS
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
                          Terima notifikasi via email
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

                  <div className="pt-4 border-t">
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveNotifications}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                <div className="bg-white rounded-xl shadow p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-6">
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
                        className="w-full flex justify-center items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                <div className="bg-white rounded-xl shadow p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    Hapus Akun
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h3 className="font-medium text-red-800 mb-2">Peringatan</h3>
                      <p className="text-sm text-red-700">
                        Menghapus akun akan menghapus semua data Anda secara permanen, termasuk:
                      </p>
                      <ul className="text-sm text-red-700 mt-2 list-disc list-inside space-y-1">
                        <li>Semua laporan yang pernah Anda buat</li>
                        <li>Riwayat notifikasi</li>
                        <li>Data profil dan preferensi</li>
                        <li>Tidak dapat dikembalikan</li>
                      </ul>
                    </div>

                    <button
                      onClick={handleDeleteAccount}
                      className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors font-medium"
                    >
                      Hapus Akun Saya
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