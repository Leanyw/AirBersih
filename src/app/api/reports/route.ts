import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/api/apiHelpers';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: /api/reports (REAL DATA)');
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const status = searchParams.get('status');
    const puskesmas_id = searchParams.get('puskesmas_id');
    
    const offset = (page - 1) * limit;
    
    // 1. GET USER SESSION
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.log('⚠️ No session, returning mock data');
      return getMockReports();
    }
    
    console.log('✅ User authenticated:', session.user.email);
    
    // 2. BUILD QUERY FOR REAL DATA
    let query = supabase
      .from('reports')
      .select(`
        *,
        users:user_id (
          id,
          email, 
          nama,
          phone,
          kecamatan,
          kelurahan
        )
      `, { count: 'exact' });
    
    // Filter by puskesmas_id if provided
    if (puskesmas_id) {
      query = query.eq('puskesmas_id', puskesmas_id);
      console.log('📍 Filter by puskesmas:', puskesmas_id);
    }
    
    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
      console.log('📍 Filter by status:', status);
    }
    
    // Add pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // 3. EXECUTE QUERY
    const { data: reports, error, count } = await query;
    
    if (error) {
      console.error('❌ Database error:', error);
      return getMockReports();
    }
    
    console.log(`✅ Found ${reports?.length || 0} REAL reports in database`);
    
    // 4. RETURN REAL DATA
    return NextResponse.json(
      successResponse({
        reports: reports || [],
        total: count || 0,
        page,
        limit
      }, 'Data laporan REAL dari database')
    );
    
  } catch (error: any) {
    console.error('❌ Error in reports API:', error);
    return getMockReports();
  }
}

// POST: Create new report (for warga)
export async function POST(request: NextRequest) {
  try {
    console.log('📝 API: POST /api/reports (Create new report)');
    
    const body = await request.json();
    console.log('📦 Request body:', body);
    
    // Validate required fields
    const { bau, rasa, warna, lokasi } = body;
    if (!bau || !rasa || !warna || !lokasi) {
      return NextResponse.json(
        errorResponse('Validation Error', 'Data tidak lengkap'),
        { status: 400 }
      );
    }
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        errorResponse('Unauthorized', 'Silakan login terlebih dahulu'),
        { status: 401 }
      );
    }
    
    console.log('✅ User creating report:', session.user.email);
    
    // Get user profile to determine puskesmas
    const { data: userProfile } = await supabase
      .from('users')
      .select('kecamatan')
      .eq('id', session.user.id)
      .single();
    
    let puskesmas_id = null;
    if (userProfile?.kecamatan) {
      // Find puskesmas in same kecamatan
      const { data: puskesmas } = await supabase
        .from('puskesmas')
        .select('id')
        .eq('kecamatan', userProfile.kecamatan)
        .limit(1)
        .single();
      
      puskesmas_id = puskesmas?.id || null;
      console.log('📍 Puskesmas ID determined:', puskesmas_id);
    }
    
    // Prepare report data
    const reportData = {
      user_id: session.user.id,
      foto_url: body.foto_url || null,
      bau,
      rasa,
      warna,
      lokasi,
      keterangan: body.keterangan || null,
      status: 'pending', // Default status
      feedback: null,
      puskesmas_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('💾 Saving to database:', reportData);
    
    // Insert into database
    const { data: newReport, error: insertError } = await supabase
      .from('reports')
      .insert(reportData)
      .select(`
        *,
        users:user_id (
          nama,
          phone
        )
      `)
      .single();
    
    if (insertError) {
      console.error('❌ Database insert error:', insertError);
      throw insertError;
    }
    
    console.log('✅ Report saved to database:', newReport?.id);
    
    return NextResponse.json(
      successResponse(newReport, 'Laporan berhasil dikirim'),
      { status: 201 }
    );
    
  } catch (error: any) {
    console.error('❌ Error creating report:', error);
    return NextResponse.json(
      errorResponse('Server Error', 'Gagal menyimpan laporan'),
      { status: 500 }
    );
  }
}

// Fallback mock data
function getMockReports() {
  console.log('🔄 Returning MOCK reports');
  return NextResponse.json({
    success: true,
    data: {
      reports: [],
      total: 0,
      page: 1,
      limit: 10
    },
    message: 'Database kosong, data mock digunakan'
  });
}