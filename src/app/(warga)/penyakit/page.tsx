'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Heart, 
  AlertTriangle, 
  Thermometer, 
  Droplets, 
  Eye, 
  Bug,
  Shield,
  Stethoscope,
  FileText,
  Search
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Disease = {
  id: string;
  nama: string;
  penyebab: string;
  gejala: string;
  pencegahan: string;
  pengobatan: string;
};

export default function PenyakitPage() {
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [filteredDiseases, setFilteredDiseases] = useState<Disease[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = diseases.filter(disease =>
        disease.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        disease.gejala.toLowerCase().includes(searchTerm.toLowerCase()) ||
        disease.penyebab.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredDiseases(filtered);
    } else {
      setFilteredDiseases(diseases);
    }
  }, [searchTerm, diseases]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('diseases')
        .select('*')
        .order('nama', { ascending: true });

      if (error) throw error;
      setDiseases(data || []);
      setFilteredDiseases(data || []);
    } catch (error) {
      console.error('Error fetching diseases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDiseaseIcon = (diseaseName: string) => {
    const name = diseaseName.toLowerCase();
    if (name.includes('diare')) return <Droplets className="w-6 h-6 text-blue-600" />;
    if (name.includes('kolera')) return <Thermometer className="w-6 h-6 text-red-600" />;
    if (name.includes('tifoid') || name.includes('tipes')) return <Bug className="w-6 h-6 text-orange-600" />;
    if (name.includes('hepatitis')) return <Heart className="w-6 h-6 text-yellow-600" />;
    if (name.includes('disentri')) return <AlertTriangle className="w-6 h-6 text-purple-600" />;
    if (name.includes('cacing')) return <Bug className="w-6 h-6 text-green-600" />;
    if (name.includes('leptospirosis')) return <Droplets className="w-6 h-6 text-indigo-600" />;
    return <AlertTriangle className="w-6 h-6 text-gray-600" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Memuat data penyakit...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Penyakit dari Air Terkontaminasi</h1>
              <p className="text-gray-600 mt-2">Informasi lengkap penyakit yang disebabkan oleh air kotor</p>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center text-blue-600 hover:text-blue-800 bg-white px-4 py-2 rounded-lg shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Kembali
            </Link>
          </div>

          {/* Search & Stats */}
          <div className="bg-white rounded-xl shadow p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center">
                <div className="bg-red-100 p-3 rounded-lg mr-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Penyakit</p>
                  <p className="text-2xl font-bold text-gray-800">{diseases.length} jenis</p>
                </div>
              </div>

              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Cari penyakit atau gejala..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 md:p-6 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-yellow-800 mb-2">PENTING!</h3>
              <p className="text-yellow-700">
                Informasi di bawah ini hanya untuk edukasi. Jika Anda atau keluarga mengalami gejala penyakit, 
                segera konsultasi ke dokter atau puskesmas terdekat.
              </p>
            </div>
          </div>
        </div>

        {/* Diseases Grid */}
        <div className="space-y-6">
          {filteredDiseases.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Tidak ditemukan</h3>
              <p className="text-gray-500 mb-4">Tidak ada penyakit yang sesuai dengan pencarian "{searchTerm}"</p>
              <button
                onClick={() => setSearchTerm('')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Tampilkan semua penyakit
              </button>
            </div>
          ) : (
            filteredDiseases.map((disease) => (
              <div key={disease.id} className="bg-white rounded-xl shadow overflow-hidden">
                {/* Disease Header */}
                <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 border-b">
                  <div className="flex items-center">
                    <div className="mr-4">
                      {getDiseaseIcon(disease.nama)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl md:text-2xl font-bold text-gray-800">{disease.nama}</h3>
                      <p className="text-gray-600 mt-1">{disease.penyebab}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* Grid Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Gejala */}
                    <div className="bg-blue-50 rounded-lg p-5">
                      <div className="flex items-center mb-4">
                        <div className="bg-blue-100 p-2 rounded-lg mr-3">
                          <AlertTriangle className="w-5 h-5 text-blue-600" />
                        </div>
                        <h4 className="font-semibold text-gray-800 text-lg">Gejala</h4>
                      </div>
                      <div className="text-gray-700 space-y-2">
                        {disease.gejala.split('\n').map((line, index) => (
                          <div key={index} className="flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            <span>{line.trim()}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pencegahan */}
                    <div className="bg-green-50 rounded-lg p-5">
                      <div className="flex items-center mb-4">
                        <div className="bg-green-100 p-2 rounded-lg mr-3">
                          <Shield className="w-5 h-5 text-green-600" />
                        </div>
                        <h4 className="font-semibold text-gray-800 text-lg">Pencegahan</h4>
                      </div>
                      <div className="text-gray-700 space-y-2">
                        {disease.pencegahan.split('\n').map((line, index) => (
                          <div key={index} className="flex items-start">
                            <span className="text-green-500 mr-2">•</span>
                            <span>{line.trim()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Pengobatan */}
                  <div className="bg-purple-50 rounded-lg p-5">
                    <div className="flex items-center mb-4">
                      <div className="bg-purple-100 p-2 rounded-lg mr-3">
                        <Stethoscope className="w-5 h-5 text-purple-600" />
                      </div>
                      <h4 className="font-semibold text-gray-800 text-lg">Pengobatan</h4>
                    </div>
                    <div className="text-gray-700 space-y-2">
                      {disease.pengobatan.split('\n').map((line, index) => (
                        <div key={index} className="flex items-start">
                          <span className="text-purple-500 mr-2">•</span>
                          <span>{line.trim()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tips Tambahan */}
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center text-gray-700">
                      <Eye className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="text-sm italic">
                        Segera ke fasilitas kesehatan terdekat jika mengalami gejala di atas!
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Tips */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center mb-3">
              <div className="bg-blue-100 p-2 rounded-lg mr-3">
                <Droplets className="w-5 h-5 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-800">Air Bersih</h4>
            </div>
            <p className="text-gray-600 text-sm">
              Selalu minum air yang sudah direbus atau air kemasan bermerek. Pastikan sumber air Anda terlindungi dari kontaminasi.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center mb-3">
              <div className="bg-green-100 p-2 rounded-lg mr-3">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-800">Kebersihan</h4>
            </div>
            <p className="text-gray-600 text-sm">
              Cuci tangan dengan sabun sebelum makan dan setelah BAB. Jaga kebersihan lingkungan dan makanan.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center mb-3">
              <div className="bg-purple-100 p-2 rounded-lg mr-3">
                <Heart className="w-5 h-5 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-800">Vaksinasi</h4>
            </div>
            <p className="text-gray-600 text-sm">
              Lengkapi vaksinasi seperti Hepatitis A, Tifoid, dan Kolera sesuai anjuran dokter untuk perlindungan optimal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}