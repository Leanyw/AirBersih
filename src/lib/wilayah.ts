import { supabase } from './supabase';

class WilayahService {
  private cache = new Map<string, any>();

  // 1. Clear cache
  clearCache() {
    this.cache.clear();
  }

  // 2. Dapatkan wilayah user berdasarkan ID
  async getWilayahByUserId(userId: string): Promise<{
    kecamatan: string;
    kelurahan: string;
    puskesmas_id: string | null;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('kecamatan, kelurahan, puskesmas_id')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error getting user wilayah:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getWilayahByUserId:', error);
      return null;
    }
  }

  // 3. Dapatkan sumber air berdasarkan kecamatan
  async getWaterSourcesByKecamatan(kecamatan: string): Promise<any[]> {
    const cacheKey = `sources_${kecamatan}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const { data, error } = await supabase
        .from('water_sources')
        .select('*')
        .eq('kecamatan', kecamatan)
        .order('status', { ascending: true })
        .limit(15);

      if (error) {
        console.error('Error getting water sources:', error);
        return [];
      }

      this.cache.set(cacheKey, data || []);
      return data || [];
    } catch (error) {
      console.error('Error in getWaterSourcesByKecamatan:', error);
      return [];
    }
  }

  // 4. Dapatkan notifikasi untuk kecamatan
  async getNotificationsForKecamatan(kecamatan: string): Promise<any[]> {
    const cacheKey = `notif_${kecamatan}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Query 1: Notifikasi dengan kecamatan spesifik
      const { data: kecamatanNotif, error: kecError } = await supabase
        .from('notifications')
        .select('*')
        .eq('kecamatan', kecamatan)
        .order('created_at', { ascending: false })
        .limit(10);

      if (kecError) {
        console.error('Error getting kecamatan notifications:', kecError);
      }

      // Query 2: Notifikasi global (tanpa kecamatan)
      const { data: globalNotif, error: globalError } = await supabase
        .from('notifications')
        .select('*')
        .is('kecamatan', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (globalError) {
        console.error('Error getting global notifications:', globalError);
      }

      // Gabungkan hasil
      const notifications = [
        ...(kecamatanNotif || []),
        ...(globalNotif || [])
      ];

      // Urutkan berdasarkan created_at
      notifications.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      this.cache.set(cacheKey, notifications);
      return notifications;
    } catch (error) {
      console.error('Error in getNotificationsForKecamatan:', error);
      return [];
    }
  }

  // 5. Dapatkan semua kecamatan yang tersedia (FIXED VERSION)
  async getAllKecamatan(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('kecamatan')
        .not('kecamatan', 'is', null);

      if (error) {
        console.error('Error getting all kecamatan:', error);
        return [];
      }

      // Gunakan Set untuk menghilangkan duplikat
      const kecamatanSet = new Set<string>();
      data.forEach((item: { kecamatan: string }) => {
        if (item.kecamatan) {
          kecamatanSet.add(item.kecamatan);
        }
      });

      return Array.from(kecamatanSet);
    } catch (error) {
      console.error('Error in getAllKecamatan:', error);
      return [];
    }
  }

  // 6. Validasi konsistensi kecamatan
  async validateKecamatanConsistency(userId: string): Promise<{
    userKecamatan: string;
    valid: boolean;
    issues: string[];
    puskesmasKecamatan?: string;
  }> {
    try {
      const issues: string[] = [];
      
      // Dapatkan data user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('kecamatan, puskesmas_id')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        issues.push('User tidak ditemukan');
        return {
          userKecamatan: '',
          valid: false,
          issues
        };
      }

      const userKecamatan = userData.kecamatan || '';
      let puskesmasKecamatan: string | undefined;

      // Cek jika user memiliki puskesmas_id
      if (userData.puskesmas_id) {
        const { data: puskesmasData, error: puskesmasError } = await supabase
          .from('puskesmas')
          .select('kecamatan')
          .eq('id', userData.puskesmas_id)
          .single();

        if (puskesmasError) {
          issues.push('Puskesmas tidak ditemukan');
        } else {
          puskesmasKecamatan = puskesmasData.kecamatan;
          
          // Validasi kecamatan user vs kecamatan puskesmas
          if (userKecamatan && userKecamatan !== puskesmasKecamatan) {
            issues.push(`Kecamatan user (${userKecamatan}) tidak sesuai dengan kecamatan puskesmas (${puskesmasKecamatan})`);
          }
        }
      }

      // Cek apakah ada notifikasi untuk kecamatan ini
      if (userKecamatan) {
        const notifications = await this.getNotificationsForKecamatan(userKecamatan);
        if (notifications.length === 0) {
          issues.push(`Tidak ada notifikasi untuk kecamatan ${userKecamatan}`);
        }
      } else {
        issues.push('User tidak memiliki kecamatan');
      }

      return {
        userKecamatan,
        valid: issues.length === 0,
        issues,
        puskesmasKecamatan
      };
    } catch (error) {
      console.error('Error in validateKecamatanConsistency:', error);
      return {
        userKecamatan: '',
        valid: false,
        issues: ['Terjadi kesalahan validasi']
      };
    }
  }

  // 7. Update kecamatan user
  async updateUserKecamatan(userId: string, kecamatan: string): Promise<boolean> {
    try {
      // Cari puskesmas untuk kecamatan ini
      const { data: puskesmas } = await supabase
        .from('puskesmas')
        .select('id')
        .eq('kecamatan', kecamatan)
        .single();

      const { error } = await supabase
        .from('users')
        .update({
          kecamatan,
          puskesmas_id: puskesmas?.id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user kecamatan:', error);
        return false;
      }

      // Clear cache
      this.clearCache();
      return true;
    } catch (error) {
      console.error('Error in updateUserKecamatan:', error);
      return false;
    }
  }

  // 8. Dapatkan semua data wilayah lengkap
  async getWilayahData(kecamatan?: string) {
    try {
      let query = supabase
        .from('users')
        .select(`
          id,
          email,
          nama,
          kecamatan,
          kelurahan,
          puskesmas_id,
          puskesmas:kecamatan
        `);

      if (kecamatan) {
        query = query.eq('kecamatan', kecamatan);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting wilayah data:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Error in getWilayahData:', error);
      return [];
    }
  }
}

export const wilayahService = new WilayahService();