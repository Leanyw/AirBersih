'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  MapPin, 
  Bell,
  TrendingUp,
  Droplets,
  Info
} from 'lucide-react';
import Link from 'next/link';

interface AreaSafety {
  kecamatan: string;
  safety_level: string;
  updated_at: string;
  total_sources: number;
  safe_sources: number;
}

interface SafetyNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
}

export default function InfoKeamananAirPage() {
  const { user } = useAuth();
  const [areaSafety, setAreaSafety] = useState<AreaSafety | null>(null);
  const [notifications, setNotifications] = useState<SafetyNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSafetyData();
      fetchNotifications();
    }
  }, [user]);

  const fetchSafetyData = async () => {
    try {
      // Ambil data user untuk tahu kecamatan
      const { data: userData } = await supabase
        .from('users')
        .select('kecamatan')
        .eq('id', user?.id)
        .single();

      if (!userData) return;

      // Ambil data safety wilayah terkini
      const { data: safetyData } = await supabase
        .from('area_safety_history')
        .select('*')
        .eq('kecamatan', userData.kecamatan)
        .order('test_date', { ascending: false })
        .limit(1)
        .single();

      // Hitung sumber air di kecamatan
      const { data: waterSources } = await supabase
        .from('water_sources')
        .select('status')
        .eq('kecamatan', userData.kecamatan);

      const total_sources = waterSources?.length || 0;
      const safe_sources = waterSources?.filter(s => s.status === 'aman').length || 0;

      setAreaSafety({
        kecamatan: userData.kecamatan,
        safety_level: safetyData?.safety_level || 'aman',
        updated_at: safetyData?.test_date || new Date().toISOString(),
        total_sources,
        safe_sources
      });
    } catch (error) {
      console.error('Error fetching safety data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'warning')
        .or('type.eq.urgent')
        .order('created_at', { ascending: false })
        .limit(5);

      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const getSafetyColor = (level: string) => {
    switch (level) {
      case 'aman': return 'bg-green-100 text-green-800';
      case 'waspada': return 'bg-yellow-100 text-yellow-800';
      case 'rawan': return 'bg-orange-100 text-orange-800';
      case 'bahaya': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSafetyIcon = (level: string) => {
    switch (level) {
      case 'aman': return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'waspada': return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case 'rawan': return <AlertTriangle className="w-6 h-6 text-orange-600" />;
      case 'bahaya': return <AlertTriangle className="w-6 h-6 text-red-600" />;
      default: return <Shield className="w-6 h-6 text-gray-600" />;
    }
  };

  const getSafetyDescription = (level: string) => {
    switch (level) {
      case 'aman': return 'Air di wilayah Anda aman untuk dikonsumsi dengan perlakuan normal';
      case 'waspada': return 'Perlu perhatian khusus, rebus air sebelum diminum';
      case 'rawan': return 'Ada indikasi kontaminasi, gunakan sumber air alternatif';
      case 'bahaya': return 'Air tidak aman, ikuti instruksi dari puskesmas';
      default: return 'Data keamanan sedang diperbarui';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data keamanan air...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                Informasi Keamanan Air
              </h1>
              <p className="text-gray-600 mt-1">
                Status terkini kualitas air di wilayah Anda
              </p>
            </div>
          </div>
        </div>

        {/* Status Keamanan */}
        {areaSafety && (
          <div className="mb-8">
            <div className={`p-6 rounded-xl ${getSafetyColor(areaSafety.safety_level)}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  {getSafetyIcon(areaSafety.safety_level)}
                  <div className="ml-4">
                    <h2 className="text-xl font-bold">
                      Status Keamanan Air di {areaSafety.kecamatan}
                    </h2>
                    <p className="mt-2">{getSafetyDescription(areaSafety.safety_level)}</p>
                    <div className="flex items-center mt-4">
                      <div className={`px-4 py-2 rounded-full font-bold ${getSafetyColor(areaSafety.safety_level)}`}>
                        {areaSafety.safety_level.toUpperCase()}
                      </div>
                      <span className="ml-4 text-sm text-gray-600">
                        Terakhir diperbarui: {new Date(areaSafety.updated_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Sumber Air</p>
                  <p className="text-2xl font-bold">
                    {areaSafety.safe_sources}/{areaSafety.total_sources} Aman
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info Penting */}
          <div className="lg:col-span-2 space-y-6">
            {/* Notifikasi */}
            <div className="bg-white rounded-xl shadow">
              <div className="px-6 py-4 border-b">
                <h3 className="font-bold text-gray-800 flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  Notifikasi Terkini
                </h3>
              </div>
              <div className="divide-y">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    Tidak ada notifikasi saat ini
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start">
                        <div className={`p-2 rounded-lg mr-3 ${
                          notif.type === 'urgent' ? 'bg-red-100' : 'bg-yellow-100'
                        }`}>
                          <AlertTriangle className={`w-5 h-5 ${
                            notif.type === 'urgent' ? 'text-red-600' : 'text-yellow-600'
                          }`} />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800">{notif.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(notif.created_at).toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Tips Keamanan */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                <Info className="w-5 h-5 mr-2" />
                Tips Keamanan Air
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">Sebelum Konsumsi</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Selalu rebus air sampai mendidih (10 menit)</li>
                    <li>• Periksa warna, bau, dan rasa air</li>
                    <li>• Simpan air di wadah bersih tertutup</li>
                  </ul>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">Jika Air Bermasalah</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Segera laporkan ke puskesmas</li>
                    <li>• Gunakan sumber air alternatif</li>
                    <li>• Ikuti instruksi dari petugas</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Sumber Air Terdekat */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Sumber Air Aman Terdekat
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                    <div>
                      <p className="font-medium text-gray-800">Sumur Umum RW 05</p>
                      <p className="text-sm text-gray-600">Jl. Merdeka No. 12</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                    <div>
                      <p className="font-medium text-gray-800">PDAM Cabang Utara</p>
                      <p className="text-sm text-gray-600">Jl. Sudirman No. 45</p>
                    </div>
                  </div>
                </div>
              </div>
              <Link 
                href="/sumber-air"
                className="block text-center mt-4 text-blue-600 hover:text-blue-800 text-sm"
              >
                Lihat semua sumber air →
              </Link>
            </div>

            {/* Statistik */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Statistik Wilayah
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Laporan bulan ini</span>
                    <span className="font-medium">24</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Waktu respon rata-rata</span>
                    <span className="font-medium">2 hari</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="font-bold text-gray-800 mb-3">Aksi Cepat</h3>
              <div className="space-y-3">
                <Link 
                  href="/lapor"
                  className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg hover:bg-blue-700"
                >
                  Laporkan Masalah Air
                </Link>
                <Link 
                  href="/sumber-air"
                  className="block w-full bg-white text-blue-600 text-center py-3 rounded-lg border border-blue-600 hover:bg-blue-50"
                >
                  Cari Sumber Air Alternatif
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}