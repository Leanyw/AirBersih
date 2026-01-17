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
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { X, User, Phone, Mail, ShieldAlert, Calendar, FileEdit, Image as ImageIcon } from 'lucide-react'

interface Report {
  id: string
  user_id: string
  user?: {
    nama: string
    phone: string
    email: string
    kecamatan?: string
    rt?: string
    rw?: string
    alamat?: string
  }
  lokasi: string
  keterangan: string
  foto_url?: string
  bau: string
  rasa: string
  warna: string
  suhu?: number
  status: 'pending' | 'diproses' | 'selesai' | 'ditolak'
  created_at: string
  updated_at?: string
  catatan?: string
  deskripsi?: string  // Tambahkan ini
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
  // Tambahkan state untuk modal (setelah state yang sudah ada)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalNote, setModalNote] = useState('')
  const [isUpdatingNote, setIsUpdatingNote] = useState(false)

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
        user: wargaMap.get(report.user_id)
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
  const handleViewReport = (report: Report) => {
    setSelectedReport(report)
    setModalNote(report.catatan || '')
    setShowModal(true)
  }
  const handleUpdateNote = async (reportId: string) => {
    if (!modalNote.trim()) {
      toast.error('Catatan tidak boleh kosong')
      return
    }

    try {
      setIsUpdatingNote(true)
      const { error } = await supabase
        .from('reports')
        .update({
          catatan: modalNote,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId)

      if (error) throw error

      const updatedReports = reports.map(report =>
        report.id === reportId
          ? { ...report, catatan: modalNote, updated_at: new Date().toISOString() }
          : report
      )

      setReports(updatedReports)

      if (selectedReport?.id === reportId) {
        setSelectedReport(prev => prev ? { ...prev, catatan: modalNote } : null)
      }

      toast.success('Catatan berhasil ditambahkan')

    } catch (error: any) {
      console.error('❌ Error mengupdate catatan:', error)
      toast.error('Gagal menyimpan catatan')
    } finally {
      setIsUpdatingNote(false)
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

  const getConditionIcon = (type: string, value: string) => {
  const isProblem = ['berbau_besi', 'berbau_busuk', 'berbau_kaporit', 'tidak_normal', 'pahit', 'asin', 'keruh', 'kecoklatan', 'kehijauan'].includes(value)

  switch (type) {
    case 'bau':
      return isProblem ? <ShieldAlert className="w-4 h-4 text-red-500" /> : <Droplets className="w-4 h-4 text-green-500" />
    case 'rasa':
      return isProblem ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />
    case 'warna':
      return isProblem ? <AlertCircle className="w-4 h-4 text-red-500" /> : <Droplets className="w-4 h-4 text-green-500" />
    default:
      return <Activity className="w-4 h-4 text-gray-500" />
  }
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
        ? { ...report, status, updated_at: new Date().toISOString() }
        : report
    ))

    // Update selected report di modal juga
    if (selectedReport?.id === reportId) {
      setSelectedReport(prev => prev ? { ...prev, status, updated_at: new Date().toISOString() } : null)
    }

    // Refresh stats
    fetchDashboardData()

  } catch (error) {
    console.error('Error updating status:', error)
    toast.error('Gagal mengupdate status')
  }
}

const getConditionColor = (type: string, value: string) => {
  const isProblem = ['berbau_besi', 'berbau_busuk', 'berbau_kaporit', 'tidak_normal', 'pahit', 'asin', 'keruh', 'kecoklatan', 'kehijauan'].includes(value)
  return isProblem ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'
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
      <div className="bg-gradient-to-r from-blue-500 to-cyan-400 rounded-2xl p-6 text-white">
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
              className="bg-[#1E5EFF] hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
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
                              {report.user?.nama || 'Warga'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {report.user?.email || 'email@example.com'} • {report.user?.phone || '-'}
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
                            onClick={() => router.push('/analisis-lab')}
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
                        onClick={() => handleViewReport(report)}
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

      {/* Modal Detail Report */}
      {showModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Detail Laporan Lengkap</h3>
                  <p className="text-gray-600 mt-1">ID: #{selectedReport.id.slice(0, 8)}</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Informasi Pelapor */}
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Informasi Pelapor
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500 block mb-1">Nama Lengkap</label>
                      <p className="font-medium text-gray-900">{selectedReport.user?.nama || 'Tidak diketahui'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 block mb-1">Email</label>
                      <p className="font-medium text-gray-900">{selectedReport.user?.email || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 block mb-1">Nomor Telepon</label>
                      <p className="font-medium text-gray-900">{selectedReport.user?.phone || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 block mb-1">Alamat Lengkap</label>
                      <p className="font-medium text-gray-900">{selectedReport.user?.alamat || '-'}</p>
                    </div>
                    {selectedReport.user?.rt && selectedReport.user?.rw && (
                      <div>
                        <label className="text-sm text-gray-500 block mb-1">RT/RW</label>
                        <p className="font-medium text-gray-900">RT {selectedReport.user.rt}/RW {selectedReport.user.rw}</p>
                      </div>
                    )}
                    {selectedReport.user?.kecamatan && (
                      <div>
                        <label className="text-sm text-gray-500 block mb-1">Kecamatan</label>
                        <p className="font-medium text-gray-900">{selectedReport.user.kecamatan}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Kondisi Air */}
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-blue-600" />
                    Kondisi Air yang Dilaporkan
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <div className={`text-center p-4 rounded-xl border ${
                      ['berbau_besi', 'berbau_busuk', 'berbau_kaporit'].includes(selectedReport.bau) 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-green-50 border-green-200'
                    }`}>
                      <div className="text-sm text-gray-500 mb-2">Bau</div>
                      <div className="text-xl font-bold mb-2">
                        {getConditionText(selectedReport.bau, 'bau')}
                      </div>
                      {getConditionIcon('bau', selectedReport.bau)}
                    </div>
                    
                    <div className={`text-center p-4 rounded-xl border ${
                      ['tidak_normal', 'pahit', 'asin'].includes(selectedReport.rasa)
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-green-50 border-green-200'
                    }`}>
                      <div className="text-sm text-gray-500 mb-2">Rasa</div>
                      <div className="text-xl font-bold mb-2">
                        {getConditionText(selectedReport.rasa, 'rasa')}
                      </div>
                      {getConditionIcon('rasa', selectedReport.rasa)}
                    </div>
                    
                    <div className={`text-center p-4 rounded-xl border ${
                      ['keruh', 'kecoklatan', 'kehijauan'].includes(selectedReport.warna)
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-green-50 border-green-200'
                    }`}>
                      <div className="text-sm text-gray-500 mb-2">Warna</div>
                      <div className="text-xl font-bold mb-2">
                        {getConditionText(selectedReport.warna, 'warna')}
                      </div>
                      {getConditionIcon('warna', selectedReport.warna)}
                    </div>
                  </div>

                  {selectedReport.deskripsi && (
                    <div>
                      <label className="text-sm text-gray-500 block mb-2">Deskripsi Tambahan</label>
                      <p className="text-gray-700 bg-white p-4 rounded-xl border border-gray-200">
                        {selectedReport.deskripsi}
                      </p>
                    </div>
                  )}
                </div>

                {/* Lokasi & Waktu */}
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Lokasi & Waktu Laporan
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm text-gray-500 block mb-2">Lokasi Kejadian</label>
                      <p className="font-medium text-gray-900 text-lg">{selectedReport.lokasi}</p>
                      {selectedReport.user?.rt && selectedReport.user?.rw && (
                        <p className="text-gray-600 mt-1">RT {selectedReport.user.rt}/RW {selectedReport.user.rw}</p>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-500 block mb-1">Dilaporkan pada</label>
                        <p className="font-medium text-gray-900">
                          {format(new Date(selectedReport.created_at), 'dd MMMM yyyy HH:mm', { locale: id })}
                        </p>
                      </div>
                      {selectedReport.updated_at && (
                        <div>
                          <label className="text-sm text-gray-500 block mb-1">Terakhir diupdate</label>
                          <p className="font-medium text-gray-900">
                            {format(new Date(selectedReport.updated_at), 'dd MMMM yyyy HH:mm', { locale: id })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status & Catatan */}
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FileEdit className="w-5 h-5 text-blue-600" />
                    Status & Catatan
                  </h4>

                  <div className="mb-6">
                    <label className="text-sm text-gray-500 block mb-3">Ubah Status Laporan</label>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => updateReportStatus(selectedReport.id, 'pending')}
                        className={`px-4 py-2.5 rounded-lg font-medium border transition-colors ${selectedReport.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        Menunggu
                      </button>
                      <button
                        onClick={() => updateReportStatus(selectedReport.id, 'diproses')}
                        className={`px-4 py-2.5 rounded-lg font-medium border transition-colors ${selectedReport.status === 'diproses'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        Diproses
                      </button>
                      <button
                        onClick={() => updateReportStatus(selectedReport.id, 'selesai')}
                        className={`px-4 py-2.5 rounded-lg font-medium border transition-colors ${selectedReport.status === 'selesai'
                          ? 'bg-green-100 text-green-800 border-green-300'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        Selesai
                      </button>
                      <button
                        onClick={() => updateReportStatus(selectedReport.id, 'ditolak')}
                        className={`px-4 py-2.5 rounded-lg font-medium border transition-colors ${selectedReport.status === 'ditolak'
                          ? 'bg-red-100 text-red-800 border-red-300'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        Ditolak
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-500 block mb-3">Tambah/Edit Catatan</label>
                    <div className="space-y-3">
                      <textarea
                        value={modalNote}
                        onChange={(e) => setModalNote(e.target.value)}
                        placeholder="Tambahkan catatan untuk laporan ini (tindakan yang diambil, hasil pemeriksaan, dll.)"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={4}
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleUpdateNote(selectedReport.id)}
                          disabled={isUpdatingNote || !modalNote.trim()}
                          className="px-5 py-2.5 bg-gradient-to-br from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isUpdatingNote ? 'Menyimpan...' : 'Simpan Catatan'}
                        </button>
                      </div>

                      {selectedReport.catatan && (
                        <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                          <div className="text-sm text-gray-500 mb-2">Catatan Saat Ini:</div>
                          <p className="text-gray-700">{selectedReport.catatan}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Foto jika ada */}
                {selectedReport.foto_url && (
                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-blue-600" />
                      Foto Pendukung
                    </h4>
                    <div className="flex justify-center">
                      <img
                        src={selectedReport.foto_url}
                        alt="Foto laporan"
                        className="max-w-full h-auto rounded-xl border border-gray-300 shadow-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzZjZmOSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiM5Y2EwYTYiPkZvdG8gdGlkYWsgdGVyc2VkaWE8L3RleHQ+PC9zdmc+';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between gap-4">
                <div className="text-sm text-gray-500">
                  <p>Laporan ID: {selectedReport.id}</p>
                  <p className="mt-1">Dibuat: {format(new Date(selectedReport.created_at), 'dd/MM/yyyy HH:mm:ss')}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 border bg-gradient-to-br from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 border-gray-300 text-white rounded-lg font-medium"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}