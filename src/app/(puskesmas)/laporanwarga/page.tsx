'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  RefreshCw,
  ShieldAlert,
  Droplets,
  Thermometer,
  Activity,
  ChevronRight,
  X,
  Image as ImageIcon,
  MessageSquare,
  FileEdit,
  BarChart3,
  Settings,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import toast from 'react-hot-toast';

type Report = {
  id: string;
  user_id: string;
  bau: string;
  rasa: string;
  warna: string;
  lokasi: string;
  deskripsi?: string;
  foto_url?: string;
  status: 'pending' | 'diproses' | 'selesai' | 'ditolak';
  created_at: string;
  updated_at?: string;
  catatan?: string;
  user?: {
    id: string;
    nama: string;
    email: string;
    phone?: string;
    alamat?: string;
    rt?: string;
    rw?: string;
    kecamatan?: string;
  };
};

export default function PuskesmasLaporanPage() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterCondition, setFilterCondition] = useState<{
    bau?: string;
    rasa?: string;
    warna?: string;
  }>({});

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    diproses: 0,
    selesai: 0,
    ditolak: 0,
    bermasalah: 0,
    bulanIni: 0
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user || !profile) return;

    fetchReports();
  }, [user, profile, authLoading]);

  // Deep linking handling
  const searchParams = useSearchParams();
  const reportIdParam = searchParams.get('id');

  useEffect(() => {
    if (reportIdParam && reports.length > 0) {
      const targetReport = reports.find(r => r.id === reportIdParam);
      if (targetReport) {
        setSelectedReport(targetReport);
        setShowModal(true);
      }
    }
  }, [reportIdParam, reports]);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      setIsRefreshing(true);

      console.log('🔍 Mengambil data laporan untuk puskesmas...');

      const kecamatan = profile?.kecamatan;

      if (!kecamatan) {
        console.error('Kecamatan puskesmas tidak ditemukan');
        toast.error('Data puskesmas tidak lengkap');
        return;
      }

      console.log('📍 Kecamatan puskesmas:', kecamatan);

      // STEP 1: Ambil semua warga di kecamatan ini
      const { data: wargaData, error: wargaError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'warga')
        .eq('kecamatan', kecamatan);

      if (wargaError) {
        console.error('❌ Error mengambil warga:', wargaError);
        throw wargaError;
      }

      const wargaIds = wargaData?.map(w => w.id) || [];
      console.log(`👥 Ditemukan ${wargaIds.length} warga di kecamatan ${kecamatan}`);

      if (wargaIds.length === 0) {
        console.log('📭 Tidak ada warga di kecamatan ini');
        setReports([]);
        updateStats([]);
        toast.success('Belum ada warga terdaftar di kecamatan ini');
        return;
      }

      // STEP 2: Ambil laporan dari warga-warga tersebut
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select(`
          *,
          user:users!reports_user_id_fkey (
            id,
            nama,
            email,
            phone,
            kecamatan
          )
        `)
        .in('user_id', wargaIds)
        .order('created_at', { ascending: false });

      if (reportsError) {
        console.error('❌ Error mengambil laporan:', reportsError);
        throw reportsError;
      }

      console.log(`📄 Ditemukan ${reportsData?.length || 0} laporan dari warga kecamatan ${kecamatan}`);

      // STEP 3: Format data
      const reportsWithUsers: Report[] = (reportsData || []).map(report => ({
        id: report.id,
        user_id: report.user_id,
        bau: report.bau || 'tidak_berbau',
        rasa: report.rasa || 'normal',
        warna: report.warna || 'jernih',
        lokasi: report.lokasi || '',
        deskripsi: report.keterangan || '',
        foto_url: report.foto_url,
        status: report.status || 'pending',
        created_at: report.created_at,
        updated_at: report.updated_at,
        catatan: report.catatan,
        user: report.user ? {
          id: report.user.id,
          nama: report.user.nama || 'Warga',
          email: report.user.email || '',
          phone: report.user.phone || '',
          alamat: '',
          rt: '',
          rw: '',
          kecamatan: report.user.kecamatan || kecamatan
        } : {
          id: report.user_id,
          nama: 'Warga',
          email: '',
          phone: '',
          alamat: '',
          rt: '',
          rw: '',
          kecamatan: kecamatan
        }
      }));

      setReports(reportsWithUsers);
      updateStats(reportsWithUsers);

      console.log('✅ Data laporan berhasil diambil');


    } catch (err: any) {
      console.error('❌ Error mengambil laporan:', err);
      toast.error('Gagal memuat data laporan: ' + err.message, {
        icon: '❌'
      });
      setReports([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const updateStats = (reportsList: Report[]) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const reportsThisMonth = reportsList.filter(report =>
      new Date(report.created_at) >= startOfMonth
    );

    const bermasalahReports = reportsList.filter(report =>
      report.bau !== 'tidak_berbau' ||
      report.rasa !== 'normal' ||
      report.warna !== 'jernih'
    );

    setStats({
      total: reportsList.length,
      pending: reportsList.filter(r => r.status === 'pending').length,
      diproses: reportsList.filter(r => r.status === 'diproses').length,
      selesai: reportsList.filter(r => r.status === 'selesai').length,
      ditolak: reportsList.filter(r => r.status === 'ditolak').length,
      bermasalah: bermasalahReports.length,
      bulanIni: reportsThisMonth.length
    });
  };

  const handleRefresh = async () => {
    await fetchReports();
    toast.success('Data diperbarui');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'diproses': return <Activity className="w-5 h-5 text-blue-500" />;
      case 'selesai': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'ditolak': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Menunggu';
      case 'diproses': return 'Diproses';
      case 'selesai': return 'Selesai';
      case 'ditolak': return 'Ditolak';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100';
      case 'diproses': return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
      case 'selesai': return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
      case 'ditolak': return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getConditionIcon = (type: string, value: string) => {
    const isProblem = ['berbau_besi', 'berbau_busuk', 'berbau_kaporit', 'tidak_normal', 'pahit', 'asin', 'keruh', 'kecoklatan', 'kehijauan', 'panas'].includes(value);

    switch (type) {
      case 'bau':
        return isProblem ? <ShieldAlert className="w-4 h-4 text-red-500" /> : <Droplets className="w-4 h-4 text-green-500" />;
      case 'rasa':
        return isProblem ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warna':
        return <Thermometer className="w-4 h-4 text-blue-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConditionText = (type: string, value: string) => {
    const texts: Record<string, Record<string, string>> = {
      bau: {
        'tidak_berbau': 'Normal',
        'berbau_besi': 'Berbau Besi',
        'berbau_busuk': 'Berbau Busuk',
        'berbau_kaporit': 'Berbau Kaporit'
      },
      rasa: {
        'normal': 'Normal',
        'tidak_normal': 'Tidak Normal',
        'pahit': 'Pahit',
        'asin': 'Asin'
      },
      warna: {
        'jernih': 'Jernih',
        'keruh': 'Keruh',
        'kecoklatan': 'Kecoklatan',
        'kehijauan': 'Kehijauan'
      }
    };

    return texts[type]?.[value] || value.replace('_', ' ');
  };

  const getConditionColor = (type: string, value: string) => {
    const isProblem = ['berbau_besi', 'berbau_busuk', 'berbau_kaporit', 'tidak_normal', 'pahit', 'asin', 'keruh', 'kecoklatan', 'kehijauan', 'panas'].includes(value);
    return isProblem ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold';
  };

  const isWaterProblematic = (report: Report) => {
    return report.bau !== 'tidak_berbau' || report.rasa !== 'normal' || report.warna !== 'jernih';
  };

  const filteredReports = reports.filter(report => {
    // Filter pencarian
    const matchesSearch =
      (report.user?.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.lokasi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.deskripsi || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.bau.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.rasa.toLowerCase().includes(searchQuery.toLowerCase());

    // Filter status
    const matchesStatus =
      filterStatus === 'all' || report.status === filterStatus;

    // Filter kondisi air
    const matchesCondition =
      (!filterCondition.bau || report.bau === filterCondition.bau) &&
      (!filterCondition.rasa || report.rasa === filterCondition.rasa) &&
      (!filterCondition.warna || report.warna === filterCondition.warna);

    return matchesSearch && matchesStatus && matchesCondition;
  });

  const handleStatusUpdate = async (reportId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      // Update local state
      const updatedReports = reports.map(report =>
        report.id === reportId
          ? { ...report, status: newStatus as any, updated_at: new Date().toISOString() }
          : report
      );

      setReports(updatedReports);
      updateStats(updatedReports);

      // Update selected report if open
      if (selectedReport?.id === reportId) {
        setSelectedReport(prev => prev ? { ...prev, status: newStatus as any } : null);
      }

      console.log('✅ Status diperbarui:', reportId, newStatus);
      toast.success(`Status diubah menjadi ${getStatusText(newStatus)}`, {
        icon: '✅'
      });

    } catch (error: any) {
      console.error('❌ Error mengupdate status:', error);
      toast.error('Gagal mengupdate status laporan', {
        icon: '❌'
      });
    }
  };



  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setShowModal(true);
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Nama Pelapor', 'Email', 'Telepon', 'Lokasi', 'RT/RW', 'Kecamatan', 'Status', 'Tanggal', 'Bau', 'Rasa', 'Warna', 'Deskripsi', 'Catatan'];
    const csvContent = [
      headers.join(','),
      ...filteredReports.map(report => [
        report.id,
        `"${report.user?.nama || '-'}"`,
        report.user?.email || '-',
        `"${report.user?.phone || '-'}"`,
        `"${report.lokasi}"`,
        `RT ${report.user?.rt || '-'}/RW ${report.user?.rw || '-'}`,
        report.user?.kecamatan || '-',
        getStatusText(report.status),
        format(new Date(report.created_at), 'yyyy-MM-dd HH:mm'),
        getConditionText('bau', report.bau),
        getConditionText('rasa', report.rasa),
        getConditionText('warna', report.warna),
        `"${report.deskripsi || ''}"`,
        `"${report.catatan || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `laporan-puskesmas-${profile?.kecamatan || 'data'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast.success('Data berhasil diexport ke CSV', {
      icon: '📥'
    });
  };

  const exportToPDF = () => {
    toast.success('Fitur export PDF akan segera tersedia', {
      icon: '📄'
    });
  };

  const printReport = () => {
    window.print();
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterDate('');
    setFilterCondition({});
    setShowAdvancedFilters(false);
    toast.success('Semua filter telah direset', {
      icon: '🔄'
    });
  };

  // Condition options for filters
  const conditionOptions = {
    bau: [
      { value: '', label: 'Semua Bau' },
      { value: 'tidak_berbau', label: 'Normal' },
      { value: 'berbau_besi', label: 'Berbau Besi' },
      { value: 'berbau_busuk', label: 'Berbau Busuk' },
      { value: 'berbau_kaporit', label: 'Berbau Kaporit' }
    ],
    rasa: [
      { value: '', label: 'Semua Rasa' },
      { value: 'normal', label: 'Normal' },
      { value: 'tidak_normal', label: 'Tidak Normal' },
      { value: 'pahit', label: 'Pahit' },
      { value: 'asin', label: 'Asin' }
    ],
    warna: [
      { value: '', label: 'Semua Warna' },
      { value: 'jernih', label: 'Jernih' },
      { value: 'keruh', label: 'Keruh' },
      { value: 'kecoklatan', label: 'Kecoklatan' },
      { value: 'kehijauan', label: 'Kehijauan' }
    ]
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
        <div className="relative mb-6">
          <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-30"></div>
          <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
        </div>
        <h2 className="text-xl font-bold text-blue-700 mb-2">Air Bersih</h2>
        <p className="text-gray-600">Memuat halaman laporan...</p>
        <p className="text-sm text-gray-400 mt-2">Menyiapkan data untuk {profile?.kecamatan || 'wilayah Anda'}</p>
      </div>
    );
  }

  if (!profile || profile.role !== 'puskesmas') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white p-4">
        <div className="text-center max-w-md">
          <div className="relative mx-auto mb-6">
            <div className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-30"></div>
            <AlertCircle className="relative w-16 h-16 text-red-500 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Akses Ditolak</h2>
          <p className="text-gray-600 mb-6">
            Halaman ini hanya dapat diakses oleh akun puskesmas.
            Silakan login dengan akun puskesmas untuk melanjutkan.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/login'}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Login ke Akun Puskesmas
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6 print:bg-white print:p-0">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 print:shadow-none print:rounded-none">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Manajemen Laporan Puskesmas
                </h1>
                <p className="text-gray-600 mt-1">
                  {profile?.nama || 'Puskesmas'} • {profile?.kecamatan || 'Wilayah'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date().toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date().toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              <span>•</span>
              <span className="text-blue-600 font-medium">
                {filteredReports.length} dari {reports.length} laporan
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Memperbarui...' : 'Refresh Data'}
            </button>
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-3 bg-gradient-to-br from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white rounded-xl font-medium">
                <Download className="w-4 h-4" />
                Export
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <button
                  onClick={exportToCSV}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Export ke CSV
                </button>
                <button
                  onClick={exportToPDF}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Export ke PDF
                </button>
                <button
                  onClick={printReport}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg flex items-center gap-2 print:hidden"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Laporan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-6 print:grid-cols-3">
        <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600 mt-1">Total Laporan</div>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-600 mt-1">Menunggu</div>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.diproses}</div>
              <div className="text-sm text-gray-600 mt-1">Diproses</div>
            </div>
            <Activity className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.selesai}</div>
              <div className="text-sm text-gray-600 mt-1">Selesai</div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-red-600">{stats.ditolak}</div>
              <div className="text-sm text-gray-600 mt-1">Ditolak</div>
            </div>
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-orange-600">{stats.bermasalah}</div>
              <div className="text-sm text-gray-600 mt-1">Bermasalah</div>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-600">{stats.bulanIni}</div>
              <div className="text-sm text-gray-600 mt-1">Bulan Ini</div>
            </div>
            <Calendar className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none print:rounded-none">
        {/* Filters Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari laporan (nama, lokasi, deskripsi)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white min-w-[180px]"
                >
                  <option value="all">Semua Status</option>
                  <option value="pending">Menunggu</option>
                  <option value="diproses">Diproses</option>
                  <option value="selesai">Selesai</option>
                  <option value="ditolak">Ditolak</option>
                </select>
              </div>

              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />

              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 flex items-center gap-2 font-medium"
              >
                <Filter className="w-4 h-4" />
                Filter Lanjutan
              </button>

              <button
                onClick={clearAllFilters}
                className="px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 flex items-center gap-2 font-medium"
              >
                <X className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-700">Filter Kondisi Air</h3>
                <button
                  onClick={() => setFilterCondition({})}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Reset kondisi
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kondisi Bau
                  </label>
                  <select
                    value={filterCondition.bau || ''}
                    onChange={(e) => setFilterCondition(prev => ({ ...prev, bau: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {conditionOptions.bau.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kondisi Rasa
                  </label>
                  <select
                    value={filterCondition.rasa || ''}
                    onChange={(e) => setFilterCondition(prev => ({ ...prev, rasa: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {conditionOptions.rasa.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kondisi Warna
                  </label>
                  <select
                    value={filterCondition.warna || ''}
                    onChange={(e) => setFilterCondition(prev => ({ ...prev, warna: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {conditionOptions.warna.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{filteredReports.length}</span> laporan ditemukan
              {filterStatus !== 'all' && (
                <span className="ml-2">
                  (Status: <span className="font-medium">{getStatusText(filterStatus)}</span>)
                </span>
              )}
              {filterDate && (
                <span className="ml-2">
                  (Tanggal: <span className="font-medium">{new Date(filterDate).toLocaleDateString('id-ID')}</span>)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-16">
              <div className="relative mx-auto mb-6">
                <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-30"></div>
                <div className="relative animate-spin rounded-full h-14 w-14 border-4 border-blue-600 border-t-transparent mx-auto"></div>
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">Memuat Data Laporan</h3>
              <p className="text-gray-500">
                Mengambil data dari wilayah {profile?.kecamatan || 'Anda'}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Mohon tunggu sebentar...
              </p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <FileText className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-700 mb-3">
                {searchQuery || filterStatus !== 'all' || filterDate || Object.values(filterCondition).some(v => v)
                  ? 'Tidak ada laporan yang sesuai'
                  : 'Belum ada laporan'
                }
              </h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                {searchQuery || filterStatus !== 'all' || filterDate || Object.values(filterCondition).some(v => v)
                  ? 'Coba ubah filter atau kata kunci pencarian Anda'
                  : `Belum ada laporan dari warga di kecamatan ${profile?.kecamatan || 'Anda'}. Laporan akan muncul saat warga membuat laporan.`
                }
              </p>
              <button
                onClick={clearAllFilters}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Tampilkan Semua Laporan
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Pelapor
                    </div>
                  </th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Lokasi & Kondisi
                    </div>
                  </th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Status
                  </th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Waktu
                  </th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    className={`hover:bg-gray-50 transition-colors ${isWaterProblematic(report) ? 'bg-red-50/30 hover:bg-red-50/50' : ''
                      }`}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {report.user?.nama || 'Warga'}
                          </div>
                          <div className="text-sm text-gray-500 mt-1 space-y-1">
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {report.user?.email || '-'}
                            </div>
                            {report.user?.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {report.user.phone}
                              </div>
                            )}
                            {report.user?.kecamatan && (
                              <div className="text-xs text-blue-600 font-medium mt-1 px-2 py-0.5 bg-blue-50 rounded-full inline-block">
                                {report.user.kecamatan}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-1">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {report.lokasi}
                          </div>
                          {report.user?.rt && report.user?.rw && (
                            <div className="text-xs text-gray-500">
                              RT {report.user.rt}/RW {report.user.rw}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className={`text-center p-2 rounded-lg border ${getConditionColor('bau', report.bau).includes('red') ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                            <div className="text-xs text-gray-500 mb-1">Bau</div>
                            <div className={`text-sm font-medium ${getConditionColor('bau', report.bau)}`}>
                              {getConditionText('bau', report.bau)}
                            </div>
                          </div>
                          <div className={`text-center p-2 rounded-lg border ${getConditionColor('rasa', report.rasa).includes('red') ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                            <div className="text-xs text-gray-500 mb-1">Rasa</div>
                            <div className={`text-sm font-medium ${getConditionColor('rasa', report.rasa)}`}>
                              {getConditionText('rasa', report.rasa)}
                            </div>
                          </div>
                          <div className={`text-center p-2 rounded-lg border ${getConditionColor('warna', report.warna).includes('red') ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                            <div className="text-xs text-gray-500 mb-1">Warna</div>
                            <div className={`text-sm font-medium ${getConditionColor('warna', report.warna)}`}>
                              {getConditionText('warna', report.warna)}
                            </div>
                          </div>
                        </div>

                        {report.deskripsi && (
                          <div className="text-sm text-gray-600 line-clamp-2">
                            "{report.deskripsi}"
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(report.status)}
                          <select
                            value={report.status}
                            onChange={(e) => handleStatusUpdate(report.id, e.target.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${getStatusColor(report.status)} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer`}
                          >
                            <option value="pending">Menunggu</option>
                            <option value="diproses">Diproses</option>
                            <option value="selesai">Selesai</option>
                            <option value="ditolak">Ditolak</option>
                          </select>
                        </div>

                        {report.updated_at && (
                          <div className="text-xs text-gray-500">
                            Update: {format(new Date(report.updated_at), 'dd/MM HH:mm')}
                          </div>
                        )}

                        {report.catatan && (
                          <div className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded-lg">
                            <div className="font-medium mb-1">Catatan:</div>
                            <div className="line-clamp-2">{report.catatan}</div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900 font-medium">
                          {format(new Date(report.created_at), 'dd MMM yyyy', { locale: id })}
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(report.created_at), 'HH:mm', { locale: id })}
                        </div>
                        <div className="text-xs text-gray-400">
                          {format(new Date(report.created_at), 'EEEE', { locale: id })}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleViewReport(report)}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-br from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white rounded-lg text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          Detail
                        </button>

                        {isWaterProblematic(report) && (
                          <div className="text-xs text-red-600 font-medium px-2 py-1 bg-red-50 rounded-lg text-center border border-red-200">
                            ⚠️ Air Bermasalah
                          </div>
                        )}

                        {report.foto_url && (
                          <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            Ada foto
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination/Summary */}
        {filteredReports.length > 0 && !isLoading && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-600">
                Menampilkan <span className="font-medium">{filteredReports.length}</span> dari{' '}
                <span className="font-medium">{reports.length}</span> laporan
                {searchQuery && (
                  <span> untuk pencarian "<span className="font-medium">{searchQuery}</span>"</span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{stats.pending}</span> menunggu •{' '}
                  <span className="font-medium">{stats.diproses}</span> diproses
                </div>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                  <ChevronRight className="w-4 h-4 rotate-90" />
                  Kembali ke atas
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl shadow-lg p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            Panduan Pengelolaan Laporan
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="w-3 h-3 text-yellow-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Status Menunggu</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Laporan baru yang perlu segera ditindaklanjuti dalam 1x24 jam. Prioritas untuk laporan dengan kondisi air bermasalah.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Activity className="w-3 h-3 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Status Diproses</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Laporan sedang dalam penanganan tim lapangan. Update status setiap 3 hari sekali atau sesuai progress.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-3 h-3 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Status Selesai</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Laporan telah ditangani dan diselesaikan. Tambahkan catatan sebagai dokumentasi tindakan yang telah dilakukan.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertCircle className="w-3 h-3 text-red-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Status Ditolak</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Untuk laporan yang tidak valid, duplikat, atau di luar wilayah kerja. Berikan alasan penolakan yang jelas.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Statistik & Informasi Wilayah
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600 mt-1">Total Laporan</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <div className="text-2xl font-bold text-orange-600">{stats.bermasalah}</div>
                <div className="text-sm text-gray-600 mt-1">Air Bermasalah</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200">
                <span className="text-gray-700">Kecamatan</span>
                <span className="font-medium text-blue-600">{profile?.kecamatan || '-'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200">
                <span className="text-gray-700">Puskesmas</span>
                <span className="font-medium text-gray-800">{profile?.nama || '-'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200">
                <span className="text-gray-700">Laporan Bulan Ini</span>
                <span className="font-medium text-green-600">{stats.bulanIni} laporan</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Data terakhir diperbarui: {new Date().toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-sm text-gray-500 print:hidden">
        <p>© {new Date().getFullYear()} Sistem Laporan Air Bersih • Puskesmas {profile?.kecamatan || 'Wilayah'}</p>
        <p className="mt-1">Halaman ini menampilkan laporan dari warga di wilayah kerja Anda</p>
      </div>

      {/* Modal Detail Report */}
      {showModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Detail Laporan Lengkap</h3>
                  <p className="text-gray-600 mt-1">ID: #{selectedReport.id.slice(0, 8)}</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Informasi Pelapor */}
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Informasi Pelapor
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500 block mb-1">Nama Lengkap</label>
                      <p className="font-medium text-gray-900">{selectedReport.user?.nama || 'Tidak diketahui'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 block mb-1">Email</label>
                      <p className="font-medium text-gray-900">{selectedReport.user?.email || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 block mb-1">Nomor Telepon</label>
                      <p className="font-medium text-gray-900">{selectedReport.user?.phone || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 block mb-1">Alamat Lengkap</label>
                      <p className="font-medium text-gray-900">{selectedReport.user?.alamat || '-'}</p>
                    </div>
                    {selectedReport.user?.rt && selectedReport.user?.rw && (
                      <div>
                        <label className="text-sm text-gray-500 block mb-1">RT/RW</label>
                        <p className="font-medium text-gray-900">RT {selectedReport.user.rt}/RW {selectedReport.user.rw}</p>
                      </div>
                    )}
                    {selectedReport.user?.kecamatan && (
                      <div>
                        <label className="text-sm text-gray-500 block mb-1">Kecamatan</label>
                        <p className="font-medium text-gray-900">{selectedReport.user.kecamatan}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Kondisi Air */}
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-blue-600" />
                    Kondisi Air yang Dilaporkan
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <div className={`text-center p-4 rounded-xl border ${getConditionColor('bau', selectedReport.bau).includes('red') ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                      <div className="text-sm text-gray-500 mb-2">Bau</div>
                      <div className="text-xl font-bold mb-2">
                        {getConditionText('bau', selectedReport.bau)}
                      </div>
                      {getConditionIcon('bau', selectedReport.bau)}
                    </div>
                    <div className={`text-center p-4 rounded-xl border ${getConditionColor('rasa', selectedReport.rasa).includes('red') ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                      <div className="text-sm text-gray-500 mb-2">Rasa</div>
                      <div className="text-xl font-bold mb-2">
                        {getConditionText('rasa', selectedReport.rasa)}
                      </div>
                      {getConditionIcon('rasa', selectedReport.rasa)}
                    </div>
                    <div className={`text-center p-4 rounded-xl border ${getConditionColor('warna', selectedReport.warna).includes('red') ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                      <div className="text-sm text-gray-500 mb-2">Warna</div>
                      <div className="text-xl font-bold mb-2">
                        {getConditionText('warna', selectedReport.warna)}
                      </div>
                      {getConditionIcon('warna', selectedReport.warna)}
                    </div>
                  </div>

                  {selectedReport.deskripsi && (
                    <div>
                      <label className="text-sm text-gray-500 block mb-2">Deskripsi Tambahan</label>
                      <p className="text-gray-700 bg-white p-4 rounded-xl border border-gray-200">
                        {selectedReport.deskripsi}
                      </p>
                    </div>
                  )}
                </div>

                {/* Lokasi & Waktu */}
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Lokasi & Waktu Laporan
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm text-gray-500 block mb-2">Lokasi Kejadian</label>
                      <p className="font-medium text-gray-900 text-lg">{selectedReport.lokasi}</p>
                      {selectedReport.user?.rt && selectedReport.user?.rw && (
                        <p className="text-gray-600 mt-1">RT {selectedReport.user.rt}/RW {selectedReport.user.rw}</p>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-500 block mb-1">Dilaporkan pada</label>
                        <p className="font-medium text-gray-900">
                          {format(new Date(selectedReport.created_at), 'dd MMMM yyyy HH:mm', { locale: id })}
                        </p>
                      </div>
                      {selectedReport.updated_at && (
                        <div>
                          <label className="text-sm text-gray-500 block mb-1">Terakhir diupdate</label>
                          <p className="font-medium text-gray-900">
                            {format(new Date(selectedReport.updated_at), 'dd MMMM yyyy HH:mm', { locale: id })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status & Catatan */}
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FileEdit className="w-5 h-5 text-blue-600" />
                    Status & Catatan
                  </h4>

                  <div className="mb-6">
                    <label className="text-sm text-gray-500 block mb-3">Ubah Status Laporan</label>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => handleStatusUpdate(selectedReport.id, 'pending')}
                        className={`px-4 py-2.5 rounded-lg font-medium border transition-colors ${selectedReport.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        Menunggu
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedReport.id, 'diproses')}
                        className={`px-4 py-2.5 rounded-lg font-medium border transition-colors ${selectedReport.status === 'diproses'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        Diproses
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedReport.id, 'selesai')}
                        className={`px-4 py-2.5 rounded-lg font-medium border transition-colors ${selectedReport.status === 'selesai'
                          ? 'bg-green-100 text-green-800 border-green-300'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        Selesai
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedReport.id, 'ditolak')}
                        className={`px-4 py-2.5 rounded-lg font-medium border transition-colors ${selectedReport.status === 'ditolak'
                          ? 'bg-red-100 text-red-800 border-red-300'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        Ditolak
                      </button>
                    </div>
                  </div>

                  <div>
                    {selectedReport.catatan && (
                      <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-500 mb-2">Catatan Saat Ini:</div>
                        <p className="text-gray-700">{selectedReport.catatan}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Foto jika ada */}
                {selectedReport.foto_url && (
                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-blue-600" />
                      Foto Pendukung
                    </h4>
                    <div className="flex justify-center">
                      <img
                        src={selectedReport.foto_url}
                        alt="Foto laporan"
                        className="max-w-full h-auto rounded-xl border border-gray-300 shadow-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzZjZmOSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiM5Y2EwYTYiPkZvdG8gdGlkYWsgdGVyc2VkaWE8L3RleHQ+PC9zdmc+';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between gap-4">
                <div className="text-sm text-gray-500">
                  <p>Laporan ID: {selectedReport.id}</p>
                  <p className="mt-1">Dibuat: {format(new Date(selectedReport.created_at), 'dd/MM/yyyy HH:mm:ss')}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 border bg-gradient-to-br from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 border-gray-300 text-white rounded-lg font-medium"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}