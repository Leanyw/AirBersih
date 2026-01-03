'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  ArrowLeft, 
  BookOpen, 
  Filter, 
  Video, 
  Image as ImageIcon,
  Calendar,
  Search,
  Eye,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Droplets,
  Shield,
  Share2,
  Thermometer,
  FlaskConical,
  RefreshCw,
  Database
} from 'lucide-react';

type Tutorial = {
  id: string;
  judul: string;
  konten: string;
  kategori: string;
  video_url: string | null;
  gambar_url: string | null;
  created_at: string;
};

type CategoryCount = {
  kategori: string;
  jumlah: number;
};

export default function PanduanPage() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [filteredTutorials, setFilteredTutorials] = useState<Tutorial[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [error, setError] = useState<string | null>(null);
  const [connectionTest, setConnectionTest] = useState<boolean | null>(null);

  // Kategori mapping untuk UI
  const categoryInfo: Record<string, { icon: any; color: string; label: string; description: string }> = {
    'pemeriksaan': {
      icon: Eye,
      color: 'bg-blue-100 text-blue-600 border-blue-200',
      label: 'Pemeriksaan',
      description: 'Cara cek kualitas air'
    },
    'filter': {
      icon: Filter,
      color: 'bg-green-100 text-green-600 border-green-200',
      label: 'Filter Air',
      description: 'Teknik penyaringan air'
    },
    'pencegahan': {
      icon: Shield,
      color: 'bg-yellow-100 text-yellow-600 border-yellow-200',
      label: 'Pencegahan',
      description: 'Mencegah kontaminasi'
    },
    'penyakit': {
      icon: AlertCircle,
      color: 'bg-red-100 text-red-600 border-red-200',
      label: 'Penyakit',
      description: 'Penyakit dari air kotor'
    }
  };

  // Test koneksi database
  const testDatabaseConnection = async () => {
    try {
      console.log('🔄 Testing database connection...');
      const { data, error } = await supabase
        .from('tutorials')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('❌ Database connection error:', error);
        setConnectionTest(false);
        return false;
      }
      
      console.log('✅ Database connection successful');
      setConnectionTest(true);
      return true;
    } catch (err) {
      console.error('❌ Connection test failed:', err);
      setConnectionTest(false);
      return false;
    }
  };

  useEffect(() => {
    const init = async () => {
      const connected = await testDatabaseConnection();
      if (connected) {
        fetchData();
      } else {
        setError('Tidak dapat terhubung ke database. Periksa koneksi internet atau konfigurasi Supabase.');
        setIsLoading(false);
      }
    };
    
    init();
  }, []);

  useEffect(() => {
    filterTutorials();
  }, [selectedCategory, searchTerm, tutorials]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📡 Fetching tutorials from database...');
      
      // Fetch tutorials dari database
      const { data: tutorialsData, error: fetchError } = await supabase
        .from('tutorials')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('❌ Error fetching tutorials:', fetchError);
        
        // Cek jika error karena RLS
        if (fetchError.code === '42501' || fetchError.message.includes('permission')) {
          setError('Error 403: Akses ditolak. Perlu konfigurasi Row Level Security (RLS) di Supabase.');
        } else {
          setError(`Gagal memuat data: ${fetchError.message}`);
        }
        
        setTutorials([]);
        return;
      }

      console.log('✅ Data fetched:', tutorialsData?.length || 0, 'tutorials');
      
      if (tutorialsData && tutorialsData.length > 0) {
        setTutorials(tutorialsData);
        
        // Hitung per kategori
        const counts: Record<string, number> = {};
        tutorialsData.forEach(tutorial => {
          counts[tutorial.kategori] = (counts[tutorial.kategori] || 0) + 1;
        });
        
        const categoryArray = Object.entries(counts).map(([kategori, jumlah]) => ({
          kategori,
          jumlah
        }));
        
        setCategoryCounts(categoryArray);
        console.log('📊 Categories counted:', categoryArray);
      } else {
        // Database kosong
        console.log('📭 Database tutorials kosong');
        setTutorials([]);
        setCategoryCounts([]);
      }

    } catch (error: any) {
      console.error('❌ Error in fetchData:', error);
      setError(`Terjadi kesalahan: ${error.message}`);
      setTutorials([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterTutorials = () => {
    let filtered = [...tutorials];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.kategori === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.judul.toLowerCase().includes(term) ||
        t.konten.toLowerCase().includes(term) ||
        t.kategori.toLowerCase().includes(term)
      );
    }

    setFilteredTutorials(filtered);
  };

  const getCategoryInfo = (kategori: string) => {
    return categoryInfo[kategori] || {
      icon: BookOpen,
      color: 'bg-gray-100 text-gray-600 border-gray-200',
      label: kategori,
      description: 'Informasi umum'
    };
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return 'Tanggal tidak tersedia';
    }
  };

  const handleShare = async (tutorial: Tutorial) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: tutorial.judul,
          text: tutorial.konten.substring(0, 100) + '...',
          url: window.location.href,
        });
      } catch (error) {
        console.log('Sharing cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${tutorial.judul}\n${window.location.href}`);
      alert('Link berhasil disalin!');
    }
  };

  const getFallbackImage = (kategori: string) => {
    switch (kategori) {
      case 'pemeriksaan':
        return 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56';
      case 'filter':
        return 'https://images.unsplash.com/photo-1523362628745-0c100150b504';
      case 'pencegahan':
        return 'https://images.unsplash.com/photo-1578662996442-48f60103fc96';
      case 'penyakit':
        return 'https://images.unsplash.com/photo-1545153995-80b6a2cdb56e';
      default:
        return 'https://images.unsplash.com/photo-1545153995-80b6a2cdb56e';
    }
  };

  const getCategoryIcon = (kategori: string) => {
    switch (kategori) {
      case 'pemeriksaan':
        return Eye;
      case 'filter':
        return Filter;
      case 'pencegahan':
        return Shield;
      case 'penyakit':
        return AlertCircle;
      default:
        return BookOpen;
    }
  };

  const handleFixRLS = () => {
    window.open('https://supabase.com/docs/guides/auth/row-level-security', '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Memuat panduan...</p>
          <p className="text-sm text-gray-500 mt-2">Mengambil data dari database</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <BookOpen className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold">Panduan & Tutorial</h1>
                  <p className="text-blue-100 mt-2">Pelajari cara menjaga kualitas air dengan benar</p>
                </div>
              </div>
              
              <div className="mt-6 flex flex-wrap gap-2">
                <div className="bg-white/20 px-3 py-1 rounded-full text-sm">
                  {tutorials.length} Panduan Tersedia
                </div>
                <div className="bg-white/20 px-3 py-1 rounded-full text-sm">
                  {categoryCounts.length} Kategori
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Link>
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
              >
                {viewMode === 'grid' ? 'List View' : 'Grid View'}
              </button>
              <button
                onClick={fetchData}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                title="Refresh data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message - Khusus Error 403 */}
        {error && error.includes('403') && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="bg-red-100 p-3 rounded-lg">
                <Database className="w-8 h-8 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  Error 403: Akses Database Ditolak
                </h3>
                <p className="text-red-700 mb-4">
                  Aplikasi tidak dapat mengakses data dari database karena masalah keamanan (Row Level Security).
                  Ini adalah masalah konfigurasi di Supabase yang perlu diperbaiki.
                </p>
                <div className="space-y-3">
                  <div className="bg-red-100 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-800 mb-2">Cara Memperbaiki:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-red-700 text-sm">
                      <li>Buka dashboard Supabase Anda</li>
                      <li>Pergi ke Authentication → Policies</li>
                      <li>Non-aktifkan Row Level Security untuk tabel "tutorials"</li>
                      <li>Atau buat policy yang mengizinkan SELECT untuk semua user</li>
                      <li>Jalankan script SQL yang diberikan di dokumentasi</li>
                    </ol>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleFixRLS}
                      className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Database className="w-4 h-4" />
                      Dokumentasi RLS Supabase
                    </button>
                    <button
                      onClick={fetchData}
                      className="inline-flex items-center gap-2 border border-red-600 text-red-600 px-4 py-2.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Coba Lagi
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message - Umum */}
        {error && !error.includes('403') && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
                <button
                  onClick={fetchData}
                  className="mt-2 text-red-700 hover:text-red-800 text-sm font-medium flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Coba Lagi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State - Jika database kosong */}
        {!error && tutorials.length === 0 && connectionTest === true && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
            <BookOpen className="w-20 h-20 text-blue-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-blue-800 mb-2">
              Belum Ada Panduan Tersedia
            </h3>
            <p className="text-blue-700 mb-4">
              Database terhubung dengan baik, namun tabel tutorials masih kosong.
            </p>
            <p className="text-blue-600 text-sm mb-6">
              Silakan hubungi administrator untuk mengisi data panduan.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={fetchData}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Data
              </button>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 border border-blue-600 text-blue-600 px-4 py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Database Connection Failed */}
        {connectionTest === false && !error && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
            <Database className="w-20 h-20 text-yellow-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-yellow-800 mb-2">
              Koneksi Database Gagal
            </h3>
            <p className="text-yellow-700 mb-4">
              Tidak dapat terhubung ke database Supabase. Periksa:
            </p>
            <ul className="text-left text-yellow-600 mb-6 max-w-md mx-auto space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>Koneksi internet Anda</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>Environment variables di file .env.local</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>Status project Supabase Anda</span>
              </li>
            </ul>
            <button
              onClick={() => {
                testDatabaseConnection();
                fetchData();
              }}
              className="inline-flex items-center gap-2 bg-yellow-600 text-white px-4 py-2.5 rounded-lg hover:bg-yellow-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Coba Koneksi Ulang
            </button>
          </div>
        )}

        {/* Search and Filter Section - Hanya tampil jika ada data */}
        {tutorials.length > 0 && !error && connectionTest === true && (
          <>
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Search Input */}
                <div className="lg:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Cari panduan (pemeriksaan, filter air, cara cek air, dll)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="all">Semua Kategori ({tutorials.length})</option>
                    {categoryCounts.map(({ kategori, jumlah }) => {
                      const info = getCategoryInfo(kategori);
                      return (
                        <option key={kategori} value={kategori}>
                          {info.label} ({jumlah})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Category Quick Filters */}
              <div className="mt-6">
                <h3 className="font-semibold text-gray-800 mb-3">Kategori Cepat:</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-4 py-2 rounded-lg border ${selectedCategory === 'all' 
                      ? 'bg-blue-100 text-blue-700 border-blue-300 font-medium' 
                      : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}
                  >
                    Semua
                  </button>
                  {categoryCounts.map(({ kategori, jumlah }) => {
                    const info = getCategoryInfo(kategori);
                    const Icon = info.icon;
                    return (
                      <button
                        key={kategori}
                        onClick={() => setSelectedCategory(kategori)}
                        className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${selectedCategory === kategori 
                          ? `${info.color} font-medium` 
                          : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{info.label}</span>
                        <span className="bg-gray-200 text-gray-700 text-xs px-1.5 py-0.5 rounded-full">
                          {jumlah}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-6">
              <p className="text-gray-600">
                Menampilkan <span className="font-semibold">{filteredTutorials.length}</span> dari {tutorials.length} panduan
                {selectedCategory !== 'all' && ` dalam kategori "${getCategoryInfo(selectedCategory).label}"`}
                {searchTerm && ` untuk pencarian "${searchTerm}"`}
              </p>
            </div>

            {/* Tutorials Grid/List */}
            {filteredTutorials.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <BookOpen className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  {searchTerm ? 'Panduan tidak ditemukan' : 'Tidak ada panduan dalam kategori ini'}
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {searchTerm 
                    ? 'Coba gunakan kata kunci lain atau pilih kategori berbeda'
                    : 'Belum ada panduan dalam kategori yang dipilih.'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('all');
                    }}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Tampilkan Semua Panduan
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              // Grid View
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTutorials.map((tutorial) => {
                  const categoryInfo = getCategoryInfo(tutorial.kategori);
                  const Icon = categoryInfo.icon;
                  
                  return (
                    <div key={tutorial.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                      {/* Image Header */}
                      <div className="h-48 overflow-hidden bg-gradient-to-br from-blue-50 to-cyan-50">
                        {tutorial.gambar_url ? (
                          <img
                            src={tutorial.gambar_url}
                            alt={tutorial.judul}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = getFallbackImage(tutorial.kategori);
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon className="w-16 h-16 text-blue-400 opacity-50" />
                          </div>
                        )}
                      </div>

                      <div className="p-6">
                        {/* Category Badge */}
                        <div className="flex items-center justify-between mb-4">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${categoryInfo.color}`}>
                            <Icon className="w-4 h-4" />
                            <span className="text-sm font-medium">{categoryInfo.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {tutorial.video_url && (
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Ada video tutorial">
                              </div>
                            )}
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-500">{formatDate(tutorial.created_at)}</span>
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-bold text-gray-800 mb-3 line-clamp-2">
                          {tutorial.judul}
                        </h3>

                        {/* Content Preview */}
                        <div className="text-gray-600 text-sm mb-4 line-clamp-3">
                          {tutorial.konten.length > 200 
                            ? tutorial.konten.substring(0, 200).replace(/\*\*/g, '') + '...'
                            : tutorial.konten.replace(/\*\*/g, '')}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <button
                            onClick={() => setSelectedTutorial(tutorial)}
                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
                          >
                            Baca Panduan
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleShare(tutorial)}
                              className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                              title="Bagikan"
                            >
                              <Share2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // List View
              <div className="space-y-4">
                {filteredTutorials.map((tutorial) => {
                  const categoryInfo = getCategoryInfo(tutorial.kategori);
                  const Icon = categoryInfo.icon;
                  
                  return (
                    <div key={tutorial.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                      <div className="p-6">
                        <div className="flex flex-col md:flex-row md:items-start gap-6">
                          {/* Thumbnail */}
                          <div className="md:w-48 md:flex-shrink-0">
                            <div className="aspect-video overflow-hidden rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50">
                              {tutorial.gambar_url ? (
                                <img
                                  src={tutorial.gambar_url}
                                  alt={tutorial.judul}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = getFallbackImage(tutorial.kategori);
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Icon className="w-12 h-12 text-blue-400 opacity-50" />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex-1">
                            {/* Header */}
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${categoryInfo.color}`}>
                                <Icon className="w-4 h-4" />
                                <span className="text-sm font-medium">{categoryInfo.label}</span>
                              </div>
                              
                              <div className="inline-flex items-center gap-1 text-gray-500 text-sm">
                                <Calendar className="w-3 h-3" />
                                {formatDate(tutorial.created_at)}
                              </div>
                            </div>

                            {/* Title */}
                            <h3 className="text-xl font-bold text-gray-800 mb-3">
                              {tutorial.judul}
                            </h3>

                            {/* Content Preview */}
                            <div className="text-gray-600 mb-4 line-clamp-2">
                              {tutorial.konten.substring(0, 300).replace(/\*\*/g, '')}...
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100">
                              <div className="flex items-center gap-4">
                                <button
                                  onClick={() => setSelectedTutorial(tutorial)}
                                  className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
                                >
                                  Baca Panduan Lengkap
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleShare(tutorial)}
                                  className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                                  title="Bagikan"
                                >
                                  <Share2 className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Modal for Tutorial Detail */}
        {selectedTutorial && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={getCategoryInfo(selectedTutorial.kategori).color + ' p-2 rounded-lg'}>
                      {(() => {
                        const Icon = getCategoryInfo(selectedTutorial.kategori).icon;
                        return <Icon className="w-6 h-6" />;
                      })()}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">{selectedTutorial.judul}</h2>
                      <p className="text-gray-600">Kategori: {getCategoryInfo(selectedTutorial.kategori).label}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTutorial(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Image if available */}
                {selectedTutorial.gambar_url && (
                  <div className="mb-8 rounded-xl overflow-hidden">
                    <img
                      src={selectedTutorial.gambar_url}
                      alt={selectedTutorial.judul}
                      className="w-full h-64 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = getFallbackImage(selectedTutorial.kategori);
                      }}
                    />
                  </div>
                )}

                {/* Content */}
                <div className="prose prose-lg max-w-none">
                  <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                    {selectedTutorial.konten.split('\n').map((line, index) => {
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return (
                          <h3 key={index} className="text-lg font-bold text-gray-800 mt-6 mb-3">
                            {line.replace(/\*\*/g, '')}
                          </h3>
                        );
                      } else if (line.match(/^\d+\./)) {
                        return (
                          <div key={index} className="flex gap-3 mt-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                              {line.match(/^\d+/)?.[0]}
                            </span>
                            <span className="flex-1">{line.replace(/^\d+\.\s*/, '')}</span>
                          </div>
                        );
                      } else if (line.startsWith('- ')) {
                        return (
                          <div key={index} className="flex gap-3 mt-2">
                            <span className="flex-shrink-0 mt-2 w-2 h-2 bg-gray-400 rounded-full"></span>
                            <span className="flex-1">{line.substring(2)}</span>
                          </div>
                        );
                      } else if (line.trim() === '') {
                        return <div key={index} className="h-4" />;
                      }
                      return <p key={index} className="mt-3">{line}</p>;
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleShare(selectedTutorial)}
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Bagikan Panduan
                    </button>
                  </div>
                  <button
                    onClick={() => setSelectedTutorial(null)}
                    className="border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Section - Hanya tampil jika ada data */}
        {tutorials.length > 0 && !error && connectionTest === true && (
          <div className="mt-12 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-8 border border-cyan-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Droplets className="w-6 h-6 text-blue-500" />
                  Mengapa Air Bersih Penting?
                </h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Mencegah Penyakit:</strong> Air bersih menghindarkan dari diare, tipus, dan hepatitis</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Menjaga Kesehatan Kulit:</strong> Air kotor dapat menyebabkan iritasi dan infeksi kulit</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Meningkatkan Kualitas Hidup:</strong> Air bersih mendukung kebersihan dan kesehatan keluarga</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span><strong>Menghemat Biaya:</strong> Mencegah pengobatan penyakit akibat air kotor</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-green-500" />
                  Tips Penggunaan Panduan
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="font-medium text-gray-800 flex items-center gap-2">
                      <Eye className="w-4 h-4" /> Perhatikan Detail
                    </p>
                    <p className="text-sm text-gray-600">Setiap langkah pemeriksaan memiliki arti penting. Jangan dilewatkan.</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 flex items-center gap-2">
                      <FlaskConical className="w-4 h-4" /> Praktek Langsung
                    </p>
                    <p className="text-sm text-gray-600">Coba teknik filter DIY dengan bahan yang tersedia di rumah.</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 flex items-center gap-2">
                      <Thermometer className="w-4 h-4" /> Periksa Rutin
                    </p>
                    <p className="text-sm text-gray-600">Lakukan pemeriksaan air secara berkala, minimal sebulan sekali.</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Tetap Waspada
                    </p>
                    <p className="text-sm text-gray-600">Meski air terlihat bersih, tetap rebus sebelum diminum.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Call to Action */}
        {tutorials.length > 0 && !error && connectionTest === true && (
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">
              Ada pertanyaan atau butuh bantuan terkait kualitas air?
            </p>
            <Link
              href="/lapor"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all"
            >
              <AlertCircle className="w-5 h-5" />
              Laporkan Masalah Air di Wilayah Anda
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}