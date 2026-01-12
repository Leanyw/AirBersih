import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getUserProfile } from '@/lib/supabase';
import { ReportService } from '@/services/reportService';
import { reportFilterSchema } from '@/lib/validations/reportValidations';
import { successResponse, errorResponse } from '@/lib/api/apiHelpers';

interface RouteParams {
  params: Promise<{ puskesmas_id: string }>;
}

// GET: Get reports by puskesmas (for puskesmas dashboard)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { puskesmas_id } = await params;
    
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        errorResponse('Unauthorized', 'Silakan login terlebih dahulu'),
        { status: 401 }
      );
    }

    // Get user profile for role info
    const profile = await getUserProfile(user.id);
    if (!profile) {
      return NextResponse.json(
        errorResponse('Unauthorized', 'Profil pengguna tidak ditemukan'),
        { status: 401 }
      );
    }

    // Authorization: only puskesmas staff for their own puskesmas
    if (profile.role === 'puskesmas' && profile.puskesmas_id !== puskesmas_id) {
      return NextResponse.json(
        errorResponse('Forbidden', 'Anda hanya dapat melihat laporan di puskesmas Anda'),
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters = reportFilterSchema.parse({
      status: searchParams.get('status'),
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    });

    // Get reports by puskesmas
    const result = await ReportService.getReportsByPuskesmas(puskesmas_id, filters);

    return NextResponse.json(successResponse(result, 'Laporan puskesmas berhasil diambil'));

  } catch (error: any) {
    console.error('Error fetching puskesmas reports:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        errorResponse('Validation Error', 'Parameter filter tidak valid'),
        { status: 400 }
      );
    }

    return NextResponse.json(
      errorResponse('Server Error', error.message || 'Gagal mengambil laporan puskesmas'),
      { status: 500 }
    );
  }
}