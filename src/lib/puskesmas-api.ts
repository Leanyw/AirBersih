import { Report, DashboardStats, Notification, WaterSource, WaterTest } from '@/types/puskesmas'

// Mock data untuk development
export const puskesmasService = {
  // Reports
  async getRecentReports(): Promise<Report[]> {
    // Simulasi delay API
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return [
      {
        id: '1',
        userId: 'user1',
        userName: 'Bapak Jono',
        userPhone: '081234567890',
        userRT: '01',
        userRW: '05',
        location: 'Jl. Desa Sehat No. 12, RT 01/RW 05',
        description: 'Air sumur terasa aneh dan berbau besi, warna agak kecoklatan. Sudah 3 hari keluarga saya mengalami diare ringan.',
        photoUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
        status: 'pending',
        priority: 'high',
        createdAt: new Date().toISOString(),
        waterQuality: {
          smell: 'berbau_besi',
          taste: 'tidak_normal',
          color: 'kecoklatan',
          temperature: 28
        }
      },
      {
        id: '2',
        userId: 'user2',
        userName: 'Ibu Siti',
        userPhone: '081298765432',
        userRT: '03',
        userRW: '05',
        location: 'Jl. Sejahtera No. 45, RT 03/RW 05',
        description: 'Air PDAM keruh sejak pagi, ada endapan di dasar bak mandi.',
        photoUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w-400&h=300&fit=crop',
        status: 'processing',
        priority: 'medium',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
        waterQuality: {
          smell: 'tidak_berbau',
          taste: 'normal',
          color: 'keruh',
          temperature: 26
        }
      }
    ]
  },

  async getReports(status?: string): Promise<Report[]> {
    await new Promise(resolve => setTimeout(resolve, 500))
    const reports = await this.getRecentReports()
    
    if (!status || status === 'all') return reports
    return reports.filter(report => report.status === status)
  },

  async updateReportStatus(reportId: string, status: 'pending' | 'processing' | 'completed' | 'rejected'): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300))
    console.log(`Report ${reportId} status updated to ${status}`)
  },

  async submitLabAnalysis(reportId: string, testResults: WaterTest): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500))
    console.log('Lab analysis submitted:', { reportId, testResults })
  },

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      totalReports: 24,
      pendingReports: 8,
      processingReports: 12,
      completedReports: 4,
      averageResponseTime: 36,
      waterSources: 6,
      activeUsers: 87
    }
  },

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    await new Promise(resolve => setTimeout(resolve, 500))
    return [
      {
        id: '1',
        title: 'Peringatan Kualitas Air',
        message: 'Air di wilayah utara telah aman untuk dikonsumsi setelah proses pembersihan',
        type: 'broadcast',
        status: 'sent',
        recipients: 150,
        sentAt: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Hasil Analisis Selesai',
        message: 'Hasil analisis laboratorium untuk laporan Bapak Jono sudah tersedia',
        type: 'individual',
        status: 'sent',
        recipients: 1,
        sentAt: new Date().toISOString()
      }
    ]
  },

  async sendNotification(data: {
    message: string
    area: string
    type: string
  }): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500))
    console.log('Notification sent:', data)
  },

  // Water Sources
  async getWaterSources(): Promise<WaterSource[]> {
    await new Promise(resolve => setTimeout(resolve, 500))
    return [
      {
        id: '1',
        name: 'Sumur Desa Sehat',
        location: 'RT 02/RW 04',
        type: 'sumur_bor',
        status: 'safe',
        capacity: '5000 L/hari',
        users: 45,
        lastChecked: new Date().toISOString(),
        notes: 'Dicek rutin setiap minggu'
      },
      {
        id: '2',
        name: 'PDAM Blok Timur',
        location: 'RT 05/RW 03',
        type: 'pdam',
        status: 'warning',
        capacity: '10000 L/hari',
        users: 120,
        lastChecked: new Date().toISOString(),
        notes: 'Sedang dalam perbaikan jaringan'
      }
    ]
  },

  async updateWaterSource(sourceId: string, data: Partial<WaterSource>): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300))
    console.log(`Water source ${sourceId} updated:`, data)
  }
}
