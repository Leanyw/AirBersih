import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const limit = searchParams.get('limit');

    let query = supabase.from('tutorials').select('*');

    if (category) {
      query = query.eq('kategori', category);
    }

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    query = query.order('judul');

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ tutorials: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}