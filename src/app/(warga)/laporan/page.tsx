'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Clock, AlertCircle, CheckCircle, FileText, PlusCircle, Filter, Download } from 'lucide-react';

type Report = {
  id: string;
  status: string;
  bau: string;
  rasa: string;
  warna: string;
  lokasi: string;
  created_at: string;
  feedback: string | null;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Clock className="w-5 h-5 text-yellow-500" />;
    case 'diproses':
      return <AlertCircle className="w-5 h-5 text-blue-500" />;
    case 'selesai':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    default:
      return <Clock className="w-5 h-5 text-gray-400" />;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Menunggu';
    case 'diproses':
      return 'Diproses';
    case 'selesai':
      return 'Selesai';
    default:
      return status;
  }
};

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'diproses':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'selesai':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default function LaporanPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all'); // all, pending, diproses, selesai
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    
    fetchData();
  }, [user, authLoading]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching reports:', error.message);
      }
      
      setReports(data || []);
    } catch (error) {
      console.warn('Error in fetchData:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter reports berdasarkan status dan search term
  const filteredReports = reports.filter(report => {
    const matchesFilter = filter === 'all' || report.status === filter;
    const matchesSearch = searchTerm === '' || 
      report.lokasi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.bau.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.rasa.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  // Hitung statistik
  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    diproses: reports.filter(r => r.status === 'diproses').length,
    selesai: reports.filter(r => r.status === 'selesai').length,
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Memuat data laporan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Laporan Saya</h1>
              <p className="text-gray-600 mt-1">Riwayat dan status laporan yang telah Anda buat</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/lapor"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="font-medium">Buat Laporan Baru</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-center">
            <p className="text-gray-500 text-sm">Total Laporan</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-center">
            <p className="text-gray-500 text-sm">Menunggu</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-center">
            <p className="text-gray-500 text-sm">Diproses</p>
            <p className="text-2xl font-bold text-blue-600">{stats.diproses}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-center">
            <p className="text-gray-500 text-sm">Selesai</p>
            <p className="text-2xl font-bold text-green-600">{stats.selesai}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Filter Laporan</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border ${filter === 'all' 
                  ? 'bg-blue-100 text-blue-700 border-blue-300' 
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}
              >
                Semua ({stats.total})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border ${filter === 'pending' 
                  ? 'bg-yellow-100 text-yellow-700 border-yellow-300' 
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}
              >
                Menunggu ({stats.pending})
              </button>
              <button
                onClick={() => setFilter('diproses')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border ${filter === 'diproses' 
                  ? 'bg-blue-100 text-blue-700 border-blue-300' 
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}
              >
                Diproses ({stats.diproses})
              </button>
              <button
                onClick={() => setFilter('selesai')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border ${filter === 'selesai' 
                  ? 'bg-green-100 text-green-700 border-green-300' 
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}
              >
                Selesai ({stats.selesai})
              </button>
            </div>
          </div>
          
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari laporan (lokasi, bau, rasa)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Filter className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lokasi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kondisi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-600 mb-2">
                        {searchTerm || filter !== 'all' 
                          ? 'Tidak ada laporan yang sesuai dengan filter' 
                          : 'Belum ada laporan'}
                      </p>
                      <p className="text-gray-400 mb-6 max-w-md mx-auto">
                        {searchTerm || filter !== 'all' 
                          ? 'Coba ubah filter atau kata kunci pencarian Anda' 
                          : 'Mulai dengan membuat laporan pertama Anda tentang kondisi air di sekitar'}
                      </p>
                      {(!searchTerm && filter === 'all') && (
                        <Link
                          href="/lapor"
                          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <PlusCircle className="w-4 h-4" />
                          Buat Laporan Pertama
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(report.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(report.created_at).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <div className="text-sm font-medium text-gray-900 truncate" title={report.lokasi}>
                          {report.lokasi}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Bau:</span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                            {report.bau}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Rasa:</span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                            {report.rasa}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Warna:</span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                            {report.warna}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(report.status)}
                          <span className="font-medium">
                            {getStatusText(report.status)}
                          </span>
                        </div>
                        {report.feedback && (
                          <div className="ml-2" title="Ada feedback dari puskesmas">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/status/${report.id}`}
                        className="text-blue-600 hover:text-blue-900 font-medium inline-flex items-center gap-1"
                      >
                        Detail
                        <ArrowLeft className="w-3 h-3 rotate-180" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Status Laporan</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span><strong>Menunggu:</strong> Laporan telah diterima, menunggu penanganan</span>
              </li>
              <li className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                <span><strong>Diproses:</strong> Petugas puskesmas sedang menindaklanjuti</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span><strong>Selesai:</strong> Laporan telah ditangani dan selesai</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Tips</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Klik "Detail" untuk melihat informasi lengkap dan feedback</li>
              <li>• Laporan akan diproses dalam 1-2 hari kerja</li>
              <li>• Anda akan mendapat notifikasi saat ada update</li>
              <li>• Untuk pertanyaan, hubungi puskesmas setempat</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}