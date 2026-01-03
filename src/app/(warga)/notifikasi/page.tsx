'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Check, 
  CheckCheck,
  Filter,
  Trash2,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

type Notification = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'urgent' | 'update';
  is_read: boolean;
  created_at: string;
  puskesmas?: {
    nama: string;
  };
  puskesmas_id?: string;
};

type NotificationStats = {
  total: number;
  unread: number;
  urgent: number;
  warning: number;
  today: number;
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case 'urgent':
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    case 'update':
      return <Bell className="w-5 h-5 text-blue-500" />;
    default:
      return <Info className="w-5 h-5 text-gray-400" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'warning':
      return 'border-l-yellow-500 bg-yellow-50';
    case 'urgent':
      return 'border-l-red-500 bg-red-50';
    case 'update':
      return 'border-l-blue-500 bg-blue-50';
    default:
      return 'border-l-gray-500 bg-gray-50';
  }
};

const getTypeBadge = (type: string) => {
  switch (type) {
    case 'warning':
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Peringatan</span>;
    case 'urgent':
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Darurat</span>;
    case 'update':
      return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Update</span>;
    default:
      return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Info</span>;
  }
};

export default function NotifikasiPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    urgent: 0,
    warning: 0,
    today: 0,
  });
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent' | 'warning'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [puskesmasMap, setPuskesmasMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    applyFilter();
  }, [notifications, filter]);

  const fetchPuskesmasNames = async (puskesmasIds: string[]) => {
    if (puskesmasIds.length === 0) return {};
    
    const { data, error } = await supabase
      .from('puskesmas')
      .select('id, nama')
      .in('id', puskesmasIds);
    
    if (error) {
      console.error('Error fetching puskesmas:', error);
      return {};
    }
    
    const map: Record<string, string> = {};
    data?.forEach(p => {
      map[p.id] = p.nama;
    });
    
    return map;
  };

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Ambil notifikasi user
      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Raw notifications data:', notificationsData);
      
      // Kumpulkan semua puskesmas_id yang unik
      const puskesmasIds = [...new Set(
        notificationsData
          ?.map(n => n.puskesmas_id)
          .filter((id): id is string => !!id)
      )];
      
      // Fetch nama puskesmas
      const puskesmasNames = await fetchPuskesmasNames(puskesmasIds);
      setPuskesmasMap(puskesmasNames);
      
      // Gabungkan data
      const enrichedNotifications = (notificationsData || []).map(notification => ({
        ...notification,
        puskesmas: notification.puskesmas_id ? { 
          nama: puskesmasNames[notification.puskesmas_id] || 'Puskesmas' 
        } : undefined
      }));
      
      setNotifications(enrichedNotifications);
      
      // Hitung statistik
      const total = enrichedNotifications.length;
      const unread = enrichedNotifications.filter(n => !n.is_read).length;
      const urgent = enrichedNotifications.filter(n => n.type === 'urgent').length;
      const warning = enrichedNotifications.filter(n => n.type === 'warning').length;
      
      // Hitung notifikasi hari ini
      const today = new Date().toDateString();
      const todayCount = enrichedNotifications.filter(n => 
        n.created_at && new Date(n.created_at).toDateString() === today
      ).length;

      setStats({ total, unread, urgent, warning, today: todayCount });

    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      toast.error(`Gagal memuat notifikasi: ${error.message}`);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const applyFilter = () => {
    let filtered = [...notifications];
    
    switch (filter) {
      case 'unread':
        filtered = filtered.filter(n => !n.is_read);
        break;
      case 'urgent':
        filtered = filtered.filter(n => n.type === 'urgent');
        break;
      case 'warning':
        filtered = filtered.filter(n => n.type === 'warning');
        break;
      default:
        // 'all' - show all
        break;
    }
    
    setFilteredNotifications(filtered);
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, is_read: true } : notif
        )
      );

      toast.success('Notifikasi ditandai telah dibaca');
    } catch (error: any) {
      console.error('Error marking as read:', error);
      toast.error(`Gagal memperbarui status: ${error.message}`);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      // Update local state
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true }))
      );

      toast.success('Semua notifikasi ditandai telah dibaca');
    } catch (error: any) {
      console.error('Error marking all as read:', error);
      toast.error(`Gagal memperbarui status: ${error.message}`);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setNotifications(prev => prev.filter(notif => notif.id !== id));

      toast.success('Notifikasi dihapus');
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      toast.error(`Gagal menghapus notifikasi: ${error.message}`);
    }
  };

  const deleteAllRead = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('is_read', true);

      if (error) throw error;

      // Update local state
      setNotifications(prev => prev.filter(notif => !notif.is_read));

      toast.success('Notifikasi yang telah dibaca dihapus');
    } catch (error: any) {
      console.error('Error deleting read notifications:', error);
      toast.error(`Gagal menghapus notifikasi: ${error.message}`);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchNotifications();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Notifikasi</h1>
              <p className="text-gray-600 mt-2">Memuat notifikasi...</p>
            </div>
          </div>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
              <p className="mt-4 text-gray-600">Memuat notifikasi...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Kembali
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Notifikasi</h1>
                <p className="text-gray-600 mt-2">
                  {unreadCount > 0
                    ? `Anda memiliki ${unreadCount} notifikasi belum dibaca`
                    : 'Semua notifikasi telah dibaca'}
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total</p>
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
                <p className="text-gray-500 text-sm">Belum Dibaca</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.unread}</p>
              </div>
              <div className="bg-yellow-100 p-2 rounded-lg">
                <Bell className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Darurat</p>
                <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
              </div>
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Peringatan</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.warning}</p>
              </div>
              <div className="bg-yellow-100 p-2 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Hari Ini</p>
                <p className="text-2xl font-bold text-green-600">{stats.today}</p>
              </div>
              <div className="bg-green-100 p-2 rounded-lg">
                <Bell className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filter:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'unread' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Belum Dibaca
                </button>
                <button
                  onClick={() => setFilter('urgent')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'urgent' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Darurat
                </button>
                <button
                  onClick={() => setFilter('warning')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'warning' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Peringatan
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <>
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Tandai Semua Dibaca
                  </button>
                  <span className="text-gray-300">|</span>
                </>
              )}
              <button
                onClick={deleteAllRead}
                className="flex items-center gap-2 text-red-600 hover:text-red-800 text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Hapus yang Dibaca
              </button>
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
                  ? 'Tidak ada notifikasi'
                  : filter === 'unread'
                    ? 'Semua notifikasi telah dibaca'
                    : filter === 'urgent'
                      ? 'Tidak ada notifikasi darurat'
                      : 'Tidak ada notifikasi peringatan'}
              </p>
              <p className="text-gray-400 text-sm">
                Notifikasi dari puskesmas akan muncul di sini
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 hover:bg-gray-50 transition-colors border-l-4 ${getTypeColor(notification.type)} ${!notification.is_read ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {getTypeIcon(notification.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-semibold text-gray-800 text-lg">
                              {notification.title}
                            </h3>
                            {getTypeBadge(notification.type)}
                            {notification.puskesmas?.nama && (
                              <span className="text-sm text-gray-500">
                                dari {notification.puskesmas.nama}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {notification.created_at ? new Date(notification.created_at).toLocaleDateString('id-ID', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Tanggal tidak tersedia'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="prose max-w-none">
                        <p className="text-gray-700 whitespace-pre-line">
                          {notification.message}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                        {!notification.is_read ? (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            <Check className="w-4 h-4" />
                            Tandai Telah Dibaca
                          </button>
                        ) : (
                          <span className="flex items-center gap-2 text-green-600 text-sm font-medium">
                            <CheckCheck className="w-4 h-4" />
                            Telah Dibaca
                          </span>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="flex items-center gap-2 text-red-600 hover:text-red-800 text-sm font-medium ml-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Informasi Notifikasi</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  <span><strong>Darurat (Merah):</strong> Situasi darurat yang memerlukan tindakan segera</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                  <span><strong>Peringatan (Kuning):</strong> Informasi penting yang perlu diperhatikan</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  <span><strong>Update (Biru):</strong> Pembaruan status laporan dan informasi terkini</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                  <span><strong>Info (Abu):</strong> Informasi umum dan pengumuman rutin</span>
                </li>
              </ul>
              <p className="text-sm text-gray-600 mt-4">
                Notifikasi akan dikirim oleh puskesmas setempat berdasarkan kondisi air di wilayah Anda.
                Pastikan untuk selalu membaca notifikasi darurat dan mengambil tindakan yang diperlukan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}