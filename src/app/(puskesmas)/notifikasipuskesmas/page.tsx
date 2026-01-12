'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  Send, 
  Filter,
  Check,
  CheckCheck,
  Users,
  FileText,
  Clock,
  X,
  Plus,
  Search,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';

type Notification = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'urgent' | 'lab_result' | 'announcement';
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
  target_type: 'all' | 'kecamatan' | 'specific' | 'status_filter';
  target_value: string;
  puskesmas_id: string;
  read_count: number;
  total_targets: number;
  kecamatan?: string;
};

type NotificationStats = {
  total: number;
  sent: number;
  pending: number;
  failed: number;
  today: number;
};

type ReportStatus = 'pending' | 'diproses' | 'selesai' | 'ditolak';

interface NotificationFormData {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'urgent' | 'lab_result' | 'announcement';
  target_type: 'all' | 'kecamatan' | 'status_filter';
  status_filter?: ReportStatus[];
  kecamatan?: string;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case 'urgent':
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    case 'lab_result':
      return <FileText className="w-5 h-5 text-green-500" />;
    case 'announcement':
      return <Bell className="w-5 h-5 text-blue-500" />;
    default:
      return <Bell className="w-5 h-5 text-gray-400" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'warning':
      return 'bg-yellow-50 border-l-yellow-500';
    case 'urgent':
      return 'bg-red-50 border-l-red-500';
    case 'lab_result':
      return 'bg-green-50 border-l-green-500';
    case 'announcement':
      return 'bg-blue-50 border-l-blue-500';
    default:
      return 'bg-gray-50 border-l-gray-500';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'sent':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'sent':
      return <CheckCheck className="w-4 h-4 text-green-600" />;
    case 'pending':
      return <Clock className="w-4 h-4 text-yellow-600" />;
    case 'failed':
      return <X className="w-4 h-4 text-red-600" />;
    default:
      return <Clock className="w-4 h-4 text-gray-600" />;
  }
};

export default function PuskesmasNotifikasiPage() {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    sent: 0,
    pending: 0,
    failed: 0,
    today: 0,
  });
  const [filter, setFilter] = useState<'all' | 'sent' | 'pending' | 'failed'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<ReportStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState<NotificationFormData>({
    title: '',
    message: '',
    type: 'info',
    target_type: 'all',
    status_filter: [],
  });

  useEffect(() => {
    if (user && profile?.role === 'puskesmas') {
      fetchNotifications();
    } else {
      setIsLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    applyFilter();
  }, [notifications, filter, searchTerm]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      console.log('🔍 Fetching notifications for puskesmas:', user.id);
      
      // Query yang lebih sederhana untuk menghindari error
      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('puskesmas_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching notifications:', error);
        
        // Cek jika error karena tabel tidak ada atau struktur berbeda
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          console.log('⚠️ Table notifications might not exist or has different structure');
          setNotifications([]);
          setStats({ total: 0, sent: 0, pending: 0, failed: 0, today: 0 });
          return;
        }
        
        throw error;
      }

      console.log('✅ Notifications data received:', notificationsData);
      
      // Format data sesuai dengan interface Notification
      const formattedNotifications: Notification[] = (notificationsData || []).map((item: any) => ({
        id: item.id || '',
        title: item.title || 'No Title',
        message: item.message || '',
        type: item.type || 'info',
        status: 'sent', // Default karena notifikasi langsung dikirim
        created_at: item.created_at || new Date().toISOString(),
        target_type: item.target_type || 'all',
        target_value: item.target_value || '',
        puskesmas_id: item.puskesmas_id || user.id,
        read_count: item.is_read ? 1 : 0,
        total_targets: 1, // Default untuk single notification
        kecamatan: item.kecamatan || ''
      }));
      
      setNotifications(formattedNotifications);
      
      // Hitung statistik
      const total = formattedNotifications.length;
      const sent = formattedNotifications.filter(n => n.status === 'sent').length;
      const pending = formattedNotifications.filter(n => n.status === 'pending').length;
      const failed = formattedNotifications.filter(n => n.status === 'failed').length;
      
      // Hitung notifikasi hari ini
      const today = new Date().toDateString();
      const todayCount = formattedNotifications.filter(n => 
        n.created_at && new Date(n.created_at).toDateString() === today
      ).length || 0;

      setStats({ total, sent, pending, failed, today: todayCount });

    } catch (error: any) {
      console.error('❌ Error in fetchNotifications:', error);
      toast.error(`Gagal memuat notifikasi: ${error.message}`);
      setNotifications([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const applyFilter = () => {
    let filtered = [...notifications];
    
    // Apply status filter
    switch (filter) {
      case 'sent':
        filtered = filtered.filter(n => n.status === 'sent');
        break;
      case 'pending':
        filtered = filtered.filter(n => n.status === 'pending');
        break;
      case 'failed':
        filtered = filtered.filter(n => n.status === 'failed');
        break;
      default:
        // 'all' - show all
        break;
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredNotifications(filtered);
  };

    const sendNotification = async () => {
  if (!user || !profile) {
    toast.error('User tidak ditemukan atau profil tidak lengkap');
    return;
  }
  
  try {
    // Validasi form
    if (!formData.title.trim()) {
      toast.error('Judul tidak boleh kosong');
      return;
    }
    
    if (!formData.message.trim()) {
      toast.error('Pesan tidak boleh kosong');
      return;
    }

    // Tampilkan loading toast
    const loadingToast = toast.loading('Mencari penerima notifikasi...');

    // Determine target users based on filter
    let targetUsers: string[] = [];

    if (formData.target_type === 'all') {
      toast.loading('Mengambil data warga...', { id: loadingToast });
      
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('kecamatan', profile.kecamatan)
        .eq('role', 'warga');
      
      if (usersError) {
        console.error('Error fetching users:', usersError);
        toast.error('Gagal mengambil data warga: ' + usersError.message, { id: loadingToast });
        return;
      }
      
      targetUsers = users?.map(u => u.id) || [];
      console.log('📋 Found users:', targetUsers.length, targetUsers);
      
      if (targetUsers.length === 0) {
        toast.error('Tidak ada warga ditemukan di kecamatan Anda', { id: loadingToast });
        return;
      }
      
    } else if (formData.target_type === 'status_filter' && selectedStatusFilter.length > 0) {
      toast.loading('Mengambil data laporan...', { id: loadingToast });
      
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select('user_id')
        .eq('kecamatan', profile.kecamatan)
        .in('status', selectedStatusFilter);
      
      if (reportsError) {
        console.error('Error fetching reports:', reportsError);
        toast.error('Gagal mengambil data laporan: ' + reportsError.message, { id: loadingToast });
        return;
      }
      
      const uniqueUserIds = [...new Set(reports?.map(r => r.user_id).filter(id => id))];
      targetUsers = uniqueUserIds || [];
      console.log('📋 Found users from reports:', targetUsers.length, targetUsers);
      
      if (targetUsers.length === 0) {
        toast.error('Tidak ada warga dengan status laporan yang dipilih', { id: loadingToast });
        return;
      }
      
    } else if (formData.target_type === 'kecamatan' && formData.kecamatan) {
      toast.loading('Mengambil data warga di kecamatan spesifik...', { id: loadingToast });
      
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('kecamatan', formData.kecamatan)
        .eq('role', 'warga');
      
      if (usersError) {
        console.error('Error fetching users:', usersError);
        toast.error('Gagal mengambil data warga: ' + usersError.message, { id: loadingToast });
        return;
      }
      
      targetUsers = users?.map(u => u.id) || [];
      console.log('📋 Found users in kecamatan:', targetUsers.length, targetUsers);
      
      if (targetUsers.length === 0) {
        toast.error(`Tidak ada warga ditemukan di kecamatan ${formData.kecamatan}`, { id: loadingToast });
        return;
      }
    }

    if (targetUsers.length === 0) {
      toast.error('Tidak ada penerima yang ditemukan', { id: loadingToast });
      return;
    }

    // Test insert satu notifikasi dulu untuk cek struktur
    toast.loading('Mengirim notifikasi...', { id: loadingToast });
    
    let successCount = 0;
    let errorCount = 0;
    let lastError = null;

    // Kirim satu per satu untuk debugging
    for (let i = 0; i < targetUsers.length; i++) {
      const userId = targetUsers[i];
      
      // Persiapan data yang minimal
      const notificationData = {
        user_id: userId,
        puskesmas_id: user.id,
        title: formData.title.trim(),
        message: formData.message.trim(),
        type: formData.type,
        is_read: false
      };

      console.log(`📤 Sending notification ${i + 1}/${targetUsers.length}:`, notificationData);
      
      const { error: insertError } = await supabase
        .from('notifications')
        .insert([notificationData]);

      if (insertError) {
        console.error(`❌ Error sending to user ${userId}:`, insertError);
        console.error('Full error details:', JSON.stringify(insertError, null, 2));
        errorCount++;
        lastError = insertError;
      } else {
        console.log(`✅ Success sending to user ${userId}`);
        successCount++;
      }
      
      // Update progress
      if (i % 5 === 0 || i === targetUsers.length - 1) {
        toast.loading(
          `Mengirim ${i + 1}/${targetUsers.length}... (${successCount} berhasil, ${errorCount} gagal)`,
          { id: loadingToast }
        );
      }
      
      // Delay kecil
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Tampilkan hasil
    if (errorCount > 0 && successCount === 0) {
      // Semua gagal
      const errorDetails = lastError ? JSON.stringify(lastError, null, 2) : 'Unknown error';
      toast.error(
        <div>
          <div className="font-medium">❌ Gagal Mengirim</div>
          <div className="text-sm">Semua notifikasi gagal dikirim</div>
          <div className="text-xs mt-1 font-mono max-w-md overflow-auto">{errorDetails}</div>
        </div>,
        {
          id: loadingToast,
          duration: 10000,
          style: {
            background: '#fee2e2',
            border: '1px solid #f87171',
            color: '#991b1b',
            padding: '12px'
          }
        }
      );
    } else if (errorCount > 0) {
      // Sebagian gagal
      toast.error(
        <div>
          <div className="font-medium">⚠️ Sebagian Berhasil</div>
          <div className="text-sm">{successCount} berhasil, {errorCount} gagal</div>
        </div>,
        {
          id: loadingToast,
          duration: 5000,
          style: {
            background: '#fef3c7',
            border: '1px solid #fbbf24',
            color: '#92400e',
            padding: '12px'
          }
        }
      );
    } else {
      // Semua berhasil
      toast.success(
        <div>
          <div className="font-medium">✅ Berhasil!</div>
          <div className="text-sm">{successCount} notifikasi terkirim</div>
        </div>,
        {
          id: loadingToast,
          duration: 3000
        }
      );
    }
    
    // Reset form jika ada yang berhasil
    if (successCount > 0) {
      setFormData({
        title: '',
        message: '',
        type: 'info',
        target_type: 'all',
        status_filter: [],
      });
      setSelectedStatusFilter([]);
      setShowCreateForm(false);
      
      setTimeout(() => {
        fetchNotifications();
      }, 1000);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    toast.error(
      <div>
        <div className="font-medium">❌ Error</div>
        <div className="text-sm">{errorMessage}</div>
      </div>,
      {
        duration: 5000
      }
    );
  }
};

  const handleStatusFilterToggle = (status: ReportStatus) => {
    setSelectedStatusFilter(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };

  const getTargetDescription = (notification: Notification) => {
    switch (notification.target_type) {
      case 'all':
        return `Semua warga di kecamatan ${notification.kecamatan || notification.target_value}`;
      case 'kecamatan':
        return `Warga di kecamatan ${notification.target_value}`;
      case 'status_filter':
        try {
          if (notification.target_value) {
            const statuses = JSON.parse(notification.target_value);
            return `Warga dengan laporan: ${statuses.join(', ')}`;
          }
        } catch {
          // Do nothing
        }
        return 'Warga dengan filter status tertentu';
      default:
        return 'Warga tertentu';
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchNotifications();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Tanggal tidak valid';
    }
  };

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
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                  Notifikasi Puskesmas
                </h1>
                <p className="text-gray-600 mt-2">
                  Puskesmas: {profile?.nama || profile?.kecamatan || 'Tidak diketahui'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Send className="w-5 h-5" />
                Buat Notifikasi
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Notifikasi</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              </div>
              <div className="bg-blue-100 p-2 rounded-lg">
                <Bell className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Terkirim</p>
                <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
              </div>
              <div className="bg-green-100 p-2 rounded-lg">
                <CheckCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="bg-yellow-100 p-2 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Gagal</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <div className="bg-red-100 p-2 rounded-lg">
                <X className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Hari Ini</p>
                <p className="text-2xl font-bold text-purple-600">{stats.today}</p>
              </div>
              <div className="bg-purple-100 p-2 rounded-lg">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Create Notification Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Buat Notifikasi Baru</h2>
                    <p className="text-gray-600 mt-1">
                      Kirim notifikasi ke warga berdasarkan filter
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Notification Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jenis Notifikasi
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(['info', 'warning', 'urgent', 'announcement', 'lab_result'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({...formData, type})}
                          className={`p-3 rounded-lg border ${
                            formData.type === type
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {getTypeIcon(type)}
                            <span className="text-sm font-medium capitalize">
                              {type === 'lab_result' ? 'Hasil Lab' : type}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Target Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Penerima
                    </label>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, target_type: 'all'})}
                          className={`p-4 rounded-lg border ${
                            formData.target_type === 'all'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Users className="w-5 h-5" />
                            <span className="text-sm font-medium">Semua Warga</span>
                            <span className="text-xs text-gray-500">Di kecamatan Anda</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFormData({...formData, target_type: 'status_filter'})}
                          className={`p-4 rounded-lg border ${
                            formData.target_type === 'status_filter'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Filter className="w-5 h-5" />
                            <span className="text-sm font-medium">Filter Status</span>
                            <span className="text-xs text-gray-500">Berdasarkan laporan</span>
                          </div>
                        </button>
                      </div>

                      {/* Status Filter Options */}
                      {formData.target_type === 'status_filter' && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Pilih Status Laporan
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {(['pending', 'diproses', 'selesai', 'ditolak'] as ReportStatus[]).map(status => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => handleStatusFilterToggle(status)}
                                className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                                  selectedStatusFilter.includes(status)
                                    ? status === 'pending'
                                      ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                                      : status === 'diproses'
                                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                                      : status === 'selesai'
                                      ? 'border-green-500 bg-green-50 text-green-700'
                                      : 'border-red-500 bg-red-50 text-red-700'
                                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {status === 'pending' && 'Menunggu'}
                                {status === 'diproses' && 'Diproses'}
                                {status === 'selesai' && 'Selesai'}
                                {status === 'ditolak' && 'Ditolak'}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-3">
                            Dipilih: {selectedStatusFilter.length} status
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title and Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Judul Notifikasi
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Masukkan judul notifikasi"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pesan Notifikasi
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tulis pesan notifikasi di sini..."
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.message.length}/500 karakter
                    </p>
                  </div>

                  {/* Preview */}
                  <div className={`p-4 rounded-lg border-l-4 ${getTypeColor(formData.type)}`}>
                    <h3 className="font-medium text-gray-800 mb-2">Pratinjau:</h3>
                    <div className="flex items-start gap-3">
                      {getTypeIcon(formData.type)}
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">
                          {formData.title || '[Judul Notifikasi]'}
                        </h4>
                        <p className="text-gray-600 text-sm mt-1 whitespace-pre-line">
                          {formData.message || '[Isi pesan notifikasi]'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-6 border-t">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Batal
                    </button>
                    <button
                      onClick={sendNotification}
                      disabled={!formData.title || !formData.message || 
                        (formData.target_type === 'status_filter' && selectedStatusFilter.length === 0)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Send className="w-5 h-5" />
                      Kirim Notifikasi
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filter:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setFilter('sent')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    filter === 'sent' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Terkirim
                </button>
                <button
                  onClick={() => setFilter('pending')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setFilter('failed')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    filter === 'failed' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Gagal
                </button>
              </div>
            </div>
            
            <div className="flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari notifikasi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">
                {filter === 'all'
                  ? 'Belum ada notifikasi'
                  : filter === 'sent'
                  ? 'Belum ada notifikasi terkirim'
                  : filter === 'pending'
                  ? 'Belum ada notifikasi pending'
                  : 'Belum ada notifikasi gagal'}
              </p>
              <p className="text-gray-400 text-sm mb-6">
                Notifikasi yang Anda kirim akan muncul di sini
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700"
              >
                <Send className="w-5 h-5" />
                Buat Notifikasi Pertama
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 hover:bg-gray-50 transition-colors border-l-4 ${getTypeColor(notification.type)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        {getTypeIcon(notification.type)}
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-800 text-lg">
                              {notification.title}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(notification.status)}`}>
                                {getStatusIcon(notification.status)}
                                {notification.status === 'sent' ? 'Terkirim' : 
                                 notification.status === 'pending' ? 'Pending' : 'Gagal'}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">
                            {getTargetDescription(notification)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(notification.created_at)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <p className="text-gray-700 whitespace-pre-line">
                          {notification.message}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Kecamatan:</span>{' '}
                          <span className="text-blue-600">{notification.kecamatan}</span>
                        </div>
                        <div className="text-gray-500">
                          ID: {notification.id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Information Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Panduan Pengiriman Notifikasi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Jenis Target:</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span><strong>Semua Warga:</strong> Kirim ke semua warga di kecamatan Anda</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-green-500" />
                      <span><strong>Filter Status:</strong> Kirim berdasarkan status laporan warga</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Tips Pengiriman:</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Gunakan jenis <strong>Darurat</strong> untuk informasi penting yang perlu tindakan cepat</li>
                    <li>• <strong>Filter Status</strong> berguna untuk mengirim update spesifik</li>
                    <li>• Periksa preview sebelum mengirim notifikasi</li>
                    <li>• Notifikasi akan muncul di dashboard warga</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}