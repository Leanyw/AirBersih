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
  jenis: 'sumur_bor' | 'sumur_gali' | 'pdam' | 'mata_air' | 'sungai' | 'air_hujan' | 'lainnya';
  status: 'aman' | 'rawan' | 'tidak_aman';
  category: 'aman' | 'terancam' | 'berbahaya';
  latitude: number;
  longitude: number;
  alamat: string;
  kecamatan: string;
  kelurahan: string;
  rt: string;
  rw: string;
  kapasitas: number;
  pengguna_terdaftar: number;
  last_checked: string;
  created_at: string;
  updated_at: string;
  verified: boolean;
  verification_notes: string | null;
  puskesmas_id: string;
  kualitas_air: {
    ph: number;
    kekeruhan: number;
    zat_besi: number;
    klorin: number;
  } | null;
  catatan: string | null;
}

type WaterSourceFormData = {
  nama: string;
  jenis: string;
  status: string;
  category: string;
  latitude: number;
  longitude: number;
  alamat: string;
  kecamatan: string;
  kelurahan: string;
  rt: string;
  rw: string;
  kapasitas: string;
  pengguna_terdaftar: string;
  catatan: string;
};

export default function SumberAirPage() {
  const { profile, user } = useAuth();
  const [sources, setSources] = useState<WaterSource[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
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
    tidak_aman: 0,
    totalPengguna: 0,
    verified: 0,
    unverified: 0
  });

  useEffect(() => {
    if (user && profile) {
      fetchWaterSources();
    }
  }, [user, profile, filterStatus, filterCategory, filterJenis, searchQuery]);

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

      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory);
      }

      if (filterJenis !== 'all') {
        query = query.eq('jenis', filterJenis);
      }

      if (searchQuery) {
        query = query.or(`nama.ilike.%${searchQuery}%,alamat.ilike.%${searchQuery}%,kelurahan.ilike.%${searchQuery}%`);
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
      
      // Calculate stats
      calculateStats(sourcesData);
      
    } catch (error) {
      console.error('❌ Error in fetchWaterSources:', error);
      toast.error('Terjadi kesalahan saat memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (sourcesList: WaterSource[]) => {
    const total = sourcesList.length;
    const aman = sourcesList.filter(s => s.status === 'aman').length;
    const rawan = sourcesList.filter(s => s.status === 'rawan').length;
    const tidak_aman = sourcesList.filter(s => s.status === 'tidak_aman').length;
    const totalPengguna = sourcesList.reduce((sum, s) => sum + (s.pengguna_terdaftar || 0), 0);
    const verified = sourcesList.filter(s => s.verified).length;
    const unverified = total - verified;
    
    setStats({
      total,
      aman,
      rawan,
      tidak_aman,
      totalPengguna,
      verified,
      unverified
    });
  };

  const handleAddSource = async (formData: WaterSourceFormData) => {
    try {
      const sourceData = {
        ...formData,
        latitude: parseFloat(formData.latitude.toString()),
        longitude: parseFloat(formData.longitude.toString()),
        kapasitas: parseFloat(formData.kapasitas) || 0,
        pengguna_terdaftar: parseInt(formData.pengguna_terdaftar) || 0,
        kecamatan: profile?.kecamatan || '',
        puskesmas_id: user?.id || '',
        verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_checked: new Date().toISOString()
      };

      const { error } = await supabase
        .from('water_sources')
        .insert([sourceData]);

      if (error) throw error;

      toast.success('Sumber air berhasil ditambahkan');
      fetchWaterSources();
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
        longitude: parseFloat(formData.longitude.toString()),
        kapasitas: parseFloat(formData.kapasitas) || 0,
        pengguna_terdaftar: parseInt(formData.pengguna_terdaftar) || 0,
        updated_at: new Date().toISOString(),
        last_checked: new Date().toISOString()
      };

      const { error } = await supabase
        .from('water_sources')
        .update(updateData)
        .eq('id', editingSource.id);

      if (error) throw error;

      toast.success('Sumber air berhasil diperbarui');
      fetchWaterSources();
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
    } catch (error) {
      console.error('❌ Error deleting water source:', error);
      toast.error('Gagal menghapus sumber air');
    }
  };

  const handleVerify = async (id: string, verified: boolean, notes?: string) => {
    try {
      const updateData = {
        verified,
        verified_at: verified ? new Date().toISOString() : null,
        verification_notes: notes || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('water_sources')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      toast.success(`Sumber air ${verified ? 'diverifikasi' : 'dibatalkan verifikasi'}`);
      fetchWaterSources();
    } catch (error) {
      console.error('❌ Error verifying water source:', error);
      toast.error('Gagal memperbarui status verifikasi');
    }
  };

  const handleViewDetails = (source: WaterSource) => {
    setSelectedSource(source);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aman': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rawan': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'tidak_aman': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <MapPin className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aman': return 'Aman';
      case 'rawan': return 'Rawan';
      case 'tidak_aman': return 'Tidak Aman';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aman': return 'bg-green-100 text-green-800 border-green-200';
      case 'rawan': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'tidak_aman': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'aman': return 'Aman';
      case 'terancam': return 'Terancam';
      case 'berbahaya': return 'Berbahaya';
      default: return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'aman': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'terancam': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'berbahaya': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getJenisText = (jenis: string) => {
    const jenisMap: Record<string, string> = {
      'sumur_bor': 'Sumur Bor',
      'sumur_gali': 'Sumur Gali',
      'pdam': 'PDAM',
      'mata_air': 'Mata Air',
      'sungai': 'Sungai',
      'air_hujan': 'Air Hujan',
      'lainnya': 'Lainnya'
    };
    return jenisMap[jenis] || jenis;
  };

  const exportToCSV = () => {
    const headers = ['Nama', 'Jenis', 'Status', 'Kategori', 'Alamat', 'Kecamatan', 'Kelurahan', 'RT/RW', 'Kapasitas', 'Pengguna', 'Terakhir Dicek'];
    const csvContent = [
      headers.join(','),
      ...sources.map(source => [
        `"${source.nama}"`,
        source.jenis,
        source.status,
        source.category,
        `"${source.alamat}"`,
        source.kecamatan,
        source.kelurahan,
        `RT ${source.rt}/RW ${source.rw}`,
        `${source.kapasitas} L`,
        source.pengguna_terdaftar,
        format(new Date(source.last_checked), 'yyyy-MM-dd')
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
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-purple-600" />
            <div className="text-2xl font-bold text-purple-600">{stats.totalPengguna}</div>
          </div>
          <div className="text-sm text-gray-600">Total Pengguna</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-green-500" />
            <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
          </div>
          <div className="text-sm text-gray-600">Terverifikasi</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2">
            <EyeOff className="w-5 h-5 text-gray-500" />
            <div className="text-2xl font-bold text-gray-600">{stats.unverified}</div>
          </div>
          <div className="text-sm text-gray-600">Belum Diverifikasi</div>
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
              <button
                onClick={() => setMapView('satellite')}
                className={`px-3 py-1 text-sm ${mapView === 'satellite' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700'}`}
              >
                Satelit
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
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="all">Semua Kategori</option>
              <option value="aman">Aman</option>
              <option value="terancam">Terancam</option>
              <option value="berbahaya">Berbahaya</option>
            </select>
            
            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="all">Semua Jenis</option>
              <option value="sumur_bor">Sumur Bor</option>
              <option value="sumur_gali">Sumur Gali</option>
              <option value="pdam">PDAM</option>
              <option value="mata_air">Mata Air</option>
              <option value="sungai">Sungai</option>
              <option value="air_hujan">Air Hujan</option>
              <option value="lainnya">Lainnya</option>
            </select>
            
            <button 
              onClick={() => {
                setFilterStatus('all');
                setFilterCategory('all');
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

        {/* Sources Table */}
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
                {searchQuery || filterStatus !== 'all' || filterCategory !== 'all' || filterJenis !== 'all'
                  ? 'Tidak ada sumber air yang sesuai dengan filter'
                  : 'Belum ada sumber air terdaftar'}
              </p>
              <p className="text-gray-400 max-w-md text-center mb-4">
                {!searchQuery && filterStatus === 'all' && filterCategory === 'all' && filterJenis === 'all' 
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
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Lokasi</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Kategori</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Kapasitas & Pengguna</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Terakhir Dicek</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Verifikasi</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sources.map((source) => (
                  <tr key={source.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{source.nama}</div>
                      <div className="text-xs text-gray-500">
                        {getJenisText(source.jenis)} • 
                        <span className="ml-2">
                          Ditambahkan: {format(new Date(source.created_at), 'dd/MM/yy', { locale: id })}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="max-w-xs">
                        <div className="text-sm text-gray-900">{source.alamat}</div>
                        <div className="text-xs text-gray-500">
                          {source.kelurahan}, RT {source.rt}/RW {source.rw}
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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(source.category)}`}>
                        {getCategoryText(source.category)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="text-gray-500">Kapasitas: </span>
                          <span className="font-medium">{source.kapasitas} L</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">Pengguna: </span>
                          <span className="font-medium">{source.pengguna_terdaftar} KK</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-900">
                        {format(new Date(source.last_checked), 'dd MMM yyyy', { locale: id })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(source.last_checked), 'HH:mm', { locale: id })}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleVerify(source.id, !source.verified)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          source.verified 
                            ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {source.verified ? '✓ Terverifikasi' : 'Belum Diverifikasi'}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleViewDetails(source)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingSource(source);
                            setShowEditModal(true);
                          }}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                          title="Edit"
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
              Panduan Kategori Sumber Air
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-2 duration-300">
            <WaterSourceDetail
              source={selectedSource}
              onClose={() => setSelectedSource(null)}
              onVerify={handleVerify}
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
    jenis: 'sumur_bor',
    status: 'aman',
    category: 'aman',
    latitude: -6.9667,
    longitude: 110.4167,
    alamat: '',
    kecamatan: kecamatan,
    kelurahan: '',
    rt: '',
    rw: '',
    kapasitas: '',
    pengguna_terdaftar: '',
    catatan: ''
  });

  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

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
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Gagal mendapatkan lokasi');
          setIsLoadingLocation(false);
        }
      );
    } else {
      toast.error('Browser tidak mendukung geolocation');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
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
              placeholder="Contoh: Sumur Bor RT 03"
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
              <option value="sumur_bor">Sumur Bor</option>
              <option value="sumur_gali">Sumur Gali</option>
              <option value="pdam">PDAM</option>
              <option value="mata_air">Mata Air</option>
              <option value="sungai">Sungai</option>
              <option value="air_hujan">Air Hujan</option>
              <option value="lainnya">Lainnya</option>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategori *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="aman">Aman</option>
              <option value="terancam">Terancam</option>
              <option value="berbahaya">Berbahaya</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kelurahan
            </label>
            <input
              type="text"
              name="kelurahan"
              value={formData.kelurahan}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Contoh: Pudakpayung"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RT
              </label>
              <input
                type="text"
                name="rt"
                value={formData.rt}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RW
              </label>
              <input
                type="text"
                name="rw"
                value={formData.rw}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="01"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kapasitas (Liter)
            </label>
            <input
              type="number"
              name="kapasitas"
              value={formData.kapasitas}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="1000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pengguna Terdaftar (KK)
            </label>
            <input
              type="number"
              name="pengguna_terdaftar"
              value={formData.pengguna_terdaftar}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="50"
            />
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
            placeholder="Contoh: Jl. Merdeka No. 10, RT 03/RW 01, Kelurahan Pudakpayung"
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
          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={isLoadingLocation}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors mb-2"
          >
            <Navigation className="w-4 h-4" />
            {isLoadingLocation ? 'Mendapatkan lokasi...' : 'Gunakan Lokasi Saat Ini'}
          </button>
          <p className="text-xs text-gray-500">
            Klik untuk mendapatkan koordinat GPS otomatis dari perangkat Anda
          </p>
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
            placeholder="Tambahkan catatan atau informasi penting lainnya..."
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
              Tambah Sumber Air
            </button>
          </div>
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
    category: source.category,
    latitude: source.latitude,
    longitude: source.longitude,
    alamat: source.alamat,
    kecamatan: source.kecamatan,
    kelurahan: source.kelurahan,
    rt: source.rt,
    rw: source.rw,
    kapasitas: source.kapasitas.toString(),
    pengguna_terdaftar: source.pengguna_terdaftar.toString(),
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
        {/* Form fields sama seperti AddWaterSourceForm */}
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
              <option value="sumur_bor">Sumur Bor</option>
              <option value="sumur_gali">Sumur Gali</option>
              <option value="pdam">PDAM</option>
              <option value="mata_air">Mata Air</option>
              <option value="sungai">Sungai</option>
              <option value="air_hujan">Air Hujan</option>
              <option value="lainnya">Lainnya</option>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategori *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="aman">Aman</option>
              <option value="terancam">Terancam</option>
              <option value="berbahaya">Berbahaya</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kelurahan
            </label>
            <input
              type="text"
              name="kelurahan"
              value={formData.kelurahan}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RT
              </label>
              <input
                type="text"
                name="rt"
                value={formData.rt}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RW
              </label>
              <input
                type="text"
                name="rw"
                value={formData.rw}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kapasitas (Liter)
            </label>
            <input
              type="number"
              name="kapasitas"
              value={formData.kapasitas}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pengguna Terdaftar (KK)
            </label>
            <input
              type="number"
              name="pengguna_terdaftar"
              value={formData.pengguna_terdaftar}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
function WaterSourceDetail({ source, onClose, onVerify }: {
  source: WaterSource;
  onClose: () => void;
  onVerify: (id: string, verified: boolean, notes?: string) => void;
}) {
  const [verificationNotes, setVerificationNotes] = useState(source.verification_notes || '');

  const handleVerify = () => {
    onVerify(source.id, !source.verified, verificationNotes);
    onClose();
  };

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
            <div>
              <label className="text-sm text-gray-500">Kategori</label>
              <p className={`font-medium ${source.category === 'aman' ? 'text-blue-600' : source.category === 'terancam' ? 'text-orange-600' : 'text-red-600'}`}>
                {getCategoryText(source.category)}
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
                <label className="text-sm text-gray-500">Kelurahan</label>
                <p className="font-medium">{source.kelurahan}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">RT/RW</label>
                <p className="font-medium">RT {source.rt}/RW {source.rw}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Koordinat</label>
                <p className="font-medium">{source.latitude.toFixed(6)}, {source.longitude.toFixed(6)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Kapasitas & Pengguna */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Home className="w-5 h-5" />
            Kapasitas & Pengguna
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-white rounded border">
              <div className="text-2xl font-bold text-blue-600">{source.kapasitas} L</div>
              <div className="text-sm text-gray-500">Kapasitas Air</div>
            </div>
            <div className="text-center p-3 bg-white rounded border">
              <div className="text-2xl font-bold text-purple-600">{source.pengguna_terdaftar}</div>
              <div className="text-sm text-gray-500">Pengguna Terdaftar (KK)</div>
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
            <div className="flex justify-between">
              <span className="text-gray-500">Ditambahkan</span>
              <span className="font-medium">
                {format(new Date(source.created_at), 'dd MMM yyyy HH:mm', { locale: id })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Terakhir Diupdate</span>
              <span className="font-medium">
                {format(new Date(source.updated_at), 'dd MMM yyyy HH:mm', { locale: id })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Terakhir Dicek</span>
              <span className="font-medium">
                {format(new Date(source.last_checked), 'dd MMM yyyy HH:mm', { locale: id })}
              </span>
            </div>
          </div>
        </div>

        {/* Verifikasi */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Star className="w-5 h-5" />
            Status Verifikasi
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{source.verified ? '✓ Terverifikasi' : 'Belum Diverifikasi'}</p>
                {source.verified && source.verification_notes && (
                  <p className="text-sm text-gray-500 mt-1">{source.verification_notes}</p>
                )}
              </div>
              <button
                onClick={handleVerify}
                className={`px-4 py-2 rounded-lg font-medium ${
                  source.verified 
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                } transition-colors`}
              >
                {source.verified ? 'Batalkan Verifikasi' : 'Verifikasi Sekarang'}
              </button>
            </div>
            
            {!source.verified && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan Verifikasi (Opsional)
                </label>
                <textarea
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Tambahkan catatan verifikasi..."
                />
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

// Helper function untuk mendapatkan teks jenis
function getJenisText(jenis: string): string {
  const jenisMap: Record<string, string> = {
    'sumur_bor': 'Sumur Bor',
    'sumur_gali': 'Sumur Gali',
    'pdam': 'PDAM',
    'mata_air': 'Mata Air',
    'sungai': 'Sungai',
    'air_hujan': 'Air Hujan',
    'lainnya': 'Lainnya'
  };
  return jenisMap[jenis] || jenis;
}

// Helper function untuk mendapatkan teks kategori
function getCategoryText(category: string): string {
  switch (category) {
    case 'aman': return 'Aman';
    case 'terancam': return 'Terancam';
    case 'berbahaya': return 'Berbahaya';
    default: return category;
  }
}

// Helper function untuk mendapatkan teks status
function getStatusText(status: string): string {
  switch (status) {
    case 'aman': return 'Aman';
    case 'rawan': return 'Rawan';
    case 'tidak_aman': return 'Tidak Aman';
    default: return status;
  }
}