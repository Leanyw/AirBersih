'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Clock, AlertCircle, CheckCircle } from 'lucide-react';

type Report = {
  id: string;
  status: string;
  bau: string;
  rasa: string;
  warna: string;
  lokasi: string;
  keterangan: string;
  feedback: string | null;
  created_at: string;
  updated_at: string;
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

export default function StatusDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [params.id, user, router]);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      setReport(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Laporan tidak ditemukan</h2>
          <Link href="/laporan" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
            Kembali ke daftar laporan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Detail Laporan</h1>
          <p className="text-gray-600 mt-2">Informasi lengkap laporan Anda</p>
        </div>
        <Link
          href="/laporan"
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Kembali
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Informasi Laporan</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <div className="flex items-center mt-1">
                  {getStatusIcon(report.status)}
                  <span className="ml-2 font-medium">
                    {getStatusText(report.status)}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tanggal Dilaporkan</p>
                <p className="mt-1">
                  {new Date(report.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Lokasi</p>
                <p className="mt-1">{report.lokasi || 'Tidak disebutkan'}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Kondisi Air</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Bau</p>
                <p className="mt-1">{report.bau}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Rasa</p>
                <p className="mt-1">{report.rasa}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Warna</p>
                <p className="mt-1">{report.warna}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Keterangan</h3>
          <p className="text-gray-700">{report.keterangan || 'Tidak ada keterangan tambahan'}</p>
        </div>

        {report.feedback && (
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Feedback dari Puskesmas</h3>
            <p className="text-blue-700">{report.feedback}</p>
          </div>
        )}
      </div>
    </div>
  );
}