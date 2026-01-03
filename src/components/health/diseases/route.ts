import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const limit = searchParams.get('limit');
    const severity = searchParams.get('severity');

    let query = supabase.from('diseases').select('*');

    if (category && category !== 'semua') {
      query = query.eq('kategori', category);
    }

    if (severity) {
      query = query.eq('tingkat_keparahan', severity);
    }

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    query = query.order('nama');

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ diseases: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}