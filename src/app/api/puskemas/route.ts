import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api/apiHelpers';

// GET: Get all puskesmas or filter by kecamatan (public endpoint)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const kecamatan = searchParams.get('kecamatan');

    let query = supabase
      .from('puskesmas')
      .select('id, nama, kecamatan, alamat, phone, email')
      .order('nama');

    // Filter by kecamatan if provided
    if (kecamatan) {
      query = query.ilike('kecamatan', `%${kecamatan}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(
      successResponse(data || [], 'Data puskesmas berhasil diambil')
    );

  } catch (error: any) {
    console.error('Error fetching puskesmas:', error);
    return NextResponse.json(
      errorResponse('Server Error', error.message || 'Gagal mengambil data puskesmas'),
      { status: 500 }
    );
  }
}