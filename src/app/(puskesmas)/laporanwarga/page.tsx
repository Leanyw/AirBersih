'use client';

import { useEffect, useState } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Link from 'next/link';

type Report = {
  id: string;
  user_id: string;
  bau: string;
  rasa: string;
  warna: string;
  suhu?: number;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    diproses: 0,
    selesai: 0,
    ditolak: 0
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user || !profile) return;

    fetchReports();
    
  }, [user, profile, authLoading]);

const fetchReports = async () => {
  try {
    setIsLoading(true);

    if (!profile?.kecamatan) {
      console.error('❌ Kecamatan puskesmas tidak ditemukan');
      return;
    }

    console.log('🔍 Fetching reports for kecamatan:', profile.kecamatan);

    // 1. Ambil reports berdasarkan kecamatan
    const { data: reportsData, error: reportsError } = await supabase
      .from('reports')
      .select('*')
      .eq('kecamatan', profile.kecamatan)
      .order('created_at', { ascending: false });

    if (reportsError) {
      console.error('❌ Error fetching reports:', reportsError);
      throw reportsError;
    }

    if (!reportsData || reportsData.length === 0) {
      console.log('📭 No reports found');
      setReports([]);
      setStats({
        total: 0,
        pending: 0,
        diproses: 0,
        selesai: 0,
        ditolak: 0
      });
      return;
    }

    console.log('📊 Found reports:', reportsData.length);

    // 2. Ambil semua user_id yang unik
    const uniqueUserIds = [...new Set(reportsData.map(r => r.user_id).filter(Boolean))];
    console.log('👥 Unique user IDs:', uniqueUserIds.length);

    // 3. Fetch semua users sekaligus (BATCH)
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, nama, email, phone, alamat, rt, rw, kecamatan')
      .in('id', uniqueUserIds);

    if (usersError) {
      console.warn('⚠️ Error fetching users:', usersError);
    }

    console.log('👤 Users fetched:', usersData?.length || 0);

    // 4. Buat Map untuk akses cepat user data
    const usersMap = new Map();
    (usersData || []).forEach(user => {
      usersMap.set(user.id, user);
    });

    // 5. Gabungkan data reports dengan users
    const reportsWithUsers: Report[] = reportsData.map(report => ({
      id: report.id,
      user_id: report.user_id,
      bau: report.bau || '',
      rasa: report.rasa || '',
      warna: report.warna || '',
      suhu: report.suhu,
      lokasi: report.lokasi || '',
      deskripsi: report.keterangan || report.deskripsi || '',
      foto_url: report.foto_url,
      status: report.status || 'pending',
      created_at: report.created_at,
      updated_at: report.updated_at,
      catatan: report.catatan,
      user: usersMap.get(report.user_id) || {
        id: report.user_id,
        nama: 'Warga',
        email: '-',
        phone: '-',
        alamat: '-',
        kecamatan: 'Tidak diketahui'
      }
    }));

    console.log('✅ Reports with users processed:', reportsWithUsers.length);

    setReports(reportsWithUsers);

    // Update stats
    setStats({
      total: reportsWithUsers.length,
      pending: reportsWithUsers.filter(r => r.status === 'pending').length,
      diproses: reportsWithUsers.filter(r => r.status === 'diproses').length,
      selesai: reportsWithUsers.filter(r => r.status === 'selesai').length,
      ditolak: reportsWithUsers.filter(r => r.status === 'ditolak').length,
    });

  } catch (err) {
    console.error('❌ Error in fetchReports:', err);
    setReports([]);
  } finally {
    setIsLoading(false);
  }
};

const fetchAllReports = async () => {
  try {
    console.log('🔄 Fetching all reports...');
    setIsLoading(true);
    
    // 1. Ambil reports (tanpa filter kecamatan)
    const { data: reportsData, error: reportsError } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (reportsError) {
      console.error('❌ Error fetching reports:', reportsError);
      throw reportsError;
    }
    
    if (!reportsData || reportsData.length === 0) {
      console.log('📭 No reports found');
      setReports([]);
      return;
    }
    
    console.log(`📄 Found ${reportsData.length} reports`);
    
    // 2. Collect semua user_id yang unik
    const uniqueUserIds = [...new Set(reportsData.map(r => r.user_id).filter(Boolean))];
    console.log('👥 Unique user IDs:', uniqueUserIds.length);
    
    // 3. Batch fetch semua users
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, nama, email, phone, alamat, rt, rw, kecamatan')
      .in('id', uniqueUserIds);
    
    if (usersError) {
      console.warn('⚠️ Error fetching users:', usersError);
    }
    
    console.log(`👤 Users found: ${usersData?.length || 0}`);
    
    // 4. Buat map untuk akses cepat
    const usersMap = new Map();
    (usersData || []).forEach(user => {
      usersMap.set(user.id, user);
    });
    
    // 5. Gabungkan data
    const reportsWithUsers: Report[] = reportsData.map(report => ({
      id: report.id,
      user_id: report.user_id,
      bau: report.bau || '',
      rasa: report.rasa || '',
      warna: report.warna || '',
      suhu: report.suhu,
      lokasi: report.lokasi || '',
      deskripsi: report.keterangan || report.deskripsi || '',
      foto_url: report.foto_url,
      status: report.status || 'pending',
      created_at: report.created_at,
      updated_at: report.updated_at,
      catatan: report.catatan,
      user: usersMap.get(report.user_id) || {
        id: report.user_id,
        nama: 'Warga',
        email: '-',
        phone: '-',
        alamat: '-',
        kecamatan: 'Tidak diketahui'
      }
    }));
    
    setReports(reportsWithUsers);
    console.log('✅ Processed reports with users:', reportsWithUsers.length);
    
    // Update stats
    setStats({
      total: reportsWithUsers.length,
      pending: reportsWithUsers.filter(r => r.status === 'pending').length,
      diproses: reportsWithUsers.filter(r => r.status === 'diproses').length,
      selesai: reportsWithUsers.filter(r => r.status === 'selesai').length,
      ditolak: reportsWithUsers.filter(r => r.status === 'ditolak').length,
    });
    
  } catch (error) {
    console.error('❌ Error in fetchAllReports:', error);
    setReports([]);
  } finally {
    setIsLoading(false);
  }
};

const getSafeUserData = (user: any) => {
  if (!user) {
    return {
      id: '',
      nama: 'Tidak diketahui',
      email: '',
      phone: '',
      alamat: '',
      kecamatan: 'Tidak diketahui'
    };
  }
  return {
    id: user.id || '',
    nama: user.nama || 'Tidak diketahui',
    email: user.email || '',
    phone: user.phone || '',
    kecamatan: user.kecamatan || ''
  };
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
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'diproses': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'selesai': return 'bg-green-100 text-green-800 border-green-200';
      case 'ditolak': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConditionIcon = (type: string, value: string) => {
    const isProblem = ['berbau', 'tidak_normal', 'keruh', 'kecoklatan', 'panas'].includes(value);
    
    switch (type) {
      case 'bau':
        return isProblem ? <ShieldAlert className="w-4 h-4 text-red-500" /> : <Droplets className="w-4 h-4 text-green-500" />;
      case 'rasa':
        return isProblem ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warna':
        return isProblem ? <AlertCircle className="w-4 h-4 text-red-500" /> : <Droplets className="w-4 h-4 text-green-500" />;
      case 'suhu':
        return <Thermometer className="w-4 h-4 text-blue-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConditionText = (type: string, value: string) => {
    switch (type) {
      case 'bau':
        return value === 'tidak_berbau' ? 'Normal' : value.replace('_', ' ');
      case 'rasa':
        return value === 'normal' ? 'Normal' : 'Tidak Normal';
      case 'warna':
        return value === 'jernih' ? 'Jernih' : value;
      default:
        return value;
    }
  };

  const getConditionColor = (type: string, value: string) => {
    const isProblem = ['berbau', 'tidak_normal', 'keruh', 'kecoklatan', 'panas'].includes(value);
    return isProblem ? 'text-red-600' : 'text-green-600';
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      (report.user?.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.lokasi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.deskripsi || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.bau.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.rasa.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      filterStatus === 'all' || report.status === filterStatus;
    
    return matchesSearch && matchesStatus;
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
      setReports(reports.map(report => 
        report.id === reportId 
          ? { ...report, status: newStatus as any, updated_at: new Date().toISOString() }
          : report
      ));

      // Update selected report if open
      if (selectedReport?.id === reportId) {
        setSelectedReport(prev => prev ? { ...prev, status: newStatus as any } : null);
      }

      console.log('✅ Status updated:', reportId, newStatus);

    } catch (error) {
      console.error('❌ Error updating status:', error);
      alert('Gagal mengupdate status laporan');
    }
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setShowModal(true);
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Nama Pelapor', 'Email', 'Telepon', 'Lokasi', 'Status', 'Tanggal', 'Bau', 'Rasa', 'Warna', 'Deskripsi'];
    const csvContent = [
      headers.join(','),
      ...filteredReports.map(report => [
        report.id,
        `"${report.user?.nama || '-'}"`,
        report.user?.email || '-',
        report.user?.phone || '-',
        `"${report.lokasi}"`,
        report.status,
        format(new Date(report.created_at), 'yyyy-MM-dd HH:mm'),
        report.bau,
        report.rasa,
        report.warna,
        `"${report.deskripsi || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `laporan-puskesmas-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!profile || profile.role !== 'puskesmas') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
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
            <FileText className="w-8 h-8 text-blue-600" />
            Manajemen Laporan Puskesmas
          </h1>
          <p className="text-gray-600 mt-2">
            {profile?.nama || 'Puskesmas'} - {profile?.kecamatan || 'Wilayah'}
            <span className="text-sm text-blue-600 ml-2">
              ({reports.length} laporan ditemukan)
            </span>
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={fetchReports}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-gray-600">Menunggu</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="text-2xl font-bold text-blue-600">{stats.diproses}</div>
          <div className="text-sm text-gray-600">Diproses</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="text-2xl font-bold text-green-600">{stats.selesai}</div>
          <div className="text-sm text-gray-600">Selesai</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="text-2xl font-bold text-red-600">{stats.ditolak}</div>
          <div className="text-sm text-gray-600">Ditolak</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari laporan (nama, lokasi, deskripsi)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Menunggu</option>
              <option value="diproses">Diproses</option>
              <option value="selesai">Selesai</option>
              <option value="ditolak">Ditolak</option>
            </select>
            
            <button 
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('all');
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              Reset Filter
            </button>
          </div>
        </div>

        {/* Reports Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Memuat data laporan...</p>
            <p className="text-sm text-gray-400 mt-2">Mengambil data dari database</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Pelapor</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Lokasi</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Kondisi Air</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Tanggal</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">
                        {searchQuery || filterStatus !== 'all'
                          ? 'Tidak ada laporan yang sesuai dengan filter'
                          : 'Belum ada laporan dari warga di wilayah Anda'}
                      </p>
                      <p className="text-sm text-gray-400 mt-2">
                        {!searchQuery && filterStatus === 'all' && 
                          'Laporan akan muncul saat warga membuat laporan'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            {report.user?.nama || 'Tidak diketahui'}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {report.user?.email || '-'}
                          </div>
                          {report.user?.phone && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {report.user.phone}
                            </div>
                          )}
                          {report.user?.kecamatan && (
                            <div className="text-xs text-blue-500 mt-1">
                              {report.user.kecamatan}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <div className="max-w-xs">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {report.lokasi}
                            </div>
                            {report.user?.rt && report.user?.rw && (
                              <div className="text-xs text-gray-500">
                                RT {report.user.rt}/RW {report.user.rw}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getConditionIcon('bau', report.bau)}
                            <span className="text-sm">
                              <span className="text-gray-500">Bau: </span>
                              <strong className={getConditionColor('bau', report.bau)}>
                                {getConditionText('bau', report.bau)}
                              </strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getConditionIcon('rasa', report.rasa)}
                            <span className="text-sm">
                              <span className="text-gray-500">Rasa: </span>
                              <strong className={getConditionColor('rasa', report.rasa)}>
                                {getConditionText('rasa', report.rasa)}
                              </strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getConditionIcon('warna', report.warna)}
                            <span className="text-sm">
                              <span className="text-gray-500">Warna: </span>
                              <strong className={getConditionColor('warna', report.warna)}>
                                {getConditionText('warna', report.warna)}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(report.status)}
                          <select
                            value={report.status}
                            onChange={(e) => handleStatusUpdate(report.id, e.target.value)}
                            className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(report.status)} focus:outline-none focus:ring-1 focus:ring-blue-500`}
                          >
                            <option value="pending">Menunggu</option>
                            <option value="diproses">Diproses</option>
                            <option value="selesai">Selesai</option>
                            <option value="ditolak">Ditolak</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <div className="text-sm text-gray-900">
                            {format(new Date(report.created_at), 'dd MMM yyyy', { locale: id })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(report.created_at), 'HH:mm', { locale: id })}
                          </div>
                          {report.updated_at && (
                            <div className="text-xs text-gray-400 mt-1">
                              update: {format(new Date(report.updated_at), 'dd/MM', { locale: id })}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleViewReport(report)}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Lihat
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Panduan Status</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span><strong>Menunggu:</strong> Laporan baru diterima, belum ditindaklanjuti</span>
              </li>
              <li className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span><strong>Diproses:</strong> Sedang dalam penanganan petugas</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span><strong>Selesai:</strong> Telah ditangani dan selesai</span>
              </li>
              <li className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span><strong>Ditolak:</strong> Tidak valid atau duplikat</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Tips Manajemen</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Update status laporan secara berkala (max 2-3 hari)</li>
              <li>• Prioritaskan laporan dengan kondisi air bermasalah</li>
              <li>• Hubungi warga jika perlu informasi tambahan</li>
              <li>• Export data untuk keperluan pelaporan bulanan</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal Detail Report */}
      {showModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Detail Laporan</h3>
                  <p className="text-gray-600">ID: #{selectedReport.id}</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Informasi Pelapor */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Informasi Pelapor
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">Nama</label>
                      <p className="font-medium">{selectedReport.user?.nama || 'Tidak diketahui'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Email</label>
                      <p className="font-medium">{selectedReport.user?.email || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Telepon</label>
                      <p className="font-medium">{selectedReport.user?.phone || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Alamat</label>
                      <p className="font-medium">{selectedReport.user?.alamat || '-'}</p>
                    </div>
                    {selectedReport.user?.rt && selectedReport.user?.rw && (
                      <div>
                        <label className="text-sm text-gray-500">RT/RW</label>
                        <p className="font-medium">RT {selectedReport.user.rt}/RW {selectedReport.user.rw}</p>
                      </div>
                    )}
                    {selectedReport.user?.kecamatan && (
                      <div>
                        <label className="text-sm text-gray-500">Kecamatan</label>
                        <p className="font-medium">{selectedReport.user.kecamatan}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Kondisi Air */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Droplets className="w-5 h-5" />
                    Kondisi Air yang Dilaporkan
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-white rounded border">
                      <div className="text-sm text-gray-500 mb-1">Bau</div>
                      <div className={`font-bold ${getConditionColor('bau', selectedReport.bau)}`}>
                        {getConditionText('bau', selectedReport.bau)}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white rounded border">
                      <div className="text-sm text-gray-500 mb-1">Rasa</div>
                      <div className={`font-bold ${getConditionColor('rasa', selectedReport.rasa)}`}>
                        {getConditionText('rasa', selectedReport.rasa)}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white rounded border">
                      <div className="text-sm text-gray-500 mb-1">Warna</div>
                      <div className={`font-bold ${getConditionColor('warna', selectedReport.warna)}`}>
                        {getConditionText('warna', selectedReport.warna)}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white rounded border">
                      <div className="text-sm text-gray-500 mb-1">Suhu</div>
                      <div className="font-bold">
                        {selectedReport.suhu ? `${selectedReport.suhu}°C` : '-'}
                      </div>
                    </div>
                  </div>
                  
                  {selectedReport.deskripsi && (
                    <div className="mt-4">
                      <label className="text-sm text-gray-500">Deskripsi Tambahan</label>
                      <p className="text-gray-700 mt-1 bg-white p-3 rounded border">
                        {selectedReport.deskripsi}
                      </p>
                    </div>
                  )}
                </div>

                {/* Lokasi & Waktu */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Lokasi & Waktu
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm text-gray-500">Lokasi</label>
                      <p className="font-medium">{selectedReport.lokasi}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Dilaporkan pada</label>
                      <p className="font-medium">
                        {format(new Date(selectedReport.created_at), 'dd MMMM yyyy HH:mm', { locale: id })}
                      </p>
                    </div>
                    {selectedReport.updated_at && (
                      <div>
                        <label className="text-sm text-gray-500">Terakhir diupdate</label>
                        <p className="font-medium">
                          {format(new Date(selectedReport.updated_at), 'dd MMMM yyyy HH:mm', { locale: id })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Update */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3">Ubah Status</h4>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleStatusUpdate(selectedReport.id, 'pending')}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border ${selectedReport.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}
                    >
                      Menunggu
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedReport.id, 'diproses')}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border ${selectedReport.status === 'diproses' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}
                    >
                      Diproses
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedReport.id, 'selesai')}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border ${selectedReport.status === 'selesai' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}
                    >
                      Selesai
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedReport.id, 'ditolak')}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border ${selectedReport.status === 'ditolak' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}
                    >
                      Ditolak
                    </button>
                  </div>
                </div>

                {/* Foto jika ada */}
                {selectedReport.foto_url && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-3">Foto Pendukung</h4>
                    <img
                      src={selectedReport.foto_url}
                      alt="Foto laporan"
                      className="max-w-full h-auto rounded-lg border"
                    />
                  </div>
                )}
              </div>

              {/* Aksi */}
              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    // Navigate to detail page
                    window.location.href = `/puskesmas/laporan/${selectedReport.id}`;
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Halaman Detail Lengkap
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}