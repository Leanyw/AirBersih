'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  AlertTriangle, 
  ArrowLeft, 
  Calendar, 
  Shield, 
  Stethoscope,
  Thermometer,
  User,
  Clock,
  BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';

type Disease = {
  id: string;
  nama: string;
  penyebab: string;
  gejala: string;
  pencegahan: string;
  pengobatan: string;
  gambar_url: string;
  kategori: string;
  tingkat_keparahan: string;
};

export default function DiseaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const diseaseId = params.id as string;
  
  const [disease, setDisease] = useState<Disease | null>(null);
  const [relatedDiseases, setRelatedDiseases] = useState<Disease[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (diseaseId) {
      fetchDiseaseData();
    }
  }, [diseaseId]);

  const fetchDiseaseData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch disease detail
      const { data: diseaseData, error: diseaseError } = await supabase
        .from('diseases')
        .select('*')
        .eq('id', diseaseId)
        .single();

      if (diseaseError) throw diseaseError;

      // Fetch related diseases (same category)
      const { data: relatedData, error: relatedError } = await supabase
        .from('diseases')
        .select('*')
        .eq('kategori', diseaseData.kategori)
        .neq('id', diseaseId)
        .limit(3);

      if (relatedError) throw relatedError;

      setDisease(diseaseData);
      setRelatedDiseases(relatedData || []);
    } catch (error) {
      toast.error('Gagal memuat data penyakit');
      console.error(error);
      router.push('/kesehatan');
    } finally {
      setIsLoading(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data penyakit...</p>
        </div>
      </div>
    );
  }

  if (!disease) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Penyakit tidak ditemukan</h2>
          <p className="text-gray-600 mb-6">Penyakit yang Anda cari tidak ditemukan dalam database</p>
          <Link
            href="/kesehatan"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Informasi Kesehatan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <img
          src={disease.gambar_url || 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1200'}
          alt={disease.nama}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="max-w-7xl mx-auto">
            <Link
              href="/kesehatan"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Informasi Kesehatan
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{disease.nama}</h1>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(disease.tingkat_keparahan)}`}>
                {getSeverityIcon(disease.tingkat_keparahan)} {disease.tingkat_keparahan}
              </span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm">
                {disease.kategori}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Overview Card */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <BookOpen className="w-5 h-5 text-blue-600 mr-2" />
                Tentang {disease.nama}
              </h2>
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed">
                  {disease.nama} adalah penyakit yang disebabkan oleh konsumsi air terkontaminasi.
                  Penyakit ini termasuk dalam kategori <strong>{disease.kategori}</strong> dengan tingkat keparahan 
                  <span className={`ml-1 ${disease.tingkat_keparahan === 'berat' ? 'text-red-600 font-bold' : ''}`}>
                    {disease.tingkat_keparahan}
                  </span>.
                </p>
              </div>
            </div>

            {/* Causes Card */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                Penyebab Utama
              </h2>
              <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed">
                  {disease.penyebab}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="bg-blue-100 p-2 rounded">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sumber Infeksi</p>
                    <p className="font-medium">Air terkontaminasi</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="bg-green-100 p-2 rounded">
                    <Clock className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Masa Inkubasi</p>
                    <p className="font-medium">1-14 hari</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Symptoms Card */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Thermometer className="w-5 h-5 text-orange-600 mr-2" />
                Gejala yang Perlu Diwaspadai
              </h2>
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 mb-4">
                <p className="text-gray-700 leading-relaxed">{disease.gejala}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {disease.gejala.split(',').map((symptom, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-gray-700">{symptom.trim()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Treatment Card */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Stethoscope className="w-5 h-5 text-green-600 mr-2" />
                Penanganan & Pengobatan
              </h2>
              <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed mb-4">{disease.pengobatan}</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-white p-2 rounded mt-1">
                      <span className="text-green-600 font-bold">①</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Pertolongan Pertama</p>
                      <p className="text-sm text-gray-600">Berikan oralit, banyak minum air putih</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-white p-2 rounded mt-1">
                      <span className="text-green-600 font-bold">②</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Perawatan Medis</p>
                      <p className="text-sm text-gray-600">Kunjungi puskesmas untuk pemeriksaan lanjutan</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-white p-2 rounded mt-1">
                      <span className="text-green-600 font-bold">③</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Pengobatan</p>
                      <p className="text-sm text-gray-600">Ikuti resep dokter dengan disiplin</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Prevention Card */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Shield className="w-5 h-5 text-blue-600 mr-2" />
                Pencegahan
              </h2>
              <div className="space-y-3">
                {disease.pencegahan.split('.').filter(p => p.trim()).map((prevention, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-1 flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-gray-700">{prevention.trim()}.</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow p-6 text-white">
              <h3 className="font-bold text-lg mb-4">🚨 Tindakan Cepat</h3>
              <div className="space-y-3">
                <Link
                  href="/lapor"
                  className="block bg-white text-blue-600 text-center py-3 px-4 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                >
                  Laporkan Sumber Air Terkontaminasi
                </Link>
                <Link
                  href="/sumber-air"
                  className="block bg-white/20 text-center py-3 px-4 rounded-lg font-medium hover:bg-white/30 transition-colors"
                >
                  Cari Sumber Air Bersih
                </Link>
                <button
                  onClick={() => window.print()}
                  className="block w-full bg-white/10 text-center py-3 px-4 rounded-lg font-medium hover:bg-white/20 transition-colors"
                >
                  Cetak Informasi Ini
                </button>
              </div>
            </div>

            {/* Related Diseases */}
            {relatedDiseases.length > 0 && (
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="font-bold text-gray-800 mb-4">Penyakit Terkait</h3>
                <div className="space-y-3">
                  {relatedDiseases.map((related) => (
                    <Link
                      key={related.id}
                      href={`/kesehatan/penyakit/${related.id}`}
                      className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">{related.nama}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(related.tingkat_keparahan)}`}>
                          {related.tingkat_keparahan}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{related.gejala.substring(0, 60)}...</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Emergency Info */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="font-bold text-red-800 mb-3 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Darurat Medis
              </h3>
              <p className="text-sm text-red-700 mb-4">
                Segera ke puskesmas jika gejala memberat atau tidak membaik dalam 3 hari.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-gray-700">Buka: Senin - Minggu, 24 Jam</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-gray-700">Nomor Darurat: 119</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Prevention Banner */}
        <div className="mt-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 text-white">
          <h2 className="text-xl font-bold mb-4">💧 Mencegah Lebih Baik daripada Mengobati</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/20 p-4 rounded-lg backdrop-blur-sm">
              <div className="text-2xl font-bold mb-2">1</div>
              <p className="text-sm">Selalu rebus air minum hingga mendidih sempurna</p>
            </div>
            <div className="bg-white/20 p-4 rounded-lg backdrop-blur-sm">
              <div className="text-2xl font-bold mb-2">2</div>
              <p className="text-sm">Cuci tangan pakai sabun sebelum makan dan setelah BAB</p>
            </div>
            <div className="bg-white/20 p-4 rounded-lg backdrop-blur-sm">
              <div className="text-2xl font-bold mb-2">3</div>
              <p className="text-sm">Segera laporkan sumber air yang tercemar</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}