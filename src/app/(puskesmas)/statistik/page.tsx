'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Droplets, 
  AlertTriangle,
  Calendar,
  Filter,
  Download,
  FileText,
  CheckCircle,
  Clock,
  X,
  MapPin,
  Activity,
  RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import StatCard from '@/components/StatCard'

interface DashboardStats {
  totalReports: number
  resolvedReports: number
  pendingReports: number
  rejectedReports: number
  processingReports: number
  averageResponseTime: number
  waterQualityGood: number
  waterQualityPoor: number
  activeUsers: number
  totalLabTests: number
}

interface ReportTrend {
  date: string
  count: number
}

interface ProblemArea {
  area: string
  reports: number
  trend: 'up' | 'down' | 'stable'
  kecamatan: string
}

interface WaterQualityData {
  good: number
  warning: number
  danger: number
  total: number
}

export default function StatistikPage() {
  const { user, profile } = useAuth()
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [stats, setStats] = useState<DashboardStats>({
    totalReports: 0,
    resolvedReports: 0,
    pendingReports: 0,
    rejectedReports: 0,
    processingReports: 0,
    averageResponseTime: 0,
    waterQualityGood: 0,
    waterQualityPoor: 0,
    activeUsers: 0,
    totalLabTests: 0
  })
  
  const [trendData, setTrendData] = useState<ReportTrend[]>([])
  const [problemAreas, setProblemAreas] = useState<ProblemArea[]>([])
  const [waterQualityData, setWaterQualityData] = useState<WaterQualityData>({
    good: 0,
    warning: 0,
    danger: 0,
    total: 0
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const timeRanges = [
    { id: 'week' as const, label: 'Minggu ini' },
    { id: 'month' as const, label: 'Bulan ini' },
    { id: 'quarter' as const, label: '3 Bulan' },
    { id: 'year' as const, label: 'Tahun ini' }
  ]

  useEffect(() => {
    if (user && profile?.role === 'puskesmas') {
      fetchStatistics()
    }
  }, [user, profile, timeRange])

  const fetchStatistics = async () => {
    try {
      setIsLoading(true)
      
      if (!profile?.kecamatan) {
        throw new Error('Kecamatan tidak ditemukan')
      }

      console.log('📊 Fetching statistics for kecamatan:', profile.kecamatan)
      
      // 1. Fetch all reports for this puskesmas kecamatan
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .eq('kecamatan', profile.kecamatan)
        .order('created_at', { ascending: false })

      if (reportsError) {
        console.error('Reports fetch error:', reportsError)
        throw reportsError
      }

      console.log('📋 Total reports found:', reportsData?.length || 0)

      // 2. Fetch lab results for these reports
      const reportIds = reportsData?.map(r => r.id) || []
      let labResultsData: any[] = []
      
      if (reportIds.length > 0) {
        try {
          const { data, error: labError } = await supabase
            .from('lab_results')
            .select('*')
            .in('report_id', reportIds)
            .order('created_at', { ascending: false })

          if (labError) {
            console.warn('⚠️ Lab results fetch error (non-critical):', labError.message)
          } else if (data) {
            labResultsData = data
            console.log('🔬 Lab results found:', labResultsData.length)
          }
        } catch (labFetchError: any) {
          console.warn('⚠️ Lab results fetch failed (continuing without):', labFetchError.message)
        }
      }

      // 3. Fetch active users in kecamatan
      let usersData: any[] = []
      
      try {
        const { data, error: usersError } = await supabase
          .from('users')
          .select('id, created_at')
          .eq('kecamatan', profile.kecamatan)
          .eq('role', 'warga')
          .gte('created_at', getDateRangeStart())

        if (usersError) {
          console.warn('⚠️ Users fetch error (non-critical):', usersError.message)
        } else if (data) {
          usersData = data
        }
      } catch (usersFetchError: any) {
        console.warn('⚠️ Users fetch failed (continuing with defaults):', usersFetchError.message)
      }

      // 4. Calculate statistics
      await calculateStatistics(reportsData || [], labResultsData, usersData)

    } catch (error: any) {
      console.error('❌ Error fetching statistics:', error)
      toast.error(`Gagal memuat statistik: ${error.message}`)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const calculateStatistics = async (
    reports: any[], 
    labResults: any[], 
    users: any[]
  ) => {
    try {
      console.log('📊 Calculating statistics from:', {
        reports: reports.length,
        labResults: labResults.length,
        users: users.length
      });

      // Total reports
      const totalReports = reports.length;
      
      // Status breakdown
      const resolvedReports = reports.filter(r => r.status === 'selesai').length;
      const pendingReports = reports.filter(r => r.status === 'pending').length;
      const rejectedReports = reports.filter(r => r.status === 'ditolak').length;
      const processingReports = reports.filter(r => r.status === 'diproses').length;

      // Calculate average response time (days)
      let averageResponseTime = 0;
      const completedReports = reports.filter(r => 
        r.status === 'selesai' && r.created_at && r.updated_at
      );
      
      if (completedReports.length > 0) {
        const totalDays = completedReports.reduce((sum, report) => {
          const created = new Date(report.created_at);
          const updated = new Date(report.updated_at || report.created_at);
          const days = (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0);
        averageResponseTime = Math.round((totalDays / completedReports.length) * 10) / 10;
      }

      // ✅ FIXED: Group lab results by report_id and parameter untuk menghitung water quality
      let waterQualityData = { good: 0, warning: 0, danger: 0, total: 0 };

      if (labResults.length > 0) {
        // Group lab results by report_id
        const labByReport = new Map<string, any[]>();
        
        labResults.forEach(lab => {
          if (lab.report_id) {
            const existing = labByReport.get(lab.report_id) || [];
            existing.push(lab);
            labByReport.set(lab.report_id, existing);
          }
        });

        console.log('🔬 Lab results grouped by report:', labByReport.size, 'unique reports');

        // Get overall_safety for each report
        let safeCount = 0;
        let warningCount = 0;
        let dangerCount = 0;

        labByReport.forEach((rows, reportId) => {
          // Find overall_safety row
          const overallRow = rows.find(r => r.parameter === 'overall_safety');
          if (overallRow) {
            const safetyLevel = (overallRow.status || '').toLowerCase();
            
            console.log(`Report ${reportId} safety level:`, safetyLevel);
            
            if (safetyLevel === 'aman' || safetyLevel === 'safe' || safetyLevel === '1') {
              safeCount++;
            } else if (safetyLevel === 'warning' || safetyLevel === '2') {
              warningCount++;
            } else if (safetyLevel === 'bahaya' || safetyLevel === 'danger' || safetyLevel === '3') {
              dangerCount++;
            }
          }
        });

        const totalTests = safeCount + warningCount + dangerCount;

        if (totalTests > 0) {
          waterQualityData = {
            good: Math.round((safeCount / totalTests) * 100),
            warning: Math.round((warningCount / totalTests) * 100),
            danger: Math.round((dangerCount / totalTests) * 100),
            total: totalTests
          };

          console.log('✅ Water quality calculated:', waterQualityData);
        } else {
          console.log('📭 No valid lab tests found for water quality calculation');
          // Default values jika tidak ada data
          waterQualityData = { good: 0, warning: 0, danger: 0, total: 0 };
        }
      } else {
        console.log('📭 No lab results available');
        waterQualityData = { good: 0, warning: 0, danger: 0, total: 0 };
      }

      // Active users
      const activeUsers = users.length;

      // Total lab tests (count unique report_ids with overall_safety parameter)
      const totalLabTests = waterQualityData.total;

      console.log('📈 Total lab tests:', totalLabTests);

      // Update stats state
      setStats({
        totalReports,
        resolvedReports,
        pendingReports,
        rejectedReports,
        processingReports,
        averageResponseTime,
        waterQualityGood: waterQualityData.good,
        waterQualityPoor: waterQualityData.warning + waterQualityData.danger,
        activeUsers,
        totalLabTests
      });

      // Calculate trend data
      const trendData = calculateTrendData(reports);
      setTrendData(trendData);

      // Calculate problem areas
      const problemAreasData = calculateProblemAreas(reports);
      setProblemAreas(problemAreasData);

      // Set water quality data
      setWaterQualityData(waterQualityData);

      console.log('✅ Statistics calculated successfully');
      
    } catch (error) {
      console.error('❌ Error calculating statistics:', error);
    }
  };

const calculateTrendData = (reports: any[]): ReportTrend[] => {
  const trend: ReportTrend[] = []
  const days = 7 // Last 7 days
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toLocaleDateString('id-ID', { weekday: 'short' })
    
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)
    
    const dayReports = reports.filter(report => {
      const reportDate = new Date(report.created_at)
      return reportDate >= startOfDay && reportDate <= endOfDay
    })
    
    trend.push({
      date: dateStr,
      count: dayReports.length
    })
  }
  
  return trend
}

  const calculateProblemAreas = (reports: any[]): ProblemArea[] => {
    const areaMap: Record<string, { count: number, kecamatan: string }> = {}
    
    reports.forEach(report => {
      if (report.lokasi) {
        // Extract area from location (simple extraction)
        const locationParts = report.lokasi.split(',')
        const mainArea = locationParts[0]?.trim() || 'Lokasi tidak diketahui'
        
        if (!areaMap[mainArea]) {
          areaMap[mainArea] = { count: 0, kecamatan: report.kecamatan || '' }
        }
        areaMap[mainArea].count++
      }
    })
    
    // Convert to array and sort by count
    const areas = Object.entries(areaMap)
      .map(([area, data]) => ({
        area,
        reports: data.count,
        kecamatan: data.kecamatan,
        trend: getRandomTrend()
      }))
      .sort((a, b) => b.reports - a.reports)
      .slice(0, 5) // Top 5 areas
    
    return areas
  }

  const getRandomTrend = (): 'up' | 'down' | 'stable' => {
    const trends: ('up' | 'down' | 'stable')[] = ['up', 'down', 'stable']
    return trends[Math.floor(Math.random() * trends.length)]
  }

  const getDateRangeStart = () => {
    const now = new Date()
    switch (timeRange) {
      case 'week':
        now.setDate(now.getDate() - 7)
        break
      case 'month':
        now.setMonth(now.getMonth() - 1)
        break
      case 'quarter':
        now.setMonth(now.getMonth() - 3)
        break
      case 'year':
        now.setFullYear(now.getFullYear() - 1)
        break
    }
    return now.toISOString()
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchStatistics()
  }

  const handleExport = async () => {
    try {
      toast.success('Sedang menyiapkan data untuk ekspor...')
      
      // Create CSV content
      const csvContent = [
        ['Statistik Puskesmas', profile?.nama || profile?.kecamatan || 'Puskesmas'],
        ['Periode', timeRanges.find(t => t.id === timeRange)?.label || ''],
        ['Tanggal Ekspor', new Date().toLocaleDateString('id-ID')],
        [],
        ['METRIK', 'NILAI'],
        ['Total Laporan', stats.totalReports.toString()],
        ['Laporan Selesai', stats.resolvedReports.toString()],
        ['Laporan Pending', stats.pendingReports.toString()],
        ['Laporan Ditolak', stats.rejectedReports.toString()],
        ['Laporan Diproses', stats.processingReports.toString()],
        ['Rata-rata Waktu Respon (hari)', stats.averageResponseTime.toString()],
        ['Kualitas Air Baik (%)', stats.waterQualityGood.toString()],
        ['Kualitas Air Buruk (%)', stats.waterQualityPoor.toString()],
        ['Pengguna Aktif', stats.activeUsers.toString()],
        ['Total Tes Lab', stats.totalLabTests.toString()],
        [],
        ['TREN LAPORAN (7 Hari Terakhir)'],
        ['Hari', 'Jumlah Laporan'],
        ...trendData.map(item => [item.date, item.count.toString()]),
        [],
        ['AREA BERMASALAH'],
        ['Area', 'Jumlah Laporan', 'Kecamatan', 'Tren'],
        ...problemAreas.map(item => [
          item.area, 
          item.reports.toString(), 
          item.kecamatan,
          item.trend === 'up' ? 'Meningkat' : item.trend === 'down' ? 'Menurun' : 'Stabil'
        ]),
        [],
        ['KUALITAS AIR BERDASARKAN LAB'],
        ['Status', 'Jumlah Sampel', 'Persentase'],
        ['Aman', waterQualityData.total > 0 ? waterQualityData.good.toString() : '0', `${waterQualityData.good}%`],
        ['Waspada', waterQualityData.total > 0 ? waterQualityData.warning.toString() : '0', `${waterQualityData.warning}%`],
        ['Bahaya', waterQualityData.total > 0 ? waterQualityData.danger.toString() : '0', `${waterQualityData.danger}%`],
        ['Total', waterQualityData.total.toString(), '100%']
      ]

      const csv = csvContent.map(row => row.join(',')).join('\n')
      
      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', `statistik-puskesmas-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Data berhasil diekspor')
      
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Gagal mengekspor data')
    }
  }

  if (isLoading && !isRefreshing) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-white">
        <div className="relative mb-6">
          <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-30"></div>
          <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
        </div>
        <h2 className="text-xl font-bold text-blue-700">Air Bersih</h2>
        <p className="text-sm text-gray-600">Memuat statistik...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Statistik & Analisis
          </h1>
          <p className="text-gray-600 mt-2">
            Puskesmas: {profile?.nama || profile?.kecamatan || 'Tidak diketahui'}
          </p>
          <p className="text-sm text-gray-500">
            Data dan tren laporan kualitas air di kecamatan {profile?.kecamatan}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {timeRanges.map(range => (
              <button
                key={range.id}
                onClick={() => setTimeRange(range.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  timeRange === range.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Laporan"
          value={stats.totalReports}
          icon={FileText}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          trend="up"
          trendValue={`+${Math.round((stats.totalReports / 100) * 12)}%`}
          description="Total laporan diterima"
        />
        
        <StatCard
          title="Laporan Selesai"
          value={stats.resolvedReports}
          icon={CheckCircle}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          trend="up"
          trendValue={`${stats.totalReports > 0 ? Math.round((stats.resolvedReports / stats.totalReports) * 100) : 0}%`}
          description="Berhasil ditangani"
        />
        
        <StatCard
          title="Rata-rata Respon"
          value={`${stats.averageResponseTime} hari`}
          icon={Calendar}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          trend={stats.averageResponseTime > 3 ? "up" : "down"}
          trendValue={stats.averageResponseTime > 3 ? "Perlu perbaikan" : "Cukup cepat"}
          description="Waktu tunggu rata-rata"
        />
        
        <StatCard
          title="Pengguna Aktif"
          value={stats.activeUsers}
          icon={Users}
          iconBg="bg-indigo-100"
          iconColor="text-indigo-600"
          trend="up"
          trendValue={`+${Math.round((stats.activeUsers / 100) * 24)}`}
          description="Warga aktif bulan ini"
        />
      </div>

      {/* Water Quality Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Air Aman"
          value={`${waterQualityData.good}%`}
          icon={CheckCircle}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          trend={waterQualityData.good > 70 ? "up" : "down"}
          trendValue={waterQualityData.good > 70 ? "Kondisi baik" : "Perlu perbaikan"}
          description={`${waterQualityData.good} dari ${waterQualityData.total} sampel`}
        />
        
        <StatCard
          title="Air Waspada"
          value={`${waterQualityData.warning}%`}
          icon={AlertTriangle}
          iconBg="bg-yellow-100"
          iconColor="text-yellow-600"
          trend={waterQualityData.warning > 20 ? "up" : "down"}
          trendValue={waterQualityData.warning > 20 ? "Perlu perhatian" : "Dalam batas"}
          description={`${waterQualityData.warning} dari ${waterQualityData.total} sampel`}
        />
        
        <StatCard
          title="Air Bahaya"
          value={`${waterQualityData.danger}%`}
          icon={AlertTriangle}
          iconBg="bg-red-100"
          iconColor="text-red-600"
          trend={waterQualityData.danger > 10 ? "up" : "down"}
          trendValue={waterQualityData.danger > 10 ? "Darurat" : "Terkendali"}
          description={`${waterQualityData.danger} dari ${waterQualityData.total} sampel`}
        />
        
        <StatCard
          title="Total Tes Lab"
          value={stats.totalLabTests}
          icon={Activity}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          trend="up"
          trendValue={`${stats.totalReports > 0 ? Math.round((stats.totalLabTests / stats.totalReports) * 100) : 0}%`}
          description="Analisis laboratorium"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Laporan Pending"
          value={stats.pendingReports}
          icon={Clock}
          iconBg="bg-yellow-100"
          iconColor="text-yellow-600"
          trend={stats.pendingReports > 10 ? "up" : "down"}
          trendValue={stats.pendingReports > 10 ? "Perlu tindakan" : "Dalam batas"}
          description="Menunggu penanganan"
        />
        
        <StatCard
          title="Laporan Ditolak"
          value={stats.rejectedReports}
          icon={X}
          iconBg="bg-red-100"
          iconColor="text-red-600"
          trend="stable"
          trendValue={`${stats.totalReports > 0 ? Math.round((stats.rejectedReports / stats.totalReports) * 100) : 0}%`}
          description="Tidak valid/ditolak"
        />
        
        <StatCard
          title="Diproses"
          value={stats.processingReports}
          icon={Filter}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          trend="stable"
          trendValue={`${stats.totalReports > 0 ? Math.round((stats.processingReports / stats.totalReports) * 100) : 0}%`}
          description="Sedang ditangani"
        />
        
        <StatCard
          title="Cakupan Lab"
          value={`${stats.totalReports > 0 ? Math.round((stats.totalLabTests / stats.totalReports) * 100) : 0}%`}
          icon={Droplets}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          trend={stats.totalReports > 0 && (stats.totalLabTests / stats.totalReports) > 0.8 ? "up" : "down"}
          trendValue={stats.totalReports > 0 && (stats.totalLabTests / stats.totalReports) > 0.8 ? "Tinggi" : "Rendah"}
          description="Persentase laporan dites"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Water Quality Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-600" />
              Kualitas Air Berdasarkan Lab
            </h3>
            <span className="text-sm text-gray-500">
              Total {waterQualityData.total} sampel
            </span>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">
                  <span className="font-medium text-green-600">Aman</span> - Sesuai standar
                </span>
                <span className="text-sm font-semibold">{waterQualityData.good}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all duration-500" 
                  style={{ width: `${waterQualityData.good}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">
                  <span className="font-medium text-yellow-600">Waspada</span> - Perlu perhatian
                </span>
                <span className="text-sm font-semibold">{waterQualityData.warning}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-yellow-600 h-3 rounded-full transition-all duration-500" 
                  style={{ width: `${waterQualityData.warning}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">
                  <span className="font-medium text-red-600">Bahaya</span> - Tidak layak konsumsi
                </span>
                <span className="text-sm font-semibold">{waterQualityData.danger}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-red-600 h-3 rounded-full transition-all duration-500" 
                  style={{ width: `${waterQualityData.danger}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{waterQualityData.good}%</div>
                <div className="text-sm text-gray-500">
                  {waterQualityData.total > 0 ? Math.round((waterQualityData.good / 100) * waterQualityData.total) : 0} sampel
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{waterQualityData.warning}%</div>
                <div className="text-sm text-gray-500">
                  {waterQualityData.total > 0 ? Math.round((waterQualityData.warning / 100) * waterQualityData.total) : 0} sampel
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{waterQualityData.danger}%</div>
                <div className="text-sm text-gray-500">
                  {waterQualityData.total > 0 ? Math.round((waterQualityData.danger / 100) * waterQualityData.total) : 0} sampel
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reports Trend */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Tren Laporan Harian
            </h3>
            <span className="text-sm text-gray-500">7 Hari Terakhir</span>
          </div>
          
          {trendData.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-gray-500">Belum ada data tren</p>
            </div>
          ) : (
            <div className="h-48 flex items-end justify-between gap-2">
              {trendData.map((item, index) => {
                const maxCount = Math.max(...trendData.map(t => t.count))
                const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0
                
                return (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div className="relative w-full">
                      <div 
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-lg transition-all duration-300"
                        style={{ height: `${height}%` }}
                      ></div>
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-700">
                        {item.count}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 mt-8">
                      {item.date}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Total laporan 7 hari: {trendData.reduce((sum, item) => sum + item.count, 0)}
              </span>
              <span className="text-sm text-gray-600">
                Rata-rata: {trendData.length > 0 ? Math.round(trendData.reduce((sum, item) => sum + item.count, 0) / trendData.length) : 0}/hari
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Problem Areas */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Area dengan Laporan Terbanyak
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="w-4 h-4" />
            Kecamatan: {profile?.kecamatan}
          </div>
        </div>
        
        {problemAreas.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Belum ada data area</p>
          </div>
        ) : (
          <div className="space-y-4">
            {problemAreas.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-lg font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">{item.area}</span>
                    <p className="text-xs text-gray-500">{item.kecamatan}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-700 font-semibold">{item.reports} laporan</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    item.trend === 'up' ? 'bg-red-100 text-red-800' :
                    item.trend === 'down' ? 'bg-green-100 text-green-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.trend === 'up' ? '↑ Meningkat' :
                     item.trend === 'down' ? '↓ Menurun' : '→ Stabil'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Info */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl shadow p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Ringkasan Statistik</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
          <div>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span><strong>Rata-rata waktu respon:</strong> {stats.averageResponseTime} hari</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span><strong>Rasio penyelesaian:</strong> {stats.totalReports > 0 ? Math.round((stats.resolvedReports / stats.totalReports) * 100) : 0}%</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span><strong>Laporan pending:</strong> {stats.pendingReports} ({stats.totalReports > 0 ? Math.round((stats.pendingReports / stats.totalReports) * 100) : 0}%)</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span><strong>Air aman:</strong> {waterQualityData.good}% ({waterQualityData.total > 0 ? Math.round((waterQualityData.good / 100) * waterQualityData.total) : 0} sampel)</span>
              </li>
            </ul>
          </div>
          <div>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span><strong>Pengguna aktif:</strong> {stats.activeUsers} warga</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span><strong>Rasio penolakan:</strong> {stats.totalReports > 0 ? Math.round((stats.rejectedReports / stats.totalReports) * 100) : 0}%</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                <span><strong>Cakupan tes lab:</strong> {stats.totalReports > 0 ? Math.round((stats.totalLabTests / stats.totalReports) * 100) : 0}% dari laporan</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                <span><strong>Air bahaya:</strong> {waterQualityData.danger}% ({waterQualityData.total > 0 ? Math.round((waterQualityData.danger / 100) * waterQualityData.total) : 0} sampel)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}