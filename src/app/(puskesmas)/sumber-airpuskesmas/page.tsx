'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import {
  MapPin,
  Plus,
  Filter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Search,
  Edit,
  Trash2,
  Navigation,
  Download,
  Shield,
  TrendingUp,
  Loader2,
  Map,
  Layers,
  Eye,
  EyeOff,
  RefreshCw,
  FileText,
  BarChart3,
  Settings,
  AlertCircle,
  Star,
  Home,
  Droplets,
  Thermometer,
  Clock,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';

// Dynamic import untuk peta
const WaterSourceMap = dynamic(() => import('@/components/puskesmas/WaterSourceMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <p className="ml-3 text-gray-600">Memuat peta...</p>
    </div>
  )
});

interface WaterSource {
  id: string;
  nama: string;
  jenis: 'sumur' | 'pdam' | 'mata_air' | 'sungai' | 'embung';
  status: 'aman' | 'rawan' | 'tidak_aman';
  latitude: number;
  longitude: number;
  alamat: string;
  kecamatan: string;
  last_checked?: string;
  created_at?: string;
  updated_at?: string;
  catatan: string | null;
}

type WaterSourceFormData = {
  nama: string;
  jenis: string;
  status: string;
  latitude: number;
  longitude: number;
  alamat: string;
  kecamatan: string;
  catatan: string;
};

export default function SumberAirPage() {
  const { profile, user } = useAuth();
  const [sources, setSources] = useState<WaterSource[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterJenis, setFilterJenis] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSource, setEditingSource] = useState<WaterSource | null>(null);
  const [mapView, setMapView] = useState<'map' | 'satellite'>('map');
  const [selectedSource, setSelectedSource] = useState<WaterSource | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    aman: 0,
    rawan: 0,
    tidak_aman: 0
  });

  useEffect(() => {
    if (user && profile) {
      fetchWaterSources();
    }
  }, [user, profile]);

  useEffect(() => {
    if (user && profile) {
      // Debounce untuk search query
      const timer = setTimeout(() => {
        fetchWaterSources();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [filterStatus, filterJenis, searchQuery]);

  // Fetch global stats independent of filters
  const fetchStats = async () => {
    if (!profile?.kecamatan) return;

    try {
      const { data, error } = await supabase
        .from('water_sources')
        .select('status')
        .eq('kecamatan', profile.kecamatan);

      if (error) throw error;

      if (data) {
        setStats({
          total: data.length,
          aman: data.filter(s => s.status === 'aman').length,
          rawan: data.filter(s => s.status === 'rawan').length,
          tidak_aman: data.filter(s => s.status === 'tidak_aman').length
        });
      }
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
    }
  };

  useEffect(() => {
    if (user && profile) {
      fetchStats();
    }
  }, [user, profile]);

  const fetchWaterSources = async () => {
    try {
      setIsLoading(true);

      console.log('🔍 Fetching water sources for:', profile?.kecamatan);

      // Query untuk semua sumber air di kecamatan puskesmas
      let query = supabase
        .from('water_sources')
        .select('*')
        .eq('kecamatan', profile?.kecamatan || '')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (filterJenis !== 'all') {
        query = query.eq('jenis', filterJenis);
      }

      if (searchQuery) {
        query = query.or(`nama.ilike.%${searchQuery}%,alamat.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching water sources:', error);
        toast.error('Gagal memuat data sumber air');
        return;
      }

      console.log('✅ Water sources found:', data?.length || 0);

      const sourcesData = data || [];
      setSources(sourcesData);

      setSources(sourcesData);

      // Stats are now fetched separately via fetchStats()


    } catch (error) {
      console.error('❌ Error in fetchWaterSources:', error);
      toast.error('Terjadi kesalahan saat memuat data');
    } finally {
      setIsLoading(false);
    }
  };



  const handleAddSource = async (formData: WaterSourceFormData) => {
    try {
      // Konversi data dengan benar
      const sourceData = {
        nama: formData.nama,
        jenis: formData.jenis,
        status: formData.status,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        alamat: formData.alamat,
        kecamatan: profile?.kecamatan || '',
        catatan: formData.catatan || null,
        puskesmas_id: user?.id || ''
      };

      console.log('📝 Inserting water source:', sourceData);

      const { data, error } = await supabase
        .from('water_sources')
        .insert([sourceData])
        .select()
        .single(); // Gunakan .single() untuk mendapatkan satu record

      if (error) {
        console.error('❌ Supabase insert error:', error);
        toast.error(`Gagal menambahkan sumber air: ${error.message}`);
        return;
      }

      console.log('✅ Water source added:', data);
      toast.success('Sumber air berhasil ditambahkan');

      // Update local state
      setSources(prev => [data, ...prev]);

      // Refresh stats from server to ensure accuracy
      fetchStats();

      setShowAddModal(false);

    } catch (error: any) {
      console.error('❌ Error adding water source:', error);
      toast.error(error.message || 'Gagal menambahkan sumber air');
    }
  };

  const handleUpdateSource = async (formData: WaterSourceFormData) => {
    if (!editingSource) return;

    try {
      const updateData = {
        ...formData,
        latitude: parseFloat(formData.latitude.toString()),
        longitude: parseFloat(formData.longitude.toString())
      };

      console.log('📝 Updating water source:', updateData);

      const { error } = await supabase
        .from('water_sources')
        .update(updateData)
        .eq('id', editingSource.id);

      if (error) throw error;

      toast.success('Sumber air berhasil diperbarui');
      fetchWaterSources();
      fetchStats(); // Update stats in case status changed
      setShowEditModal(false);
      setEditingSource(null);

    } catch (error: any) {
      console.error('❌ Error updating water source:', error);
      toast.error(error.message || 'Gagal memperbarui sumber air');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus sumber air ini?')) return;

    try {
      const { error } = await supabase
        .from('water_sources')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Sumber air berhasil dihapus');
      fetchWaterSources();
      fetchStats();
    } catch (error) {
      console.error('❌ Error deleting water source:', error);
      toast.error('Gagal menghapus sumber air');
    }
  };



  const handleViewDetails = (source: WaterSource) => {
    setSelectedSource(source);
  };



  const exportToCSV = () => {
    const headers = ['Nama', 'Jenis', 'Status', 'Alamat', 'Kecamatan', 'Terakhir Dicek'];
    const csvContent = [
      headers.join(','),
      ...sources.map(source => [
        `"${source.nama}"`,
        source.jenis,
        source.status,
        `"${source.alamat}"`,
        source.kecamatan,
        source.last_checked ? format(new Date(source.last_checked), 'yyyy-MM-dd') : '-'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sumber-air-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (!profile || profile.role !== 'puskesmas') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Akses Ditolak</h2>
          <p className="text-gray-600 mt-2">Hanya untuk akun puskesmas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Droplets className="w-8 h-8 text-blue-600" />
            Manajemen Sumber Air
          </h1>
          <p className="text-gray-600 mt-2">
            {profile?.nama || 'Puskesmas'} - Kecamatan {profile?.kecamatan || 'Wilayah'}
            <span className="text-sm text-blue-600 ml-2">
              ({stats.total} sumber air terdaftar)
            </span>
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={fetchWaterSources}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Sumber
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          </div>
          <div className="text-sm text-gray-600">Total Sumber</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div className="text-2xl font-bold text-green-600">{stats.aman}</div>
          </div>
          <div className="text-sm text-gray-600">Aman</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <div className="text-2xl font-bold text-yellow-600">{stats.rawan}</div>
          </div>
          <div className="text-sm text-gray-600">Rawan</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <div className="text-2xl font-bold text-red-600">{stats.tidak_aman}</div>
          </div>
          <div className="text-sm text-gray-600">Tidak Aman</div>
        </div>

      </div>

      {/* Map Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Map className="w-5 h-5 text-blue-600" />
              Peta Sumber Air
            </h3>
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setMapView('map')}
                className={`px-3 py-1 text-sm ${mapView === 'map' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700'}`}
              >
                Peta
              </button>
            </div>
          </div>
          <button
            onClick={fetchWaterSources}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Peta
          </button>
        </div>

        <div className="h-[400px] rounded-lg overflow-hidden border border-gray-300">
          <WaterSourceMap
            sources={sources}
            mapType={mapView}
          />
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Aman</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>Rawan</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Tidak Aman</span>
            </div>
          </div>
          <span>{sources.length} sumber air ditampilkan</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari sumber air (nama, alamat, kelurahan)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="all">Semua Status</option>
              <option value="aman">Aman</option>
              <option value="rawan">Rawan</option>
              <option value="tidak_aman">Tidak Aman</option>
            </select>

            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="all">Semua Jenis</option>
              <option value="sumur">Sumur</option>
              <option value="pdam">PDAM</option>
              <option value="mata_air">Mata Air</option>
              <option value="sungai">Sungai</option>
              <option value="embung">Embung</option>
            </select>

            <button
              onClick={() => {
                setFilterStatus('all');
                setFilterJenis('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Reset Filter
            </button>
          </div>
        </div>

        {/* Sources Table - TELAH DIPERBAIKI: Menghapus kolom kategori, kapasitas, pengguna, RT/RW */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Memuat data sumber air...</p>
            <p className="text-sm text-gray-400 mt-2">Mengambil data dari database</p>
          </div>
        ) : sources.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center">
              <MapPin className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-600 text-lg font-medium mb-2">
                {searchQuery || filterStatus !== 'all' || filterJenis !== 'all'
                  ? 'Tidak ada sumber air yang sesuai dengan filter'
                  : 'Belum ada sumber air terdaftar'}
              </p>
              <p className="text-gray-400 max-w-md text-center mb-4">
                {!searchQuery && filterStatus === 'all' && filterJenis === 'all'
                  ? `Mulai dengan menambahkan sumber air pertama di kecamatan ${profile?.kecamatan || 'wilayah Anda'}.`
                  : 'Coba ubah kata kunci pencarian atau filter yang diterapkan.'}
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Tambah Sumber Air Pertama
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Nama Sumber</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Jenis</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Lokasi</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Terakhir Dicek</th>

                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sources.map((source) => (
                  <tr key={source.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{source.nama}</div>
                      <div className="text-xs text-gray-500">
                        ID: {source.id.substring(0, 8)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-900">{getJenisText(source.jenis)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="max-w-xs">
                        <div className="text-sm text-gray-900">{source.alamat}</div>
                        <div className="text-xs text-gray-500">
                          {source.kecamatan}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(source.status)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(source.status)}`}>
                          {getStatusText(source.status)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-900">
                        {source.last_checked ? format(new Date(source.last_checked), 'dd MMM yyyy', { locale: id }) : '-'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {source.last_checked ? format(new Date(source.last_checked), 'HH:mm', { locale: id }) : ''}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetails(source)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Detail"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(source.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            const url = `https://www.google.com/maps?q=${source.latitude},${source.longitude}`;
                            window.open(url, '_blank');
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Navigasi"
                        >
                          <Navigation className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl shadow p-6 border border-blue-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              Panduan Status Sumber Air
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Aman:</strong> Air layak minum, bebas kontaminasi, memenuhi standar kesehatan</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <span><strong>Rawan:</strong> Potensi kontaminasi, perlu pemantauan rutin, kondisi menurun</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span><strong>Tidak Aman:</strong> Terkontaminasi, berbahaya untuk dikonsumsi, perlu penanganan segera</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Settings className="w-5 h-5 text-green-600" />
              Tips Manajemen
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span>Update status sumber air secara berkala (minimal 1 bulan sekali)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span>Verifikasi data sumber air untuk keakuratan informasi</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span>Prioritaskan penanganan sumber air dengan status "Tidak Aman"</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span>Gunakan fitur peta untuk monitoring distribusi sumber air</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Add Water Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[2000] animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-2 duration-300">
            <AddWaterSourceForm
              onClose={() => setShowAddModal(false)}
              onSubmit={handleAddSource}
              kecamatan={profile?.kecamatan || ''}
            />
          </div>
        </div>
      )}

      {/* Edit Water Source Modal */}
      {showEditModal && editingSource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[2000] animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-2 duration-300">
            <EditWaterSourceForm
              source={editingSource}
              onClose={() => {
                setShowEditModal(false);
                setEditingSource(null);
              }}
              onSubmit={handleUpdateSource}
            />
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedSource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[2000] animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-2 duration-300">
            <WaterSourceDetail
              source={selectedSource}
              onClose={() => setSelectedSource(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Komponen Form Tambah Sumber Air
function AddWaterSourceForm({ onClose, onSubmit, kecamatan }: {
  onClose: () => void;
  onSubmit: (data: WaterSourceFormData) => void;
  kecamatan: string;
}) {
  const [formData, setFormData] = useState<WaterSourceFormData>({
    nama: '',
    jenis: 'sumur',
    status: 'aman',
    latitude: -6.9667,
    longitude: 110.4167,
    alamat: '',
    kecamatan: kecamatan,
    catatan: ''
  });

  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
          setIsLoadingLocation(false);
          toast.success('Lokasi berhasil diperoleh');
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Gagal mendapatkan lokasi: ' + error.message);
          setIsLoadingLocation(false);
        }
      );
    } else {
      toast.error('Browser tidak mendukung geolocation');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error in form submission:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Tambah Sumber Air Baru</h3>
          <p className="text-gray-600">Kecamatan: {kecamatan}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl transition-colors"
          type="button"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nama Sumber Air */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Sumber Air *
            </label>
            <input
              type="text"
              name="nama"
              value={formData.nama}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Contoh: Sumur Bor RT 03"
            />
            <p className="text-xs text-gray-500 mt-1">Masukkan nama sumber air dengan jelas</p>
          </div>

          {/* Jenis Sumber Air */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jenis Sumber Air *
            </label>
            <select
              name="jenis"
              value={formData.jenis}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="sumur">Sumur</option>
              <option value="pdam">PDAM</option>
              <option value="mata_air">Mata Air</option>
              <option value="sungai">Sungai</option>
              <option value="embung">Embung</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status *
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="aman">Aman</option>
              <option value="rawan">Rawan</option>
              <option value="tidak_aman">Tidak Aman</option>
            </select>
          </div>

          {/* Koordinat GPS */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Koordinat GPS *
            </label>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={isLoadingLocation}
              className="mt-2 flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              {isLoadingLocation ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mendapatkan lokasi...
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  Gunakan Lokasi Saat Ini
                </>
              )}
            </button>
          </div>
        </div>

        {/* Alamat Lengkap */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alamat Lengkap *
          </label>
          <textarea
            name="alamat"
            value={formData.alamat}
            onChange={handleChange}
            required
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Contoh: Jl. Merdeka No. 10, RT 03/RW 01, Kelurahan Pudakpayung"
          />
        </div>

        {/* Catatan Tambahan */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Catatan Tambahan
          </label>
          <textarea
            name="catatan"
            value={formData.catatan}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Tambahkan catatan atau informasi penting lainnya..."
          />
          <p className="text-xs text-gray-500 mt-1">Opsional: kondisi sumber air, akses, atau informasi lain</p>
        </div>

        {/* Legend Section */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-medium text-gray-800 mb-3">Legend Sumber Air</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-700">Aman: Air layak minum, bebas kontaminasi</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-sm text-gray-700">Rawan: Potensi kontaminasi, perlu pemantauan</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-gray-700">Tidak Aman: Terkontaminasi, berbahaya</span>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="pt-4 border-t">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Tambah Sumber Air'
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            * Wajib diisi
          </p>
        </div>
      </form>
    </div>
  );
}


// Komponen Form Edit Sumber Air
function EditWaterSourceForm({ source, onClose, onSubmit }: {
  source: WaterSource;
  onClose: () => void;
  onSubmit: (data: WaterSourceFormData) => void;
}) {
  const [formData, setFormData] = useState<WaterSourceFormData>({
    nama: source.nama,
    jenis: source.jenis,
    status: source.status,
    latitude: source.latitude,
    longitude: source.longitude,
    alamat: source.alamat,
    kecamatan: source.kecamatan,
    catatan: source.catatan || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Edit Sumber Air</h3>
          <p className="text-gray-600">ID: #{source.id.substring(0, 8)}...</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl transition-colors"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Sumber Air *
            </label>
            <input
              type="text"
              name="nama"
              value={formData.nama}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jenis Sumber Air *
            </label>
            <select
              name="jenis"
              value={formData.jenis}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="sumur">Sumur</option>
              <option value="pdam">PDAM</option>
              <option value="mata_air">Mata Air</option>
              <option value="sungai">Sungai</option>
              <option value="embung">Embung</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status *
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="aman">Aman</option>
              <option value="rawan">Rawan</option>
              <option value="tidak_aman">Tidak Aman</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alamat Lengkap *
          </label>
          <textarea
            name="alamat"
            value={formData.alamat}
            onChange={handleChange}
            required
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Latitude *
            </label>
            <input
              type="number"
              step="any"
              name="latitude"
              value={formData.latitude}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Longitude *
            </label>
            <input
              type="number"
              step="any"
              name="longitude"
              value={formData.longitude}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Catatan Tambahan
          </label>
          <textarea
            name="catatan"
            value={formData.catatan}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="pt-4 border-t">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Update Sumber Air
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// Komponen Detail Sumber Air
function WaterSourceDetail({ source, onClose }: {
  source: WaterSource;
  onClose: () => void;
}) {
  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Detail Sumber Air</h3>
          <p className="text-gray-600">{source.nama}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="space-y-6">
        {/* Informasi Utama */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Droplets className="w-5 h-5" />
            Informasi Sumber Air
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">Nama Sumber</label>
              <p className="font-medium">{source.nama}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Jenis</label>
              <p className="font-medium">{getJenisText(source.jenis)}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Status</label>
              <p className={`font-medium ${source.status === 'aman' ? 'text-green-600' : source.status === 'rawan' ? 'text-yellow-600' : 'text-red-600'}`}>
                {getStatusText(source.status)}
              </p>
            </div>
          </div>
        </div>

        {/* Lokasi */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Lokasi
          </h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-500">Alamat Lengkap</label>
              <p className="font-medium">{source.alamat}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Kecamatan</label>
                <p className="font-medium">{source.kecamatan}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Koordinat</label>
                <p className="font-medium">{source.latitude.toFixed(6)}, {source.longitude.toFixed(6)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Timeline
          </h4>
          <div className="space-y-2">
            {source.created_at && (
              <div className="flex justify-between">
                <span className="text-gray-500">Ditambahkan</span>
                <span className="font-medium">
                  {format(new Date(source.created_at), 'dd MMM yyyy HH:mm', { locale: id })}
                </span>
              </div>
            )}
            {source.updated_at && (
              <div className="flex justify-between">
                <span className="text-gray-500">Terakhir Diupdate</span>
                <span className="font-medium">
                  {format(new Date(source.updated_at), 'dd MMM yyyy HH:mm', { locale: id })}
                </span>
              </div>
            )}
            {source.last_checked && (
              <div className="flex justify-between">
                <span className="text-gray-500">Terakhir Dicek</span>
                <span className="font-medium">
                  {format(new Date(source.last_checked), 'dd MMM yyyy HH:mm', { locale: id })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Catatan */}
        {source.catatan && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3">Catatan Tambahan</h4>
            <p className="text-gray-700">{source.catatan}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-8 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Tutup
        </button>
        <a
          href={`https://www.google.com/maps?q=${source.latitude},${source.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
        >
          <Navigation className="w-4 h-4" />
          Lihat di Google Maps
        </a>
      </div>
    </div>
  );
}

// Helper functions
function getStatusIcon(status: string) {
  switch (status) {
    case 'aman': return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'rawan': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case 'tidak_aman': return <XCircle className="w-5 h-5 text-red-500" />;
    default: return <MapPin className="w-5 h-5 text-gray-500" />;
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'aman': return 'Aman';
    case 'rawan': return 'Rawan';
    case 'tidak_aman': return 'Tidak Aman';
    default: return status;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'aman': return 'bg-green-100 text-green-800 border-green-200';
    case 'rawan': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'tidak_aman': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getJenisText(jenis: string): string {
  const jenisMap: Record<string, string> = {
    'sumur': 'Sumur',
    'pdam': 'PDAM',
    'mata_air': 'Mata Air',
    'sungai': 'Sungai',
    'embung': 'Embung'
  };
  return jenisMap[jenis] || jenis;
}