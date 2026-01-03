'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, BookOpen, Shield, RefreshCw } from 'lucide-react';

type Disease = {
  id: string;
  nama: string;
  gejala: string;
  tingkat_keparahan: string;
};

export default function HealthWidget() {
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTopDiseases();
  }, []);

  const fetchTopDiseases = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching diseases from Supabase...');
      
      // Test koneksi Supabase dulu
      const { data: testData, error: testError } = await supabase
        .from('diseases')
        .select('count', { count: 'exact', head: true });
      
      console.log('Test query result:', { testData, testError });
      
      if (testError) {
        throw new Error(`Connection error: ${testError.message}`);
      }
      
      // Fetch data diseases
      const { data, error } = await supabase
        .from('diseases')
        .select('id, nama, gejala, tingkat_keparahan')
        .order('created_at', { ascending: false })
        .limit(3);

      console.log('Diseases query result:', { data, error });

      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn('No diseases data found in database');
        // Gunakan data fallback jika database kosong
        setDiseases(getFallbackDiseases());
      } else {
        setDiseases(data);
      }
      
    } catch (err: any) {
      console.error('Error fetching diseases:', err);
      setError(err.message || 'Gagal memuat data penyakit');
      
      // Fallback data untuk development
      setDiseases(getFallbackDiseases());
    } finally {
      setIsLoading(false);
    }
  };

  // Data fallback untuk development
  const getFallbackDiseases = (): Disease[] => {
    return [
      {
        id: '1',
        nama: 'Diare',
        gejala: 'BAB cair lebih dari 3x sehari, mual, muntah, dehidrasi',
        tingkat_keparahan: 'ringan'
      },
      {
        id: '2',
        nama: 'Kolera',
        gejala: 'Diare parah seperti air cucian beras, dehidrasi cepat',
        tingkat_keparahan: 'berat'
      },
      {
        id: '3',
        nama: 'Tifus',
        gejala: 'Demam tinggi, sakit kepala, lemas, sakit perut',
        tingkat_keparahan: 'sedang'
      }
    ];
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
      <div className="bg-white rounded-xl shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Info Kesehatan</h3>
              <p className="text-sm text-gray-600">Penyakit akibat air terkontaminasi</p>
            </div>
          </div>
          <Link 
            href="/kesehatan"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Lihat semua
          </Link>
        </div>
      </div>
      
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={fetchTopDiseases}
                className="flex items-center gap-1 text-sm text-red-700 hover:text-red-900"
              >
                <RefreshCw className="w-3 h-3" />
                Coba lagi
              </button>
            </div>
          </div>
        )}
        
        {diseases.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Belum ada data penyakit</p>
          </div>
        ) : (
          <div className="space-y-4">
            {diseases.map((disease) => (
              <Link
                key={disease.id}
                href={`/kesehatan/penyakit/${disease.id}`}
                className="block p-4 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-800 group-hover:text-blue-600">
                    {disease.nama}
                  </h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(disease.tingkat_keparahan)}`}>
                    {getSeverityIcon(disease.tingkat_keparahan)} {disease.tingkat_keparahan}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {disease.gejala.substring(0, 80)}...
                </p>
              </Link>
            ))}
          </div>
        )}
        
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href="/kesehatan#pencegahan"
            className="flex flex-col items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Shield className="w-5 h-5 text-green-600 mb-1" />
            <span className="text-xs font-medium text-gray-700">Pencegahan</span>
          </Link>
          <Link
            href="/kesehatan/tutorial"
            className="flex flex-col items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <BookOpen className="w-5 h-5 text-blue-600 mb-1" />
            <span className="text-xs font-medium text-gray-700">Panduan</span>
          </Link>
        </div>
      </div>
    </div>
  );
}