import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getUserProfile } from '@/lib/supabase';
import { ReportService } from '@/services/reportService';
import { updateReportSchema } from '@/lib/validations/reportValidations';
import { successResponse, errorResponse } from '@/lib/api/apiHelpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Get single report
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
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

    // Get report
    const report = await ReportService.getReportById(
      id, 
      user.id, 
      profile.role
    );

    return NextResponse.json(successResponse(report, 'Laporan berhasil diambil'));

  } catch (error: any) {
    console.error('Error fetching report:', error);
    
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json(
        errorResponse('Unauthorized', error.message),
        { status: 403 }
      );
    }

    if (error.code === 'PGRST116') { // Supabase "not found" error
      return NextResponse.json(
        errorResponse('Not Found', 'Laporan tidak ditemukan'),
        { status: 404 }
      );
    }

    return NextResponse.json(
      errorResponse('Server Error', error.message || 'Gagal mengambil laporan'),
      { status: 500 }
    );
  }
}

// PUT: Update report (status, feedback, etc)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
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

    // Only puskesmas and admin can update reports
    if (!['puskesmas', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        errorResponse('Forbidden', 'Anda tidak memiliki izin untuk mengupdate laporan'),
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validatedData = updateReportSchema.parse(body);

    // Update report
    const updatedReport = await ReportService.updateReport(id, validatedData);

    return NextResponse.json(
      successResponse(updatedReport, 'Laporan berhasil diperbarui')
    );

  } catch (error: any) {
    console.error('Error updating report:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        errorResponse('Validation Error', 'Data update tidak valid'),
        { status: 400 }
      );
    }

    if (error.code === 'PGRST116') {
      return NextResponse.json(
        errorResponse('Not Found', 'Laporan tidak ditemukan'),
        { status: 404 }
      );
    }

    return NextResponse.json(
      errorResponse('Server Error', error.message || 'Gagal mengupdate laporan'),
      { status: 500 }
    );
  }
}

// DELETE: Soft delete report (update status to 'ditolak')
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
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

    // Only puskesmas and admin can delete reports
    if (!['puskesmas', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        errorResponse('Forbidden', 'Anda tidak memiliki izin untuk menghapus laporan'),
        { status: 403 }
      );
    }

    // Soft delete report (update status to 'ditolak')
    const deletedReport = await ReportService.deleteReport(id);

    return NextResponse.json(
      successResponse(deletedReport, 'Laporan berhasil dihapus')
    );

  } catch (error: any) {
    console.error('Error deleting report:', error);
    
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        errorResponse('Not Found', 'Laporan tidak ditemukan'),
        { status: 404 }
      );
    }

    return NextResponse.json(
      errorResponse('Server Error', error.message || 'Gagal menghapus laporan'),
      { status: 500 }
    );
  }
}