'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, MapPin, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

type WaterSource = {
  id: string;
  nama: string;
  jenis: string;
  alamat: string;
  status: string;
  kecamatan: string;
  last_checked: string | null;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'aman':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'rawan':
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    case 'tidak_aman':
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <MapPin className="w-5 h-5 text-gray-400" />;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'aman':
      return 'Aman';
    case 'rawan':
      return 'Rawan';
    case 'tidak_aman':
      return 'Tidak Aman';
    default:
      return status;
  }
};

export default function SumberAirPage() {
  const { user } = useAuth();
  const [waterSources, setWaterSources] = useState<WaterSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('kecamatan')
        .eq('id', user?.id)
        .single();

      if (userData) {
        const { data, error } = await supabase
          .from('water_sources')
          .select('*')
          .eq('kecamatan', userData.kecamatan)
          .order('status', { ascending: true });

        if (error) throw error;
        setWaterSources(data || []);
      }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Sumber Air</h1>
          <p className="text-gray-600 mt-2">Daftar sumber air di wilayah Anda</p>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Kembali
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama Sumber
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jenis
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alamat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Terakhir Dicek
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {waterSources.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Belum ada data sumber air
                  </td>
                </tr>
              ) : (
                waterSources.map((source) => (
                  <tr key={source.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="font-medium text-gray-900">{source.nama}</div>
                          <div className="text-sm text-gray-500">{source.kecamatan}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{source.jenis}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{source.alamat}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {getStatusIcon(source.status)}
                        <span className="ml-2 font-medium">
                          {getStatusText(source.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {source.last_checked
                          ? new Date(source.last_checked).toLocaleDateString('id-ID')
                          : 'Belum pernah'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}