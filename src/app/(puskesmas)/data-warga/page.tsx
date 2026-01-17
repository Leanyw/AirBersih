'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import { 
  Users, 
  Search, 
  Filter, 
  UserPlus,
  Mail,
  Phone,
  Home,
  Calendar,
  MapPin,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  FileText,
  CheckCircle,
  Clock,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'

interface WargaData {
  id: string
  nama: string
  email: string
  phone: string
  alamat: string
  rt: string
  rw: string
  kecamatan: string
  created_at: string
  role: string
  status: 'active' | 'inactive'
  puskesmas_id?: string
  reports_count?: number
  pending_reports?: number
  completed_reports?: number
  rejected_reports?: number
  last_report_date?: string
}

interface WargaStats {
  total: number
  active: number
  inactive: number
  total_reports: number
  pending_reports: number
  completed_reports: number
  rejected_reports: number
  avg_reports_per_warga: number
}

export default function DataWargaPage() {
  const { user, profile } = useAuth()
  const [wargaList, setWargaList] = useState<WargaData[]>([])
  const [filteredWarga, setFilteredWarga] = useState<WargaData[]>([])
  const [stats, setStats] = useState<WargaStats>({
    total: 0,
    active: 0,
    inactive: 0,
    total_reports: 0,
    pending_reports: 0,
    completed_reports: 0,
    rejected_reports: 0,
    avg_reports_per_warga: 0
  })
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterKecamatan, setFilterKecamatan] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [kecamatanList, setKecamatanList] = useState<string[]>([])

  useEffect(() => {
    if (user && profile?.role === 'puskesmas') {
      fetchWargaData()
    }
  }, [user, profile])

  useEffect(() => {
    applyFilters()
  }, [wargaList, searchQuery, filterStatus, filterKecamatan])

  const fetchWargaData = async () => {
    try {
      setIsLoading(true)
      
      if (!profile?.puskesmas_id) {
        console.log('⚠️ Profile puskesmas_id tidak ditemukan, mencoba berdasarkan kecamatan...')
        
        // Fallback: ambil warga berdasarkan kecamatan puskesmas
        if (profile?.kecamatan) {
          await fetchWargaByKecamatan()
        } else {
          throw new Error('Data puskesmas tidak lengkap')
        }
        return
      }

      console.log('🔍 Fetching warga for puskesmas:', profile.puskesmas_id)

      // 1. Ambil semua warga yang terdaftar di kecamatan puskesmas ini
      const { data: wargaData, error: wargaError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'warga')
        .eq('kecamatan', profile.kecamatan)
        .order('created_at', { ascending: false })

      if (wargaError) {
        console.error('Error fetching warga:', wargaError)
        throw wargaError
      }

      console.log('👥 Raw warga data:', wargaData?.length || 0)

      // 2. Ambil data reports untuk setiap warga
      const enrichedWarga = await Promise.all(
        (wargaData || []).map(async (warga) => {
          const { data: reportsData } = await supabase
            .from('reports')
            .select('*')
            .eq('user_id', warga.id)
            .order('created_at', { ascending: false })

          const totalReports = reportsData?.length || 0
          const pendingReports = reportsData?.filter(r => r.status === 'pending').length || 0
          const completedReports = reportsData?.filter(r => r.status === 'selesai').length || 0
          const rejectedReports = reportsData?.filter(r => r.status === 'ditolak').length || 0
          const lastReport = reportsData && reportsData.length > 0 ? reportsData[0].created_at : null

          // Tentukan status warga berdasarkan aktivitas
          // Jika tidak ada laporan dalam 30 hari, dianggap tidak aktif
          const status: 'active' | 'inactive' = (() => {
            if (!lastReport) return 'inactive'
            const lastReportDate = new Date(lastReport)
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            return lastReportDate >= thirtyDaysAgo ? 'active' : 'inactive'
          })()

          return {
            id: warga.id,
            nama: warga.nama || 'Nama tidak tersedia',
            email: warga.email || '-',
            phone: warga.phone || '-',
            alamat: warga.alamat || '-',
            rt: warga.rt || '-',
            rw: warga.rw || '-',
            kecamatan: warga.kecamatan || '-',
            created_at: warga.created_at,
            role: warga.role,
            status,
            puskesmas_id: warga.puskesmas_id,
            reports_count: totalReports,
            pending_reports: pendingReports,
            completed_reports: completedReports,
            rejected_reports: rejectedReports,
            last_report_date: lastReport
          }
        })
      )

      console.log('✅ Enriched warga data:', enrichedWarga.length)

      // 3. Kumpulkan kecamatan unik
      const kecamatanSet = new Set<string>()
      enrichedWarga.forEach(warga => {
        if (warga.kecamatan && warga.kecamatan !== '-') {
          kecamatanSet.add(warga.kecamatan)
        }
      })
      setKecamatanList(Array.from(kecamatanSet))

      // 4. Hitung statistik
      calculateStats(enrichedWarga)

      setWargaList(enrichedWarga)

    } catch (error: any) {
      console.error('❌ Error fetching warga data:', error)
      toast.error(`Gagal memuat data warga: ${error.message}`)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const fetchWargaByKecamatan = async () => {
    try {
      if (!profile?.kecamatan) {
        toast.error('Kecamatan tidak ditemukan')
        return
      }

      console.log('📍 Fetching warga by kecamatan:', profile.kecamatan)

      const { data: wargaData, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'warga')
        .eq('kecamatan', profile.kecamatan)
        .order('created_at', { ascending: false })

      if (error) throw error

      const enrichedWarga = (wargaData || []).map(warga => ({
        id: warga.id,
        nama: warga.nama || 'Nama tidak tersedia',
        email: warga.email || '-',
        phone: warga.phone || '-',
        alamat: warga.alamat || '-',
        rt: warga.rt || '-',
        rw: warga.rw || '-',
        kecamatan: warga.kecamatan || '-',
        created_at: warga.created_at,
        role: warga.role,
        status: 'active' as const, // Default active
        puskesmas_id: warga.puskesmas_id,
        reports_count: 0,
        pending_reports: 0,
        completed_reports: 0,
        rejected_reports: 0,
        last_report_date: undefined
      }))

      // Ambil data reports untuk statistik
      const reportIds = enrichedWarga.map(w => w.id)
      const { data: reportsData } = await supabase
        .from('reports')
        .select('*')
        .in('user_id', reportIds)

      // Hitung statistik
      calculateStatsWithReports(enrichedWarga, reportsData || [])
      
      setWargaList(enrichedWarga)
      setKecamatanList([profile.kecamatan])

    } catch (error: any) {
      console.error('Error fetching by kecamatan:', error)
      toast.error(`Gagal memuat data warga: ${error.message}`)
    }
  }

  const calculateStats = (warga: WargaData[]) => {
    const total = warga.length
    const active = warga.filter(w => w.status === 'active').length
    const inactive = warga.filter(w => w.status === 'inactive').length
    
    const total_reports = warga.reduce((sum, w) => sum + (w.reports_count || 0), 0)
    const pending_reports = warga.reduce((sum, w) => sum + (w.pending_reports || 0), 0)
    const completed_reports = warga.reduce((sum, w) => sum + (w.completed_reports || 0), 0)
    const rejected_reports = warga.reduce((sum, w) => sum + (w.rejected_reports || 0), 0)
    
    const avg_reports_per_warga = total > 0 ? Math.round(total_reports / total * 10) / 10 : 0

    setStats({
      total,
      active,
      inactive,
      total_reports,
      pending_reports,
      completed_reports,
      rejected_reports,
      avg_reports_per_warga
    })
  }

  const calculateStatsWithReports = (warga: WargaData[], reports: any[]) => {
    const total = warga.length
    let active = 0
    let total_reports = 0
    let pending_reports = 0
    let completed_reports = 0
    let rejected_reports = 0

    // Update warga data with reports
    const updatedWarga = warga.map(w => {
      const userReports = reports.filter(r => r.user_id === w.id)
      const reports_count = userReports.length
      const pending = userReports.filter(r => r.status === 'pending').length
      const completed = userReports.filter(r => r.status === 'selesai').length
      const rejected = userReports.filter(r => r.status === 'ditolak').length
      const lastReport = userReports.length > 0 ? userReports[0].created_at : null

      // Update status
      const status: 'active' | 'inactive' = (() => {
        if (!lastReport) return 'inactive'
        const lastReportDate = new Date(lastReport)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return lastReportDate >= thirtyDaysAgo ? 'active' : 'inactive'
      })()

      if (status === 'active') active++

      total_reports += reports_count
      pending_reports += pending
      completed_reports += completed
      rejected_reports += rejected

      return {
        ...w,
        reports_count,
        pending_reports: pending,
        completed_reports: completed,
        rejected_reports: rejected,
        last_report_date: lastReport,
        status
      }
    })

    const avg_reports_per_warga = total > 0 ? Math.round(total_reports / total * 10) / 10 : 0
    const inactive = total - active

    setStats({
      total,
      active,
      inactive,
      total_reports,
      pending_reports,
      completed_reports,
      rejected_reports,
      avg_reports_per_warga
    })

    setWargaList(updatedWarga)
  }

  const applyFilters = () => {
    let filtered = [...wargaList]

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(warga =>
        warga.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        warga.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        warga.phone.includes(searchQuery) ||
        warga.alamat.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(warga => warga.status === filterStatus)
    }

    // Filter by kecamatan
    if (filterKecamatan !== 'all') {
      filtered = filtered.filter(warga => warga.kecamatan === filterKecamatan)
    }

    setFilteredWarga(filtered)
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchWargaData()
  }

  const getStatusColor = (status: string) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getReportCountColor = (count: number) => {
    if (count === 0) return 'bg-gray-100 text-gray-800'
    if (count <= 2) return 'bg-blue-100 text-blue-800'
    if (count <= 5) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const handleViewDetail = (warga: WargaData) => {
    // Navigate to warga detail page or show modal
    toast.success(`Membuka detail ${warga.nama}`)
    // router.push(`/puskesmas/data-warga/${warga.id}`)
  }

  const handleSendNotification = (warga: WargaData) => {
    toast.success(`Mengirim notifikasi ke ${warga.nama}`)
    // Implement notification sending logic
  }

  if (isLoading) {
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Data Warga
          </h1>
          <p className="text-gray-600 mt-2">
            Puskesmas: {profile?.nama || profile?.kecamatan || 'Tidak diketahui'}
          </p>
          <p className="text-sm text-gray-500">
            Kecamatan: {profile?.kecamatan || 'Tidak diketahui'}
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Warga</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-600">Aktif</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="text-2xl font-bold text-yellow-600">{stats.inactive}</div>
          <div className="text-sm text-gray-600">Tidak Aktif</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="text-2xl font-bold text-purple-600">{stats.total_reports}</div>
          <div className="text-sm text-gray-600">Total Laporan</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="text-2xl font-bold text-orange-600">{stats.pending_reports}</div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="text-2xl font-bold text-green-600">{stats.completed_reports}</div>
          <div className="text-sm text-gray-600">Selesai</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="text-2xl font-bold text-red-600">{stats.rejected_reports}</div>
          <div className="text-sm text-gray-600">Ditolak</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="text-2xl font-bold text-indigo-600">{stats.avg_reports_per_warga}</div>
          <div className="text-sm text-gray-600">Rata-rata/Warga</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama, email, telepon, atau alamat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Tidak Aktif</option>
              </select>
            </div>

            {kecamatanList.length > 0 && (
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={filterKecamatan}
                  onChange={(e) => setFilterKecamatan(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Semua Kecamatan</option>
                  {kecamatanList.map(kec => (
                    <option key={kec} value={kec}>{kec}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Warga Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Nama Warga</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Kontak</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Laporan</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredWarga.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {searchQuery || filterStatus !== 'all' || filterKecamatan !== 'all'
                        ? 'Tidak ada warga yang sesuai dengan filter'
                        : 'Belum ada data warga'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredWarga.map(warga => (
                  <tr key={warga.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{warga.nama}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        Bergabung: {new Date(warga.created_at).toLocaleDateString('id-ID')}
                      </div>
                      {warga.last_report_date && (
                        <div className="text-xs text-gray-400 mt-1">
                          Laporan terakhir: {new Date(warga.last_report_date).toLocaleDateString('id-ID')}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-3 h-3 text-gray-400" />
                          <span className="truncate max-w-[150px]" title={warga.email}>
                            {warga.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {warga.phone}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Total:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getReportCountColor(warga.reports_count || 0)}`}>
                            {warga.reports_count || 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-yellow-500" />
                            {warga.pending_reports || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            {warga.completed_reports || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <X className="w-3 h-3 text-red-500" />
                            {warga.rejected_reports || 0}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(warga.status)}`}>
                          {warga.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                        </span>
                        <div className="text-xs text-gray-500">
                          {warga.reports_count || 0} laporan
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Information Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Informasi Data Warga</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Status Warga:</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span><strong>Aktif:</strong> Memiliki laporan dalam 30 hari terakhir</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span><strong>Tidak Aktif:</strong> Tidak ada laporan dalam 30 hari terakhir</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Warna Laporan:</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">0</span>
                    <span>Belum pernah melapor</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">1-2</span>
                    <span>Laporan sedikit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">3-5</span>
                    <span>Laporan sedang</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">6+</span>
                    <span>Laporan banyak</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}