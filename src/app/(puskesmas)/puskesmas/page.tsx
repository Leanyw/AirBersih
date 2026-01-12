'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import { 
  Bell,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Users,
  FileText,
  Activity,
  AlertCircle,
  Download,
  Plus,
  Search,
  Shield,
  Thermometer,
  RefreshCw,
  Droplets,
  Home,
  Eye
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Report {
  id: string
  user_id: string
  users?: {
    nama: string
    phone: string
    email: string
  }
  lokasi: string
  keterangan: string
  foto_url?: string
  bau: string
  rasa: string
  warna: string
  status: 'pending' | 'diproses' | 'selesai' | 'ditolak'
  created_at: string
}

interface DashboardStats {
  totalLaporan: number
  pendingLaporan: number
  diprosesLaporan: number
  selesaiLaporan: number
  ditolakLaporan: number
  notifikasiBaru: number
  wargaAktif: number
  sumberAirAktif: number
}

export default function PuskesmasDashboard() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalLaporan: 0,
    pendingLaporan: 0,
    diprosesLaporan: 0,
    selesaiLaporan: 0,
    ditolakLaporan: 0,
    notifikasiBaru: 0,
    wargaAktif: 0,
    sumberAirAktif: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (user && profile?.role === 'puskesmas') {
      fetchDashboardData()
    }
  }, [user, profile])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      setIsRefreshing(true)
      
      console.log('🔍 Fetching dashboard data for puskesmas...')
      
      // 1. Ambil data puskesmas (kecamatan)
      const kecamatan = profile?.kecamatan
      const puskesmasId = user?.id
      
      if (!kecamatan || !puskesmasId) {
        toast.error('Data puskesmas tidak lengkap')
        return
      }
      
      console.log('📍 Puskesmas data:', { kecamatan, puskesmasId })
      
      // 2. Hitung statistik langsung dari database
      await fetchStats(kecamatan, puskesmasId)
      
      // 3. Ambil laporan terbaru
      await fetchRecentReports(kecamatan, puskesmasId)
      
      console.log('✅ Dashboard data fetched successfully')
      
    } catch (error: any) {
      console.error('❌ Error fetching dashboard data:', error)
      toast.error('Gagal memuat data dashboard')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const fetchStats = async (kecamatan: string, puskesmasId: string) => {
    try {
      console.log('📊 Fetching stats...')
      
      // 1. Hitung total laporan berdasarkan kecamatan warga
      const { data: wargaDiWilayah } = await supabase
        .from('users')
        .select('id')
        .eq('kecamatan', kecamatan)
        .eq('role', 'warga')
      
      const wargaIds = wargaDiWilayah?.map(w => w.id) || []
      
      let totalLaporan = 0
      let pendingLaporan = 0
      let diprosesLaporan = 0
      let selesaiLaporan = 0
      let ditolakLaporan = 0
      
      if (wargaIds.length > 0) {
        const { data: reportsData } = await supabase
          .from('reports')
          .select('id, status')
          .in('user_id', wargaIds)
        
        totalLaporan = reportsData?.length || 0
        pendingLaporan = reportsData?.filter(r => r.status === 'pending').length || 0
        diprosesLaporan = reportsData?.filter(r => r.status === 'diproses').length || 0
        selesaiLaporan = reportsData?.filter(r => r.status === 'selesai').length || 0
        ditolakLaporan = reportsData?.filter(r => r.status === 'ditolak').length || 0
      }
      
      // 2. Hitung notifikasi baru untuk puskesmas
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('id, is_read')
        .eq('puskesmas_id', puskesmasId)
      
      const notifikasiBaru = notificationsData?.filter(n => !n.is_read).length || 0
      
      // 3. Hitung warga aktif (ada laporan dalam 30 hari terakhir)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { data: activeUsersData } = await supabase
        .from('reports')
        .select('user_id')
        .in('user_id', wargaIds)
        .gte('created_at', thirtyDaysAgo.toISOString())
      
      const uniqueActiveUsers = new Set(activeUsersData?.map(r => r.user_id) || [])
      const wargaAktif = uniqueActiveUsers.size
      
      // 4. Hitung sumber air aktif di kecamatan
      const { data: waterSourcesData } = await supabase
        .from('water_sources')
        .select('id')
        .eq('kecamatan', kecamatan)
        .eq('status', 'aman')
      
      const sumberAirAktif = waterSourcesData?.length || 0
      
      console.log('📊 Stats calculated:', {
        totalLaporan,
        pendingLaporan,
        diprosesLaporan,
        selesaiLaporan,
        notifikasiBaru,
        wargaAktif,
        sumberAirAktif
      })
      
      setStats({
        totalLaporan,
        pendingLaporan,
        diprosesLaporan,
        selesaiLaporan,
        ditolakLaporan,
        notifikasiBaru,
        wargaAktif,
        sumberAirAktif
      })
      
    } catch (error) {
      console.error('❌ Error fetching stats:', error)
      toast.error('Gagal memuat statistik')
    }
  }

  const fetchRecentReports = async (kecamatan: string, puskesmasId: string) => {
    try {
      console.log('📄 Fetching recent reports...')
      
      // 1. Dapatkan warga di wilayah puskesmas
      const { data: wargaData } = await supabase
        .from('users')
        .select('id, nama, phone, email')
        .eq('kecamatan', kecamatan)
        .eq('role', 'warga')
      
      const wargaIds = wargaData?.map(w => w.id) || []
      const wargaMap = new Map(wargaData?.map(w => [w.id, w]) || [])
      
      if (wargaIds.length === 0) {
        setReports([])
        return
      }
      
      // 2. Ambil laporan terbaru dari warga tersebut
      const { data: reportsData } = await supabase
        .from('reports')
        .select('*')
        .in('user_id', wargaIds)
        .order('created_at', { ascending: false })
        .limit(10)
      
      // 3. Gabungkan data warga dengan laporan
      const reportsWithUsers: Report[] = (reportsData || []).map(report => ({
        ...report,
        users: wargaMap.get(report.user_id)
      }))
      
      console.log(`✅ Found ${reportsWithUsers.length} recent reports`)
      setReports(reportsWithUsers)
      
    } catch (error) {
      console.error('❌ Error fetching reports:', error)
      toast.error('Gagal memuat laporan terbaru')
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchDashboardData()
  }

  const updateReportStatus = async (reportId: string, status: 'pending' | 'diproses' | 'selesai' | 'ditolak') => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId)

      if (error) throw error

      toast.success('Status berhasil diperbarui')
      
      // Update local state
      setReports(reports.map(report => 
        report.id === reportId 
          ? { ...report, status } 
          : report
      ))
      
      // Refresh stats
      fetchDashboardData()
      
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Gagal mengupdate status')
    }
  }

  // Helper functions
  const extractRT = (location: string) => {
    const match = location.match(/RT\s*(\d+)/i)
    return match ? match[1] : '-'
  }

  const extractRW = (location: string) => {
    const match = location.match(/RW\s*(\d+)/i)
    return match ? match[1] : '-'
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Menunggu'
      case 'diproses': return 'Diproses'
      case 'selesai': return 'Selesai'
      case 'ditolak': return 'Ditolak'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'diproses': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'selesai': return 'bg-green-100 text-green-800 border-green-200'
      case 'ditolak': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />
      case 'diproses': return <Activity className="w-4 h-4" />
      case 'selesai': return <CheckCircle className="w-4 h-4" />
      case 'ditolak': return <AlertTriangle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getConditionText = (condition: string, type: 'bau' | 'rasa' | 'warna') => {
    const texts: Record<string, Record<string, string>> = {
      bau: {
        'tidak_berbau': 'Tidak Berbau',
        'berbau_besi': 'Berbau Besi',
        'berbau_busuk': 'Berbau Busuk',
        'berbau_kaporit': 'Berbau Kaporit'
      },
      rasa: {
        'normal': 'Normal',
        'tidak_normal': 'Tidak Normal',
        'pahit': 'Pahit',
        'asin': 'Asin'
      },
      warna: {
        'jernih': 'Jernih',
        'keruh': 'Keruh',
        'kecoklatan': 'Kecoklatan',
        'kehijauan': 'Kehijauan'
      }
    }
    
    return texts[type]?.[condition] || condition
  }

  // Loading state
  if (isLoading && !isRefreshing) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-white">
      
      <div className="relative mb-6">
        <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-30"></div>
        <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
      </div>

      <h2 className="text-xl font-bold text-blue-700">
        Air Bersih
      </h2>
      <p className="text-sm text-gray-600">
        Memuat data laporan...
      </p>
    </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Dashboard Puskesmas</h1>
            <p className="mt-2 opacity-90">
              {profile?.nama || 'Puskesmas'} • {profile?.kecamatan || 'Wilayah'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => router.push('/analisis-lab')}
              className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              Analisis Lab
            </button>
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Memperbarui...' : 'Refresh'}
            </button>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mt-6">
          <div className="bg-white/20 p-4 rounded-lg backdrop-blur-sm">
            <div className="text-sm opacity-90">Total Laporan</div>
            <div className="text-xl font-bold">{stats.totalLaporan}</div>
          </div>
          <div className="bg-white/20 p-4 rounded-lg backdrop-blur-sm">
            <div className="text-sm opacity-90">Menunggu</div>
            <div className="text-xl font-bold">{stats.pendingLaporan}</div>
          </div>
          <div className="bg-white/20 p-4 rounded-lg backdrop-blur-sm">
            <div className="text-sm opacity-90">Diproses</div>
            <div className="text-xl font-bold">{stats.diprosesLaporan}</div>
          </div>
          <div className="bg-white/20 p-4 rounded-lg backdrop-blur-sm">
            <div className="text-sm opacity-90">Selesai</div>
            <div className="text-xl font-bold">{stats.selesaiLaporan}</div>
          </div>
          <div className="bg-white/20 p-4 rounded-lg backdrop-blur-sm">
            <div className="text-sm opacity-90">Notifikasi</div>
            <div className="text-xl font-bold">{stats.notifikasiBaru}</div>
          </div>
          <div className="bg-white/20 p-4 rounded-lg backdrop-blur-sm">
            <div className="text-sm opacity-90">Warga Aktif</div>
            <div className="text-xl font-bold">{stats.wargaAktif}</div>
          </div>
          <div className="bg-white/20 p-4 rounded-lg backdrop-blur-sm">
            <div className="text-sm opacity-90">Sumber Air</div>
            <div className="text-xl font-bold">{stats.sumberAirAktif}</div>
          </div>
          <div className="bg-white/20 p-4 rounded-lg backdrop-blur-sm">
            <div className="text-sm opacity-90">Ditolak</div>
            <div className="text-xl font-bold">{stats.ditolakLaporan}</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Reports */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                Laporan Terbaru
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Cari laporan..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {isRefreshing ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-gray-600 mt-2">Memperbarui data...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Belum ada laporan dari warga</p>
                <p className="text-sm text-gray-400 mt-2">
                  Laporan akan muncul saat warga membuat laporan di wilayah {profile?.kecamatan || 'Anda'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">
                              {report.users?.nama || 'Warga'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {report.users?.email || 'email@example.com'} • {report.users?.phone || '-'}
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-gray-700 mb-3 line-clamp-2">{report.keterangan}</p>
                        
                        <div className="flex flex-wrap gap-3 mb-3">
                          <div className="flex items-center gap-1">
                            <Shield className="w-3 h-3 text-gray-400" />
                            <span className="text-sm">
                              Bau: <span className="font-medium">{getConditionText(report.bau, 'bau')}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Thermometer className="w-3 h-3 text-gray-400" />
                            <span className="text-sm">
                              Rasa: <span className="font-medium">{getConditionText(report.rasa, 'rasa')}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Droplets className="w-3 h-3 text-gray-400" />
                            <span className="text-sm">
                              Warna: <span className="font-medium">{getConditionText(report.warna, 'warna')}</span>
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {report.lokasi}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(report.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(report.status)}
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                            {getStatusText(report.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex gap-2">
                        {report.status === 'pending' && (
                          <button
                            onClick={() => updateReportStatus(report.id, 'diproses')}
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Proses Laporan
                          </button>
                        )}
                        {report.status === 'diproses' && (
                          <button
                            onClick={() => updateReportStatus(report.id, 'selesai')}
                            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Tandai Selesai
                          </button>
                        )}
                        <button
                          onClick={() => updateReportStatus(report.id, 'ditolak')}
                          className="px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition-colors"
                        >
                          Tolak
                        </button>
                      </div>
                      <button
                        onClick={() => router.push(`/laporanwarga/${report.id}`)}
                        className="text-blue-600 text-sm font-medium hover:text-blue-800 flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Detail
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button 
                onClick={() => router.push('/laporanwarga')}
                className="w-full py-3 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Lihat Semua Laporan →
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              Aksi Cepat
            </h3>
            <div className="space-y-3">
              <button 
                onClick={() => router.push('/notifikasipuskesmas')}
                className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group"
              >
                <div className="flex items-center">
                  <Bell className="w-5 h-5 text-blue-600 mr-3" />
                  <div>
                    <span className="font-medium block">Kirim Notifikasi</span>
                    <span className="text-sm text-gray-600">Beritahu warga</span>
                  </div>
                </div>
                <span className="text-blue-600 group-hover:translate-x-1 transition-transform">→</span>
              </button>
              
              <button 
                onClick={() => router.push('/warga')}
                className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors group"
              >
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-green-600 mr-3" />
                  <div>
                    <span className="font-medium block">Data Warga</span>
                    <span className="text-sm text-gray-600">Kelola data warga</span>
                  </div>
                </div>
                <span className="text-green-600 group-hover:translate-x-1 transition-transform">→</span>
              </button>
              
              <button 
                onClick={() => router.push('/analisis-lab')}
                className="w-full flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors group"
              >
                <div className="flex items-center">
                  <Activity className="w-5 h-5 text-purple-600 mr-3" />
                  <div>
                    <span className="font-medium block">Analisis Lab</span>
                    <span className="text-sm text-gray-600">Input hasil lab</span>
                  </div>
                </div>
                <span className="text-purple-600 group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          </div>

          {/* Status Summary */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Status Laporan</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-yellow-600" />
                  </div>
                  <span>Menunggu</span>
                </div>
                <span className="font-bold text-yellow-700">{stats.pendingLaporan}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-4 h-4 text-blue-600" />
                  </div>
                  <span>Diproses</span>
                </div>
                <span className="font-bold text-blue-700">{stats.diprosesLaporan}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <span>Selesai</span>
                </div>
                <span className="font-bold text-green-700">{stats.selesaiLaporan}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <span>Ditolak</span>
                </div>
                <span className="font-bold text-red-700">{stats.ditolakLaporan}</span>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl shadow-lg p-6 border border-blue-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Info Wilayah</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-700">
                  Kecamatan: <span className="font-semibold">{profile?.kecamatan || 'Belum ditentukan'}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-700">
                  Warga Aktif: <span className="font-semibold">{stats.wargaAktif} orang</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-gray-700">
                  Puskesmas: <span className="font-semibold">{profile?.nama || 'Puskesmas'}</span>
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-sm text-gray-600">
                Data diperbarui: {new Date().toLocaleTimeString('id-ID', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}