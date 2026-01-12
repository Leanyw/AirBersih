// Business logic for reports
import { supabase } from '@/lib/supabase';
import { 
  CreateReportInput, 
  UpdateReportInput, 
  ReportFilterInput 
} from '@/lib/validations/reportValidations';

export class ReportService {
  // Get reports with filters
  static async getReports(filters: ReportFilterInput & { user_id?: string, role?: string }) {
    const { 
      status, 
      kecamatan, 
      puskesmas_id, 
      startDate, 
      endDate, 
      page, 
      limit,
      user_id,
      role
    } = filters;
    
    const offset = (page - 1) * limit;

    let query = supabase
      .from('reports')
      .select(`
        *,
        users:user_id (
          id,
          nama,
          email,
          phone,
          kecamatan,
          kelurahan
        ),
        puskesmas:puskesmas_id (
          id,
          nama,
          kecamatan,
          alamat
        )
      `, { count: 'exact' });

    // Apply filters based on user role
    if (role === 'warga') {
      // Warga hanya bisa lihat laporan mereka sendiri
      query = query.eq('user_id', user_id);
    } else if (role === 'puskesmas' && puskesmas_id) {
      // Puskesmas hanya bisa lihat laporan di wilayahnya
      query = query.eq('puskesmas_id', puskesmas_id);
    }
    // Admin/superadmin bisa lihat semua (no filter)

    // Apply other filters
    if (status) query = query.eq('status', status);
    if (kecamatan) query = query.eq('users.kecamatan', kecamatan);
    if (puskesmas_id && role !== 'puskesmas') {
      query = query.eq('puskesmas_id', puskesmas_id);
    }
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    // Add sorting and pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      reports: data || [],
      total: count || 0,
      page,
      limit,
    };
  }

  // Get single report
  static async getReportById(id: string, user_id?: string, role?: string) {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        users:user_id (
          id,
          nama,
          email,
          phone,
          kecamatan,
          kelurahan
        ),
        puskesmas:puskesmas_id (
          id,
          nama,
          kecamatan,
          alamat
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Authorization check
    if (role === 'warga' && data.user_id !== user_id) {
      throw new Error('Unauthorized: Anda hanya bisa melihat laporan Anda sendiri');
    }

    return data;
  }

  // Create new report
  static async createReport(reportData: CreateReportInput & { user_id: string }) {
    // Get user's puskesmas based on kecamatan
    const { data: user } = await supabase
      .from('users')
      .select('kecamatan')
      .eq('id', reportData.user_id)
      .single();

    if (!user) throw new Error('User not found');

    // Find puskesmas for user's kecamatan
    const { data: puskesmas } = await supabase
      .from('puskesmas')
      .select('id')
      .eq('kecamatan', user.kecamatan)
      .single();

    const reportWithPuskesmas = {
      ...reportData,
      puskesmas_id: puskesmas?.id || null,
      status: 'pending' as const,
    };

    const { data, error } = await supabase
      .from('reports')
      .insert(reportWithPuskesmas)
      .select(`
        *,
        users:user_id (
          nama,
          phone
        )
      `)
      .single();

    if (error) throw error;
    return data;
  }

  // Update report (status, feedback, etc)
  static async updateReport(id: string, updates: UpdateReportInput) {
    const { data, error } = await supabase
      .from('reports')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete report (soft delete - just update status)
  static async deleteReport(id: string) {
    const { data, error } = await supabase
      .from('reports')
      .update({
        status: 'ditolak',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get dashboard stats for puskesmas
  static async getPuskesmasDashboardStats(puskesmas_id: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('reports')
      .select('*', { count: 'exact' })
      .eq('puskesmas_id', puskesmas_id);

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data: allReports, error: allError, count: total } = await query;

    if (allError) throw allError;

    // Count by status
    const pending = allReports?.filter(r => r.status === 'pending').length || 0;
    const diproses = allReports?.filter(r => r.status === 'diproses').length || 0;
    const selesai = allReports?.filter(r => r.status === 'selesai').length || 0;
    const ditolak = allReports?.filter(r => r.status === 'ditolak').length || 0;

    // Get recent reports (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentReports } = await supabase
      .from('reports')
      .select('*')
      .eq('puskesmas_id', puskesmas_id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculate average response time (in hours)
    let avgResponseTime = 0;
    const completedReports = allReports?.filter(r => r.status === 'selesai' && r.created_at && r.updated_at);
    
    if (completedReports && completedReports.length > 0) {
      const totalHours = completedReports.reduce((sum, report) => {
        const created = new Date(report.created_at);
        const updated = new Date(report.updated_at);
        const hours = (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      avgResponseTime = Math.round(totalHours / completedReports.length);
    }

    return {
      total,
      pending,
      diproses,
      selesai,
      ditolak,
      avgResponseTime,
      recentReports: recentReports || [],
    };
  }

  // Get reports by puskesmas
  static async getReportsByPuskesmas(puskesmas_id: string, filters?: Partial<ReportFilterInput>) {
    const { page = 1, limit = 20, status } = filters || {};
    const offset = (page - 1) * limit;

    let query = supabase
      .from('reports')
      .select(`
        *,
        users:user_id (
          id,
          nama,
          phone,
          kecamatan
        )
      `, { count: 'exact' })
      .eq('puskesmas_id', puskesmas_id);

    if (status) query = query.eq('status', status);

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      reports: data || [],
      total: count || 0,
      page,
      limit,
    };
  }
}