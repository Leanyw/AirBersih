'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, Users, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BuatNotifikasiPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [userCount, setUserCount] = useState(0);
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    send_to_all: true,
  });

  useEffect(() => {
    if (!user) return;
    fetchUserCount();
  }, [user]);

  const fetchUserCount = async () => {
    try {
      const { data: puskesmasData } = await supabase
        .from('users')
        .select('puskesmas_id')
        .eq('id', user?.id)
        .single();

      if (!puskesmasData) return;

      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('puskesmas_id', puskesmasData.puskesmas_id)
        .eq('role', 'warga');

      if (error) throw error;
      setUserCount(count || 0);
    } catch (error) {
      console.error('Error fetching user count:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setIsLoading(true);

      const { data: puskesmasData } = await supabase
        .from('users')
        .select('puskesmas_id')
        .eq('id', user.id)
        .single();

      if (!puskesmasData) {
        throw new Error('Data puskesmas tidak ditemukan');
      }

      // Ambil semua warga di puskesmas ini
      const { data: wargaList, error: wargaError } = await supabase
        .from('users')
        .select('id')
        .eq('puskesmas_id', puskesmasData.puskesmas_id)
        .eq('role', 'warga');

      if (wargaError) throw wargaError;

      // Buat notifikasi untuk setiap warga
      const notifications = wargaList.map(warga => ({
        user_id: warga.id,
        puskesmas_id: puskesmasData.puskesmas_id,
        title: formData.title,
        message: formData.message,
        type: formData.type,
        is_read: false,
      }));

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) throw notifError;

      toast.success(`Notifikasi berhasil dikirim ke ${wargaList.length} warga`);
      router.push('/puskesmas/dashboard');
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Gagal mengirim notifikasi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Kembali
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                  Buat Notifikasi
                </h1>
                <p className="text-gray-600 mt-2">
                  Kirim notifikasi kepada warga di wilayah Anda
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-5 h-5" />
              <span>{userCount} warga terdaftar</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Judul */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Judul Notifikasi *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Contoh: Peringatan Kualitas Air"
                required
              />
            </div>

            {/* Tipe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipe Notifikasi *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="info">Informasi Umum</option>
                <option value="warning">Peringatan</option>
                <option value="urgent">Darurat</option>
                <option value="update">Pembaruan</option>
              </select>
            </div>

            {/* Pesan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Isi Pesan *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tulis pesan notifikasi di sini..."
                required
              />
            </div>

            {/* Tujuan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kirim Kepada *
              </label>
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <Bell className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-800">Semua Warga</p>
                  <p className="text-sm text-gray-600">
                    Notifikasi akan dikirim ke semua warga di wilayah puskesmas Anda
                  </p>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="border-t pt-6">
              <h3 className="font-medium text-gray-700 mb-4">Preview Notifikasi</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-800">{formData.title || '[Judul Notifikasi]'}</p>
                    <p className="text-sm text-gray-500">Dari: Puskesmas</p>
                  </div>
                </div>
                <p className="text-gray-700 whitespace-pre-line">
                  {formData.message || '[Isi pesan akan muncul di sini...]'}
                </p>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Kirim Notifikasi
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Tips */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h3 className="font-semibold text-yellow-800 mb-3">Tips Menulis Notifikasi:</h3>
          <ul className="space-y-2 text-sm text-yellow-700">
            <li>• Gunakan bahasa yang jelas dan mudah dipahami</li>
            <li>• Sertakan informasi penting di awal</li>
            <li>• Untuk notifikasi darurat, gunakan kata-kata yang tegas</li>
            <li>• Berikan instruksi yang jelas jika diperlukan tindakan</li>
            <li>• Periksa ejaan dan tata bahasa sebelum mengirim</li>
          </ul>
        </div>
      </div>
    </div>
  );
}