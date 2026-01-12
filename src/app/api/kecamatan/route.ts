import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api/apiHelpers';

// GET: Get all kecamatan (public endpoint)
export async function GET(request: NextRequest) {
  try {
    // Get distinct kecamatan from puskesmas table
    const { data, error } = await supabase
      .from('puskesmas')
      .select('kecamatan')
      .order('kecamatan');

    if (error) throw error;

    // Extract unique kecamatan
    const uniqueKecamatan = Array.from(
      new Set(data.map(item => item.kecamatan))
    ).map(kecamatan => ({
      id: kecamatan.toLowerCase().replace(/\s+/g, '-'),
      name: kecamatan,
    }));

    return NextResponse.json(
      successResponse(uniqueKecamatan, 'Data kecamatan berhasil diambil')
    );

  } catch (error: any) {
    console.error('Error fetching kecamatan:', error);
    return NextResponse.json(
      errorResponse('Server Error', error.message || 'Gagal mengambil data kecamatan'),
      { status: 500 }
    );
  }
}