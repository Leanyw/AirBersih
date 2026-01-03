'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  AlertTriangle, 
  BookOpen, 
  Heart, 
  Shield, 
  Stethoscope,
  Search,
  Filter,
  Droplets,
  RefreshCw,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

type Disease = {
  id: string;
  nama: string;
  penyebab: string;
  gejala: string;
  pencegahan: string;
  pengobatan?: string;
  gambar_url: string;
  kategori: string;
  tingkat_keparahan: string;
};

type Tutorial = {
  id: string;
  judul: string;
  konten: string;
  kategori: string;
  video_url: string | null;
  gambar_url: string;
};

export default function KesehatanPage() {
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('semua');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const categories = [
    { id: 'semua', label: 'Semua', icon: <Heart className="w-4 h-4" /> },
    { id: 'infeksi', label: 'Infeksi', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'virus', label: 'Virus', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'pencernaan', label: 'Pencernaan', icon: <Stethoscope className="w-4 h-4" /> },
    { id: 'parasit', label: 'Parasit', icon: <Shield className="w-4 h-4" /> },
  ];

  useEffect(() => {
    fetchHealthData();
  }, [retryCount]);

  const fetchHealthData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 Fetching health data from Supabase...');
      
      // Test koneksi Supabase terlebih dahulu
      try {
        const { data: testData, error: testError } = await supabase
          .from('diseases')
          .select('count', { count: 'exact', head: true });
        
        if (testError) {
          console.error('❌ Supabase connection test failed:', testError);
          throw new Error(`Koneksi database gagal: ${testError.message}`);
        }
        
        console.log('✅ Supabase connection test passed');
      } catch (testErr: any) {
        console.error('Connection test error:', testErr);
        // Langsung gunakan fallback data
        useFallbackData('Koneksi database bermasalah. Menampilkan data contoh.');
        return;
      }

      // Fetch diseases dengan error handling terpisah
      let diseasesData: Disease[] = [];
      let tutorialsData: Tutorial[] = [];
      
      try {
        const { data: diseasesResult, error: diseasesError } = await supabase
          .from('diseases')
          .select('*')
          .order('nama');

        if (diseasesError) {
          console.error('❌ Diseases query error:', diseasesError);
          throw new Error(`Gagal memuat data penyakit: ${diseasesError.message}`);
        }

        diseasesData = diseasesResult || [];
        console.log(`✅ Loaded ${diseasesData.length} diseases`);
      } catch (diseaseError: any) {
        console.error('Diseases fetch failed:', diseaseError);
        diseasesData = getFallbackDiseases();
      }

      // Fetch tutorials dengan error handling terpisah
      try {
        const { data: tutorialsResult, error: tutorialsError } = await supabase
          .from('tutorials')
          .select('*')
          .order('judul');

        if (tutorialsError) {
          console.error('❌ Tutorials query error:', tutorialsError);
          tutorialsData = getFallbackTutorials();
        } else {
          tutorialsData = tutorialsResult || [];
          console.log(`✅ Loaded ${tutorialsData.length} tutorials`);
        }
      } catch (tutorialError) {
        console.error('Tutorials fetch failed:', tutorialError);
        tutorialsData = getFallbackTutorials();
      }

      setDiseases(diseasesData);
      setTutorials(tutorialsData);

      // Jika kedua data kosong
      if (diseasesData.length === 0 && tutorialsData.length === 0) {
        setError('Tidak ada data kesehatan yang ditemukan di database');
        toast.error('Database kosong, silakan tambahkan data');
      }
      
    } catch (error: any) {
      console.error('❌ Error fetching health data:', error);
      useFallbackData(error.message || 'Terjadi kesalahan saat memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  const useFallbackData = (errorMessage: string) => {
    const fallbackDiseases = getFallbackDiseases();
    const fallbackTutorials = getFallbackTutorials();
    
    setDiseases(fallbackDiseases);
    setTutorials(fallbackTutorials);
    setError(`${errorMessage}. Menampilkan data contoh.`);
    toast.error('Gagal memuat data kesehatan, menampilkan data contoh');
  };

  // Data fallback untuk development/demo
  const getFallbackDiseases = (): Disease[] => {
    return [
      {
        id: '1',
        nama: 'Diare',
        penyebab: 'Air terkontaminasi bakteri E.coli, Salmonella, Shigella',
        gejala: 'BAB cair >3x/hari, mual, muntah, kram perut, dehidrasi',
        pencegahan: 'Minum air matang, cuci tangan pakai sabun, jaga kebersihan makanan',
        pengobatan: 'Oralit, banyak minum, istirahat, antibiotik jika parah',
        gambar_url: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400',
        kategori: 'pencernaan',
        tingkat_keparahan: 'ringan'
      },
      {
        id: '2',
        nama: 'Kolera',
        penyebab: 'Bakteri Vibrio cholerae dari air terkontaminasi tinja',
        gejala: 'Diare parah seperti air cucian beras, muntah, dehidrasi cepat',
        pencegahan: 'Air bersih, sanitasi baik, vaksinasi, cuci tangan',
        pengobatan: 'Rehidrasi cepat, antibiotik, perawatan intensif',
        gambar_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400',
        kategori: 'infeksi',
        tingkat_keparahan: 'berat'
      },
      {
        id: '3',
        nama: 'Tifus/Tipes',
        penyebab: 'Bakteri Salmonella typhi dari air/makanan terkontaminasi',
        gejala: 'Demam tinggi, sakit kepala, lemas, sakit perut, ruam',
        pencegahan: 'Air matang, makanan higienis, vaksinasi, jaga kebersihan',
        pengobatan: 'Antibiotik, istirahat total, perawatan medis',
        gambar_url: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=400',
        kategori: 'infeksi',
        tingkat_keparahan: 'sedang'
      },
      {
        id: '4',
        nama: 'Hepatitis A',
        penyebab: 'Virus Hepatitis A dari air/food terkontaminasi',
        gejala: 'Kuning pada mata/kulit, mual, lelah, demam, urin gelap',
        pencegahan: 'Kebersihan pribadi, vaksinasi, air bersih, cuci tangan',
        pengobatan: 'Istirahat, nutrisi baik, hindari alkohol, pengobatan simtomatik',
        gambar_url: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400',
        kategori: 'virus',
        tingkat_keparahan: 'sedang'
      },
      {
        id: '5',
        nama: 'Cacingan',
        penyebab: 'Telur cacing dari tanah/air terkontaminasi',
        gejala: 'Gatal di anus, berat badan turun, lemas, anemia, gangguan gizi',
        pencegahan: 'Pakai alas kaki, cuci tangan, air bersih, BAB di jamban',
        pengobatan: 'Obat cacing (mebendazole/albendazole), nutrisi baik',
        gambar_url: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400',
        kategori: 'parasit',
        tingkat_keparahan: 'ringan'
      },
      {
        id: '6',
        nama: 'Disentri',
        penyebab: 'Bakteri Shigella dari air terkontaminasi',
        gejala: 'Diare berdarah, demam, kram perut, dehidrasi',
        pencegahan: 'Air bersih, sanitasi, cuci tangan, makanan higienis',
        pengobatan: 'Antibiotik, rehidrasi, perawatan medis',
        gambar_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400',
        kategori: 'infeksi',
        tingkat_keparahan: 'sedang'
      }
    ];
  };

  const getFallbackTutorials = (): Tutorial[] => {
    return [
      {
        id: '1',
        judul: 'Cara Cek Kualitas Air Sederhana',
        konten: '1. Lihat warna air di wadah bening\n2. Cium bau air\n3. Rasakan dengan ujung lidah\n4. Diamkan semalaman, lihat endapan\n5. Tes dengan daun teh (jika berubah warna, ada masalah)',
        kategori: 'pemeriksaan',
        video_url: null,
        gambar_url: 'https://images.unsplash.com/photo-1545147986-646f5f2d6385?w=400'
      },
      {
        id: '2',
        judul: 'Membuat Filter Air Sederhana',
        konten: 'Bahan: botol plastik, kerikil, pasir, arang, ijuk, kapas\nLapisan dari bawah: kapas, arang, pasir halus, pasir kasar, kerikil, ijuk\nGanti bahan filter setiap 2 minggu',
        kategori: 'filter',
        video_url: 'https://www.youtube.com/embed/sample1',
        gambar_url: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400'
      },
      {
        id: '3',
        judul: 'Cara Merebus Air yang Benar',
        konten: '1. Gunakan wadah bersih\n2. Rebus hingga mendidih sempurna (100°C)\n3. Biarkan mendidih 5-10 menit\n4. Simpan di wadah tertutup\n5. Jangan merebus ulang berkali-kali',
        kategori: 'pencegahan',
        video_url: null,
        gambar_url: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=400'
      },
      {
        id: '4',
        judul: 'Penanganan Awal Diare',
        konten: '1. Beri oralit (1L air + 6 sdt gula + 1/2 sdt garam)\n2. Lanjutkan ASI/makan jika bayi/anak\n3. Hindari susu dan makanan berlemak\n4. Segera ke puskesmas jika: mata cekung, sangat lemas, tidak mau minum',
        kategori: 'penanganan',
        video_url: null,
        gambar_url: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400'
      }
    ];
  };

  const filteredDiseases = diseases.filter(disease => {
    const matchesSearch = disease.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         disease.gejala.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'semua' || disease.kategori === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getSeverityColor = (tingkat: string) => {
    switch(tingkat) {
      case 'ringan': return 'bg-green-100 text-green-800';
      case 'sedang': return 'bg-yellow-100 text-yellow-800';
      case 'berat': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityIcon = (tingkat: string) => {
    switch(tingkat) {
      case 'ringan': return '🟢';
      case 'sedang': return '🟡';
      case 'berat': return '🔴';
      default: return '⚪';
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    toast.loading('Memuat ulang data...');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat informasi kesehatan...</p>
          <p className="text-sm text-gray-500 mt-2">Mengambil data dari database</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header dengan error alert */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                Informasi Kesehatan & Pencegahan
              </h1>
              <p className="text-gray-600 mt-2">
                Ketahui penyakit akibat air terkontaminasi dan cara pencegahannya
              </p>
            </div>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-yellow-800 font-medium mb-1">Perhatian</p>
                  <p className="text-yellow-700 text-sm">{error}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={handleRetry}
                      className="text-sm text-yellow-700 hover:text-yellow-900 font-medium"
                    >
                      Coba lagi
                    </button>
                    <span className="text-yellow-600 text-sm">•</span>
                    <span className="text-yellow-600 text-sm">
                      {diseases.length} penyakit, {tutorials.length} panduan tersedia
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hero Banner - TETAP SAMA SEPERTI PERINTAH */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-8 text-white mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-2/3">
              <h2 className="text-2xl font-bold mb-4">💧 Air Bersih, Hidup Sehat</h2>
              <p className="text-lg opacity-90">
                Setiap tahun, 485.000 orang meninggal karena diare terkait air. 
                Kenali penyakitnya, cegah dengan air bersih.
              </p>
              <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                  <p className="text-2xl font-bold">10+</p>
                  <p className="text-sm opacity-90">Penyakit terkait air</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                  <p className="text-2xl font-bold">80%</p>
                  <p className="text-sm opacity-90">Penyakit di 3T terkait air</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                  <p className="text-2xl font-bold">100%</p>
                  <p className="text-sm opacity-90">Dapat dicegah</p>
                </div>
              </div>
            </div>
            <div className="mt-6 md:mt-0">
              <Droplets className="w-32 h-32 opacity-80" />
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 bg-white rounded-xl shadow p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari penyakit atau gejala..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Disease Grid */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">Penyakit Akibat Air Terkontaminasi</h2>
            <span className="text-gray-500 text-sm">
              {filteredDiseases.length} penyakit ditemukan
            </span>
          </div>

          {filteredDiseases.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Tidak ditemukan penyakit dengan kata kunci "{searchTerm}"</p>
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Tampilkan semua penyakit
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDiseases.map((disease) => (
                <Link
                  key={disease.id}
                  href={`/kesehatan/penyakit/${disease.id}`}
                  className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow overflow-hidden group"
                >
                  <div className="h-48 overflow-hidden relative">
                    <img
                      src={disease.gambar_url || 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400'}
                      alt={disease.nama}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400';
                      }}
                    />
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(disease.tingkat_keparahan)}`}>
                        {getSeverityIcon(disease.tingkat_keparahan)} {disease.tingkat_keparahan}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600">
                        {disease.nama}
                      </h3>
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    </div>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      <span className="font-medium">Penyebab: </span>
                      {disease.penyebab.substring(0, 100)}...
                    </p>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      <span className="font-medium">Gejala: </span>
                      {disease.gejala.substring(0, 100)}...
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-blue-600 text-sm font-medium group-hover:text-blue-800">
                        Pelajari lebih lanjut →
                      </span>
                      <span className="text-xs text-gray-500 capitalize">
                        {disease.kategori}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Tutorials Section */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Panduan & Tutorial Praktis</h2>
          {tutorials.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Belum ada panduan tersedia</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {tutorials.map((tutorial) => (
                <Link
                  key={tutorial.id}
                  href={`/kesehatan/tutorial/${tutorial.id}`}
                  className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow overflow-hidden group"
                >
                  <div className="h-40 overflow-hidden">
                    <img
                      src={tutorial.gambar_url || 'https://images.unsplash.com/photo-1545147986-646f5f2d6385?w=400'}
                      alt={tutorial.judul}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1545147986-646f5f2d6385?w=400';
                      }}
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-blue-600 font-medium uppercase">
                        {tutorial.kategori}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800 mb-2 group-hover:text-blue-600 line-clamp-2">
                      {tutorial.judul}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-3">
                      {tutorial.konten.substring(0, 100)}...
                    </p>
                    {tutorial.video_url && (
                      <div className="mt-3 flex items-center gap-1 text-xs text-purple-600">
                        <Filter className="w-3 h-3" />
                        <span>Tersedia video panduan</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center">
              <div className="bg-red-100 p-3 rounded-lg mr-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{diseases.length}+</p>
                <p className="text-gray-600 text-sm">Jenis Penyakit</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg mr-4">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">100%</p>
                <p className="text-gray-600 text-sm">Dapat Dicegah</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg mr-4">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{tutorials.length}+</p>
                <p className="text-gray-600 text-sm">Panduan Praktis</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-lg mr-4">
                <Heart className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">24/7</p>
                <p className="text-gray-600 text-sm">Akses Gratis</p>
              </div>
            </div>
          </div>
        </div>

        {/* Prevention Tips */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 text-white mb-8">
          <h2 className="text-xl font-bold mb-6">🛡️ 5 Langkah Pencegahan Dini</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              'Selalu rebus air minum hingga mendidih',
              'Cuci tangan pakai sabun sebelum makan',
              'Gunakan jamban sehat dan bersih',
              'Kelola sampah dengan benar',
              'Segera laporkan air terkontaminasi'
            ].map((tip, index) => (
              <div key={index} className="bg-white/20 p-4 rounded-lg backdrop-blur-sm">
                <div className="text-2xl font-bold mb-2">0{index + 1}</div>
                <p className="text-sm">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            Tanda Darurat - Segera ke Puskesmas Jika:
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
            <li className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              Diare parah dengan darah dalam tinja
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              Muntah terus-menerus, tidak bisa minum
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              Mata cekung, kulit kering (dehidrasi berat)
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              Demam tinggi (&gt;39°C) lebih dari 3 hari
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              Kulit/mata menguning (sakit kuning)
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              Kejang, penurunan kesadaran
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}