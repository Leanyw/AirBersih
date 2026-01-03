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
  Info,
  Calendar,
  Activity,
  Users,
  Clock,
  AlertCircle,
  History
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface AreaSafetyData {
  id: string;
  kecamatan: string;
  kelurahan: string;
  safety_level: string;
  total_contaminants: number;
  main_contaminant: string;
  test_date: string;
}

interface WaterSource {
  id: string;
  nama: string;
  alamat: string;
  status: string;
  last_checked: string;
}

interface SafetyStats {
  total_laporan: number;
  laporan_bulan_ini: number;
  avg_response_time: number;
  sources_aman: number;
  sources_total: number;
}

export default function InfoKeamananAirPage() {
  const { user } = useAuth();
  const [areaSafety, setAreaSafety] = useState<AreaSafetyData | null>(null);
  const [safetyHistory, setSafetyHistory] = useState<AreaSafetyData[]>([]);
  const [waterSources, setWaterSources] = useState<WaterSource[]>([]);
  const [stats, setStats] = useState<SafetyStats>({
    total_laporan: 0,
    laporan_bulan_ini: 0,
    avg_response_time: 0,
    sources_aman: 0,
    sources_total: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'status' | 'history'>('status');

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      
      // Get user's kecamatan
      const { data: userData } = await supabase
        .from('users')
        .select('kecamatan')
        .eq('id', user?.id)
        .single();

      if (!userData) {
        toast.error('Data user tidak ditemukan');
        return;
      }

      const userKecamatan = userData.kecamatan;

      // Fetch data concurrently
      await Promise.all([
        fetchSafetyData(userKecamatan),
        fetchSafetyHistory(userKecamatan),
        fetchWaterSources(userKecamatan),
        fetchStats(userKecamatan)
      ]);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSafetyData = async (kecamatan: string) => {
    try {
      const { data, error } = await supabase
        .from('area_safety_history')
        .select('*')
        .eq('kecamatan', kecamatan)
        .order('test_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching safety data:', error);
      } else {
        setAreaSafety(data);
      }
    } catch (error) {
      console.error('Error in fetchSafetyData:', error);
    }
  };

  const fetchSafetyHistory = async (kecamatan: string) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('area_safety_history')
        .select('*')
        .eq('kecamatan', kecamatan)
        .gte('test_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('test_date', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching safety history:', error);
      } else {
        setSafetyHistory(data || []);
      }
    } catch (error) {
      console.error('Error in fetchSafetyHistory:', error);
    }
  };

  const fetchWaterSources = async (kecamatan: string) => {
    try {
      const { data, error } = await supabase
        .from('water_sources')
        .select('*')
        .eq('kecamatan', kecamatan)
        .eq('status', 'aman')
        .order('last_checked', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching water sources:', error);
      } else {
        setWaterSources(data || []);
      }
    } catch (error) {
      console.error('Error in fetchWaterSources:', error);
    }
  };

  const fetchStats = async (kecamatan: string) => {
    try {
      // Get total reports in this kecamatan
      const { count: totalLaporan, error: reportsError } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('kecamatan', kecamatan);

      // Get reports this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: laporanBulanIni, error: monthlyError } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('kecamatan', kecamatan)
        .gte('created_at', startOfMonth.toISOString());

      // Get all water sources
      const { count: sourcesTotal, error: sourcesError } = await supabase
        .from('water_sources')
        .select('*', { count: 'exact', head: true })
        .eq('kecamatan', kecamatan);

      const { count: sourcesAman, error: sourcesAmanError } = await supabase
        .from('water_sources')
        .select('*', { count: 'exact', head: true })
        .eq('kecamatan', kecamatan)
        .eq('status', 'aman');

      if (!reportsError && !monthlyError && !sourcesError && !sourcesAmanError) {
        setStats({
          total_laporan: totalLaporan || 0,
          laporan_bulan_ini: laporanBulanIni || 0,
          avg_response_time: 1.5,
          sources_aman: sourcesAman || 0,
          sources_total: sourcesTotal || 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getSafetyColor = (level: string) => {
    switch (level) {
      case 'aman': return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' };
      case 'waspada': return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' };
      case 'rawan': return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' };
      case 'bahaya': return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' };
    }
  };

  const getSafetyIcon = (level: string) => {
    switch (level) {
      case 'aman': return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'waspada': return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case 'rawan': return <AlertTriangle className="w-6 h-6 text-orange-600" />;
      case 'bahaya': return <AlertCircle className="w-6 h-6 text-red-600" />;
      default: return <Shield className="w-6 h-6 text-gray-600" />;
    }
  };

  const getSafetyDescription = (level: string) => {
    switch (level) {
      case 'aman': return 'Air di wilayah Anda aman untuk dikonsumsi dengan perlakuan normal.';
      case 'waspada': return 'Perlu perhatian khusus. Disarankan merebus air sebelum diminum.';
      case 'rawan': return 'Ada indikasi kontaminasi. Gunakan sumber air alternatif dan filter tambahan.';
      case 'bahaya': return 'Air tidak aman dikonsumsi. Ikuti instruksi dari puskesmas.';
      default: return 'Data keamanan sedang diperbarui. Tetap berhati-hati.';
    }
  };

  const getSafetyRecommendations = (level: string) => {
    switch (level) {
      case 'aman':
        return [
          'Lanjutkan konsumsi air dengan normal',
          'Tetap rebus air untuk minum',
          'Rutin cek kondisi air setiap bulan'
        ];
      case 'waspada':
        return [
          'Rebus air minimal 10 menit sebelum konsumsi',
          'Gunakan filter air tambahan',
          'Hindari konsumsi air mentah'
        ];
      case 'rawan':
        return [
          'Gunakan air kemasan untuk minum',
          'Hindari mandi dengan air yang tercemar',
          'Segera laporkan ke puskesmas'
        ];
      case 'bahaya':
        return [
          'HENTIKAN konsumsi air dari sumber ini',
          'Gunakan sumber air alternatif yang terjamin',
          'Segera hubungi puskesmas untuk bantuan'
        ];
      default:
        return ['Tetap waspada dan ikuti perkembangan informasi'];
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat informasi keamanan air...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="bg-blue-100 p-3 rounded-xl mr-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                  Informasi Keamanan Air
                </h1>
                <p className="text-gray-600 mt-1">
                  Pantau kondisi air di wilayah Anda
                </p>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('status')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'status'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Status
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Riwayat
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Tab */}
        {activeTab === 'status' && (
          <div className="space-y-8">
            {/* Current Safety Status */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Status Keamanan Air</h2>
                    <p className="text-gray-600">Kondisi terkini berdasarkan tes laboratorium</p>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-5 h-5 mr-2" />
                    <span className="font-medium">Wilayah Anda</span>
                  </div>
                </div>

                {areaSafety ? (
                  <div className="space-y-6">
                    <div className={`p-6 rounded-xl ${getSafetyColor(areaSafety.safety_level).bg} ${getSafetyColor(areaSafety.safety_level).border} border-2`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <div className="mr-4">
                            {getSafetyIcon(areaSafety.safety_level)}
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-2xl font-bold">Status: {areaSafety.safety_level.toUpperCase()}</h3>
                              <span className={`px-3 py-1 rounded-full font-bold ${getSafetyColor(areaSafety.safety_level).bg} ${getSafetyColor(areaSafety.safety_level).text}`}>
                                {areaSafety.total_contaminants} kontaminan terdeteksi
                              </span>
                            </div>
                            <p className="mt-3 text-lg">{getSafetyDescription(areaSafety.safety_level)}</p>
                            {areaSafety.main_contaminant && (
                              <div className="mt-4 flex items-center">
                                <AlertCircle className="w-5 h-5 text-gray-500 mr-2" />
                                <span className="font-medium">Kontaminan utama: {areaSafety.main_contaminant}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Tanggal Tes</p>
                          <p className="font-bold text-lg">{formatDate(areaSafety.test_date)}</p>
                          <p className="text-sm text-gray-600 mt-2">Kelurahan</p>
                          <p className="font-medium">{areaSafety.kelurahan || 'Tidak ditentukan'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="bg-blue-50 p-6 rounded-xl">
                      <h4 className="font-bold text-gray-800 mb-4 flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2 text-blue-600" />
                        Rekomendasi Tindakan
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {getSafetyRecommendations(areaSafety.safety_level).map((rec, index) => (
                          <div key={index} className="bg-white p-4 rounded-lg shadow-sm">
                            <div className="flex items-start">
                              <div className="bg-blue-100 p-2 rounded-lg mr-3">
                                {areaSafety.safety_level === 'aman' || areaSafety.safety_level === 'waspada' ? (
                                  <CheckCircle className="w-5 h-5 text-blue-600" />
                                ) : (
                                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                                )}
                              </div>
                              <p className="text-gray-700">{rec}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Data Keamanan Belum Tersedia
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Puskesmas belum melakukan tes keamanan air di wilayah Anda.
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                      <div className="flex items-start">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-800">Tetap Waspada</p>
                          <p className="text-sm text-yellow-700 mt-1">
                            Selalu rebus air sebelum dikonsumsi dan laporkan jika menemukan ketidaknormalan.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Water Sources & Quick Actions */}
              <div className="space-y-8">
                {/* Safety Stats */}
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="font-bold text-gray-800 mb-6 flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Statistik Keamanan Wilayah
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Sumber Air Aman</span>
                        <span className="font-bold text-lg">
                          {stats.sources_aman}/{stats.sources_total}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-green-600 h-3 rounded-full" 
                          style={{ 
                            width: stats.sources_total > 0 ? `${(stats.sources_aman / stats.sources_total) * 100}%` : '0%' 
                          }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Laporan Bulan Ini</span>
                        <span className="font-bold text-lg">{stats.laporan_bulan_ini}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-blue-600 h-3 rounded-full" 
                          style={{ 
                            width: stats.laporan_bulan_ini > 10 ? '100%' : `${stats.laporan_bulan_ini * 10}%` 
                          }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Rata-rata Waktu Respon</span>
                        <span className="font-bold text-lg">{stats.avg_response_time} hari</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-yellow-600 h-3 rounded-full" 
                          style={{ 
                            width: Math.min(stats.avg_response_time * 20, 100) + '%' 
                          }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Total Laporan</span>
                        <span className="font-bold text-lg">{stats.total_laporan}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-purple-600 h-3 rounded-full" 
                          style={{ 
                            width: Math.min(stats.total_laporan, 100) + '%' 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Stats & Safety Tips */}
              <div className="space-y-8">
                {/* Safety Tips */}
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                    <Info className="w-5 h-5 mr-2" />
                    Tips Keamanan Air
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="bg-green-100 p-2 rounded-lg mr-3 flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">Sebelum Konsumsi</h4>
                        <ul className="text-sm text-gray-600 mt-1 space-y-1">
                          <li>• Rebus air hingga mendidih (minimal 10 menit)</li>
                          <li>• Periksa warna, bau, dan rasa air</li>
                          <li>• Simpan air dalam wadah bersih tertutup</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="bg-blue-100 p-2 rounded-lg mr-3 flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">Jika Air Bermasalah</h4>
                        <ul className="text-sm text-gray-600 mt-1 space-y-1">
                          <li>• Segera hentikan konsumsi</li>
                          <li>• Laporkan ke puskesmas terdekat</li>
                          <li>• Gunakan sumber air alternatif</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="bg-purple-100 p-2 rounded-lg mr-3 flex-shrink-0">
                        <Users className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">Untuk Keluarga</h4>
                        <ul className="text-sm text-gray-600 mt-1 space-y-1">
                          <li>• Berikan air matang untuk anak-anak</li>
                          <li>• Pastikan ibu hamil minum air yang aman</li>
                          <li>• Edukasi keluarga tentang pentingnya air bersih</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Riwayat Keamanan Air</h2>
              
              {safetyHistory.length > 0 ? (
                <div className="space-y-4">
                  {safetyHistory.map((item) => {
                    const color = getSafetyColor(item.safety_level);
                    return (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center">
                            <div className={`p-3 rounded-xl mr-4 ${color.bg}`}>
                              {getSafetyIcon(item.safety_level)}
                            </div>
                            <div>
                              <h3 className="text-lg font-bold">{item.kelurahan || item.kecamatan}</h3>
                              <div className="flex items-center mt-2">
                                <span className={`px-3 py-1 rounded-full font-bold ${color.bg} ${color.text}`}>
                                  {item.safety_level.toUpperCase()}
                                </span>
                                <span className="mx-3 text-gray-400">•</span>
                                <span className="text-gray-600">{item.total_contaminants} kontaminan terdeteksi</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">{formatDate(item.test_date)}</div>
                            <div className="text-sm text-gray-500">Tanggal Tes</div>
                          </div>
                        </div>
                        
                        {item.main_contaminant && (
                          <div className="bg-gray-50 p-4 rounded-lg mb-4">
                            <h4 className="font-medium text-gray-800 mb-2">Kontaminan Utama</h4>
                            <div className="flex items-center">
                              <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                              <span className="font-medium">{item.main_contaminant}</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-gray-800 mb-2">Status</h4>
                            <p className="text-gray-600">{getSafetyDescription(item.safety_level)}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-800 mb-2">Rekomendasi Saat Itu</h4>
                            <ul className="text-gray-600">
                              {getSafetyRecommendations(item.safety_level).slice(0, 2).map((rec, idx) => (
                                <li key={idx} className="flex items-start mb-1">
                                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Belum Ada Riwayat
                  </h3>
                  <p className="text-gray-600">
                    Puskesmas belum melakukan tes keamanan air di wilayah Anda.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}