import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // 1. Cek user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('👤 User fetching reports:', user.id);

    // 2. Cek profile puskesmas
    let kecamatan = '';
    
    // Cek di table puskesmas dulu
    const { data: puskesmasData } = await supabase
      .from('puskesmas')
      .select('kecamatan, nama')
      .eq('id', user.id)
      .single();

    if (puskesmasData) {
      kecamatan = puskesmasData.kecamatan;
    } else {
      // Cek di users table
      const { data: userData } = await supabase
        .from('users')
        .select('kecamatan, nama, role')
        .eq('id', user.id)
        .single();

      if (!userData || userData.role !== 'puskesmas') {
        return NextResponse.json(
          { success: false, message: 'Not a puskesmas user' },
          { status: 403 }
        );
      }
      kecamatan = userData.kecamatan;
    }

    if (!kecamatan) {
      return NextResponse.json(
        { success: false, message: 'Kecamatan not found' },
        { status: 400 }
      );
    }

    console.log('📍 Filtering by kecamatan:', kecamatan);

    // 3. Ambil reports dengan JOIN yang benar
    const { data: reports, error: reportsError } = await supabase
      .from('report')
      .select(`
        id,
        user_id,
        lokasi,
        keterangan,
        foto_url,
        bau,
        rasa,
        warna,
        suhu,
        status,
        created_at,
        updated_at,
        kecamatan,
        users!report_user_id_fkey (
          nama,
          phone
        )
      `)
      .eq('kecamatan', kecamatan)
      .order('created_at', { ascending: false });

    if (reportsError) {
      console.error('Reports query error:', reportsError);
      throw reportsError;
    }

    console.log('✅ Reports found:', reports?.length || 0);

    // 4. Ambil lab_results terpisah (karena mungkin belum ada atau ada error join)
    let reportsWithLabResults = reports || [];
    
    if (reportsWithLabResults.length > 0) {
      const reportIds = reportsWithLabResults.map(r => r.id);
      
      const { data: labResults, error: labError } = await supabase
        .from('lab_results')
        .select('*')
        .in('report_id', reportIds);

      if (!labError && labResults) {
        // Gabungkan lab_results ke reports
        reportsWithLabResults = reportsWithLabResults.map(report => ({
          ...report,
          lab_results: labResults.find(lr => lr.report_id === report.id) || undefined
        }));
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        reports: reportsWithLabResults,
        kecamatan,
        total: reportsWithLabResults.length
      }
    });

  } catch (error: any) {
    console.error('❌ Error in puskesmas reports API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Internal server error'
      },
      { status: 500 }
    );
  }
}