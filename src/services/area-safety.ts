import { supabase } from '@/lib/supabase';

export interface AreaSafetyData {
  id: string;
  kecamatan: string;
  kelurahan: string;
  safety_level: 'aman' | 'waspada' | 'rawan' | 'bahaya';
  total_contaminants: number;
  main_contaminant: string;
  test_date: string;
  puskesmas_id: string;
}

export class AreaSafetyService {
  static async getLatestByKecamatan(kecamatan: string): Promise<AreaSafetyData | null> {
    try {
      const { data, error } = await supabase
        .from('area_safety_history')
        .select('*')
        .eq('kecamatan', kecamatan)
        .order('test_date', { ascending: false })
        .limit(1);

      if (error) {
        // Jika error 406 atau data tidak ditemukan
        if (error.code === 'PGRST116' || error.message.includes('406')) {
          console.log('No safety data found for:', kecamatan);
          return null;
        }
        throw error;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error fetching area safety:', error);
      return null;
    }
  }

  static async getHistoryByKecamatan(
    kecamatan: string, 
    days: number = 30
  ): Promise<AreaSafetyData[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('area_safety_history')
        .select('*')
        .eq('kecamatan', kecamatan)
        .gte('test_date', startDate.toISOString().split('T')[0])
        .order('test_date', { ascending: false });

      if (error) {
        // Handle specific errors
        if (error.code === 'PGRST116' || error.message.includes('406')) {
          return [];
        }
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching safety history:', error);
      return [];
    }
  }

  static async createSafetyReport(data: Omit<AreaSafetyData, 'id' | 'created_at'>) {
    try {
      const { data: result, error } = await supabase
        .from('area_safety_history')
        .insert([{
          ...data,
          test_date: data.test_date || new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Error creating safety report:', error);
      throw error;
    }
  }
}