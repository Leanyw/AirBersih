'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
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
  Search,
  RefreshCw,
  MessageSquare,
  Eye,
  User,
  MapPin,
  Droplets,
  Calendar,
  BarChart3,
  Shield,
  Thermometer,
  Activity,
  Mail,
  Phone,
  Home,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// Tipe data untuk notifikasi
interface Notification {
  id: string;
  user_id: string;
  puskesmas_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'urgent' | 'report_new' | 'report_processed' | 'report_completed' | 'announcement' | 'lab_result';
  is_read: boolean;
  created_at: string;
  report_id?: string;
  metadata?: any;
  // Data terkait (join)
  users?: {
    nama: string;
    email: string;
    phone?: string;
  };
  reports?: {
    id: string;
    lokasi: string;
    status: string;
    bau: string;
    rasa: string;
    warna: string;
    deskripsi?: string;
  };
}

// Statistik
interface NotificationStats {
  total: number;
  unread: number;
  today: number;
  report_notifications: number;
  urgent: number;
  read: number;
}

export default function PuskesmasNotifikasiPage() {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    today: 0,
    report_notifications: 0,
    urgent: 0,
    read: 0,
  });

  const [filterType, setFilterType] = useState<'all' | 'unread' | 'report' | 'urgent'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch notifikasi dengan error handling yang lebih baik
  const fetchNotifications = useCallback(async () => {
    if (!user || !profile) return;

    try {
      setIsRefreshing(true);
      console.log('🔍 Memulai fetch notifikasi untuk puskesmas:', user.id);

      // Coba query yang lebih sederhana dulu
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('puskesmas_id', user.id)
        .order('created_at', { ascending: false });

      const { data: notificationsData, error } = await query;

      if (error) {
        console.error('❌ Error detail:', error);

        // Cek jika tabel tidak ada
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log('📋 Tabel notifications tidak ditemukan, membuat contoh data...');
          const mockData = await createMockNotifications();
          processNotifications(mockData);
          return;
        }

        throw error;
      }

      console.log(`✅ Ditemukan ${notificationsData?.length || 0} notifikasi`);

      let allNotifications: any[] = notificationsData || [];

      // --- TAMBAHAN: Fetch Reports sebagai Notifikasi ---
      if (profile?.kecamatan) {
        try {
          console.log('🔄 Mengambil laporan warga untuk dijadikan notifikasi...');

          // 1. Get users in kecamatan
          const { data: usersData } = await supabase
            .from('users')
            .select('id, nama, email, phone')
            .eq('kecamatan', profile.kecamatan)
            .eq('role', 'warga');

          // Buat map user untuk lookup cepat
          const userMap = new Map();
          if (usersData) {
            usersData.forEach(u => userMap.set(u.id, u));
          }

          const userIds = usersData?.map(u => u.id) || [];

          if (userIds.length > 0) {
            // 2. Get pending/recent reports
            const { data: reportsData } = await supabase
              .from('reports')
              .select('*')
              .in('user_id', userIds)
              .eq('status', 'pending')
              .order('created_at', { ascending: false })
              .limit(20);

            if (reportsData && reportsData.length > 0) {
              console.log(`📄 Ditemukan ${reportsData.length} laporan pending`);

              // 3. Convert reports to notifications
              const reportNotifications = reportsData.map(report => {
                // Skip jika notifikasi real untuk report ini sudah ada
                if (allNotifications.some(n => n.report_id === report.id)) {
                  return null;
                }

                const reportUser = userMap.get(report.user_id);
                // Virtual ID agar tidak konflik
                const virtualId = `virtual-report-${report.id}`;

                return {
                  id: virtualId,
                  user_id: report.user_id,
                  puskesmas_id: user.id,
                  title: '📋 Laporan Masuk Baru',
                  message: `Laporan baru dari ${reportUser?.nama || 'Warga'} di ${report.lokasi}.`,
                  type: 'report_new',
                  is_read: false,
                  created_at: report.created_at,
                  report_id: report.id,
                  metadata: {
                    is_virtual: true,
                    report_id: report.id,
                    lokasi: report.lokasi,
                    kondisi: {
                      bau: report.bau,
                      rasa: report.rasa,
                      warna: report.warna
                    }
                  },
                  users: reportUser,
                  reports: report
                };
              }).filter(Boolean);

              // Merge notifications
              allNotifications = [...reportNotifications, ...allNotifications];

              // Sort by date descending
              allNotifications.sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
            }
          }
        } catch (reportFetchError) {
          console.error('⚠️ Gagal mengambil laporan untuk notifikasi:', reportFetchError);
        }
      }

      // Process notifications
      // Pisahkan yang dari DB asli dan yang virtual untuk enrich
      const dbNotifs = allNotifications.filter(n => !n.id.toString().startsWith('virtual-'));
      const virtualNotifs = allNotifications.filter(n => n.id.toString().startsWith('virtual-'));

      if (dbNotifs.length > 0) {
        await enrichNotifications(dbNotifs, virtualNotifs);
      } else {
        processNotifications(virtualNotifs);
      }

    } catch (error: any) {
      console.error('❌ Error dalam fetchNotifications:', error);
      toast.error(`Gagal memuat notifikasi: ${error.message || 'Unknown error'}`);

      // Fallback ke mock data
      const mockData = await createMockNotifications();
      processNotifications(mockData);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user, profile]);

  // Enrich notifikasi dengan data user dan reports
  const enrichNotifications = async (notificationsData: any[], extraNotifications: any[] = []) => {
    try {
      const enrichedNotifications: Notification[] = [];

      for (const notif of notificationsData) {
        let userData = null;
        let reportData = null;

        // Ambil data user jika ada user_id
        if (notif.user_id) {
          const { data: user } = await supabase
            .from('users')
            .select('nama, email, phone')
            .eq('id', notif.user_id)
            .single();

          userData = user;
        }

        // Ambil data report jika ada report_id
        if (notif.report_id) {
          const { data: report } = await supabase
            .from('reports')
            .select('id, lokasi, status, bau, rasa, warna, deskripsi')
            .eq('id', notif.report_id)
            .single();

          reportData = report;
        }

        enrichedNotifications.push({
          ...notif,
          users: userData,
          reports: reportData
        });
      }

      // Merge with extra notifications
      const allNotifications = [...extraNotifications, ...enrichedNotifications];

      // Sort final result
      allNotifications.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      processNotifications(allNotifications);

    } catch (error) {
      console.error('Error enriching notifications:', error);
      processNotifications([...extraNotifications, ...notificationsData]);
    }
  };

  // Process dan hitung statistik
  const processNotifications = (data: Notification[]) => {
    setNotifications(data);

    // Hitung statistik
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todayCount = data.filter(n =>
      new Date(n.created_at) >= todayStart
    ).length;

    const unreadCount = data.filter(n => !n.is_read).length;
    const reportCount = data.filter(n => n.type?.includes('report')).length;
    const urgentCount = data.filter(n => n.type === 'urgent' || n.type === 'report_new').length;

    setStats({
      total: data.length,
      unread: unreadCount,
      today: todayCount,
      report_notifications: reportCount,
      urgent: urgentCount,
      read: data.length - unreadCount
    });

    console.log('📊 Statistik diperbarui:', {
      total: data.length,
      unread: unreadCount,
      today: todayCount
    });
  };

  // Buat mock data untuk testing
  const createMockNotifications = async (): Promise<Notification[]> => {
    console.log('🔄 Membuat mock notifications untuk testing...');

    const mockNotifications: Notification[] = [
      {
        id: 'notif-001',
        user_id: user?.id || 'user-001',
        puskesmas_id: user?.id || 'puskesmas-001',
        title: '📋 Laporan Baru dari Warga',
        message: `Ada laporan baru mengenai kondisi air dari Budi Santoso.
                 Lokasi: Jl. Melati No. 10, RT 03/RW 05
                 Status: Menunggu
                 
                 Kondisi Air:
                 • Bau: Berbau Besi
                 • Rasa: Normal
                 • Warna: Jernih
                 
                 "Air di rumah saya berbau seperti besi sejak kemarin."`,
        type: 'report_new',
        is_read: false,
        created_at: new Date().toISOString(),
        report_id: 'report-001',
        metadata: {
          report_id: 'report-001',
          user_name: 'Budi Santoso',
          user_phone: '081234567890',
          lokasi: 'Jl. Melati No. 10, RT 03/RW 05',
          kondisi: {
            bau: 'berbau_besi',
            rasa: 'normal',
            warna: 'jernih'
          }
        },
        users: {
          nama: 'Budi Santoso',
          email: 'budi@example.com',
          phone: '081234567890'
        },
        reports: {
          id: 'report-001',
          lokasi: 'Jl. Melati No. 10, RT 03/RW 05',
          status: 'pending',
          bau: 'berbau_besi',
          rasa: 'normal',
          warna: 'jernih',
          deskripsi: 'Air di rumah saya berbau seperti besi sejak kemarin'
        }
      },
      {
        id: 'notif-002',
        user_id: user?.id || 'user-001',
        puskesmas_id: user?.id || 'puskesmas-001',
        title: '🚨 Laporan Darurat - Air Bermasalah',
        message: `Laporan darurat dari Siti Rahayu:
                 Lokasi: Jl. Anggrek No. 25, RT 01/RW 03
                 Status: Menunggu
                 
                 Kondisi Air:
                 • Bau: Berbau Busuk
                 • Rasa: Tidak Normal
                 • Warna: Keruh
                 
                 "Air sangat keruh dan berbau busuk, tidak bisa digunakan untuk minum."`,
        type: 'urgent',
        is_read: false,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 jam lalu
        report_id: 'report-002',
        metadata: {
          report_id: 'report-002',
          user_name: 'Siti Rahayu',
          user_phone: '081298765432',
          lokasi: 'Jl. Anggrek No. 25, RT 01/RW 03',
          kondisi: {
            bau: 'berbau_busuk',
            rasa: 'tidak_normal',
            warna: 'keruh'
          }
        },
        users: {
          nama: 'Siti Rahayu',
          email: 'siti@example.com',
          phone: '081298765432'
        },
        reports: {
          id: 'report-002',
          lokasi: 'Jl. Anggrek No. 25, RT 01/RW 03',
          status: 'pending',
          bau: 'berbau_busuk',
          rasa: 'tidak_normal',
          warna: 'keruh',
          deskripsi: 'Air sangat keruh dan berbau busuk, tidak bisa digunakan untuk minum'
        }
      },
      {
        id: 'notif-003',
        user_id: user?.id || 'user-001',
        puskesmas_id: user?.id || 'puskesmas-001',
        title: '✅ Laporan Selesai Diproses',
        message: `Laporan dari Ahmad Fauzi telah selesai diproses.
                 Lokasi: Jl. Mawar No. 15, RT 02/RW 04
                 Status: Selesai
                 
                 Tindakan: Tim telah melakukan pembersihan dan pengecekan kualitas air. Hasil: AMAN.`,
        type: 'report_completed',
        is_read: true,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 hari lalu
        report_id: 'report-003',
        metadata: {
          report_id: 'report-003',
          user_name: 'Ahmad Fauzi',
          lokasi: 'Jl. Mawar No. 15, RT 02/RW 04',
          action: 'Pembersihan dan pengecekan kualitas air'
        },
        users: {
          nama: 'Ahmad Fauzi',
          email: 'ahmad@example.com',
          phone: '081312345678'
        },
        reports: {
          id: 'report-003',
          lokasi: 'Jl. Mawar No. 15, RT 02/RW 04',
          status: 'selesai',
          bau: 'tidak_berbau',
          rasa: 'normal',
          warna: 'jernih'
        }
      },
      {
        id: 'notif-004',
        user_id: user?.id || 'user-001',
        puskesmas_id: user?.id || 'puskesmas-001',
        title: '📢 Pengumuman Penting',
        message: `Jadwal pemeliharaan sistem air bersih:
                 Hari: Senin, 15 Januari 2024
                 Waktu: 08:00 - 12:00 WIB
                 Wilayah: Seluruh Kecamatan ${profile?.kecamatan || 'Anda'}
                 
                 Mohon maaf atas ketidaknyamanannya.`,
        type: 'announcement',
        is_read: true,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 hari lalu
        metadata: {
          announcement_type: 'maintenance',
          date: '2024-01-15',
          time: '08:00-12:00'
        }
      },
      {
        id: 'notif-005',
        user_id: user?.id || 'user-001',
        puskesmas_id: user?.id || 'puskesmas-001',
        title: '🔬 Hasil Analisis Laboratorium',
        message: `Hasil analisis sampel air dari RT 04/RW 02:
                 Parameter: Kualitas Mikrobiologi
                 Hasil: MEMENUHI SYARAT
                 
                 Catatan: Air aman untuk dikonsumsi setelah dimasak.`,
        type: 'lab_result',
        is_read: false,
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 jam lalu
        metadata: {
          sample_location: 'RT 04/RW 02',
          parameter: 'Mikrobiologi',
          result: 'Memenuhi Syarat',
          note: 'Air aman untuk dikonsumsi setelah dimasak'
        }
      }
    ];

    return mockNotifications;
  };

  // Setup realtime subscription
  useEffect(() => {
    if (!user || !profile || profile.role !== 'puskesmas') {
      setIsLoading(false);
      return;
    }

    console.log('🔧 Setup realtime subscription...');

    // Setup subscription untuk notifikasi baru
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `puskesmas_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📢 Real-time: Notifikasi baru diterima', payload.new);
          fetchNotifications();

          // Tampilkan toast untuk notifikasi baru
          const newNotif = payload.new as Notification;
          if (!newNotif.is_read) {
            toast.success(
              <div className="flex items-start gap-3">
                {getNotificationIcon(newNotif.type)}
                <div>
                  <div className="font-medium">{newNotif.title}</div>
                  <div className="text-sm text-gray-600 line-clamp-2">
                    {newNotif.message.substring(0, 100)}...
                  </div>
                </div>
              </div>,
              {
                duration: 5000,
                position: 'top-right'
              }
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    // Fetch data awal
    fetchNotifications();

    return () => {
      console.log('🧹 Cleaning up subscription...');
      supabase.removeChannel(channel);
    };
  }, [user, profile, fetchNotifications]);

  // Filter notifikasi
  useEffect(() => {
    let filtered = [...notifications];

    switch (filterType) {
      case 'unread':
        filtered = filtered.filter(n => !n.is_read);
        break;
      case 'report':
        filtered = filtered.filter(n => n.type?.includes('report'));
        break;
      case 'urgent':
        filtered = filtered.filter(n => n.type === 'urgent' || n.type === 'report_new');
        break;
      default:
        break;
    }

    if (searchTerm) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.users?.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.reports?.lokasi?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredNotifications(filtered);
  }, [notifications, filterType, searchTerm]);

  // Mark as read
  const markAsRead = async (notificationId: string) => {
    try {
      // Jika notifikasi virtual (dari report pending), jangan update ke DB
      if (notificationId.startsWith('virtual-')) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
        // Update stats
        setStats(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1),
          read: prev.read + 1
        }));
        return;
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error updating notification:', error);
        // Update local state saja jika error
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
      } else {
        // Update local state
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
      }

      // Update stats
      setStats(prev => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1),
        read: prev.read + 1
      }));

    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);

      if (unreadNotifications.length === 0) {
        toast.success('Semua notifikasi sudah dibaca');
        return;
      }

      // Update di database jika tabel ada
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('puskesmas_id', user?.id || '')
          .eq('is_read', false);

        if (error) {
          console.log('Menggunakan update local saja:', error.message);
        }
      } catch (dbError) {
        console.log('Database update skipped, using local update');
      }

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );

      // Update stats
      setStats(prev => ({
        ...prev,
        unread: 0,
        read: prev.total
      }));

      toast.success(`${unreadNotifications.length} notifikasi ditandai sudah dibaca`);

    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Gagal menandai semua sebagai dibaca');
    }
  };

  // Helper functions
  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'report_new':
        return <FileText className="w-5 h-5 text-green-500" />;
      case 'report_processed':
        return <Activity className="w-5 h-5 text-blue-500" />;
      case 'report_completed':
        return <Check className="w-5 h-5 text-green-600" />;
      case 'urgent':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'lab_result':
        return <Activity className="w-5 h-5 text-purple-500" />;
      case 'announcement':
        return <Bell className="w-5 h-5 text-blue-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  const getNotificationColor = (type?: string, isRead?: boolean) => {
    const baseColor = isRead ? 'bg-white' : 'bg-blue-50';

    switch (type) {
      case 'report_new':
        return `${baseColor} border-l-green-500`;
      case 'urgent':
        return `${baseColor} border-l-red-500`;
      case 'warning':
        return `${baseColor} border-l-yellow-500`;
      default:
        return `${baseColor} border-l-blue-500`;
    }
  };

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'report_new': return 'Laporan Baru';
      case 'report_processed': return 'Diproses';
      case 'report_completed': return 'Selesai';
      case 'urgent': return 'Darurat';
      case 'warning': return 'Peringatan';
      case 'lab_result': return 'Hasil Lab';
      case 'announcement': return 'Pengumuman';
      default: return 'Informasi';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} menit yang lalu`;
      if (diffHours < 24) return `${diffHours} jam yang lalu`;
      if (diffDays < 7) return `${diffDays} hari yang lalu`;

      return format(date, 'dd MMM yyyy HH:mm', { locale: id });
    } catch {
      return 'Tanggal tidak valid';
    }
  };

  const handleRefresh = () => {
    fetchNotifications();
  };

  const viewNotificationDetail = (notification: Notification) => {
    setSelectedNotification(notification);

    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    setShowDetailModal(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
        <div className="relative mb-6">
          <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-30"></div>
          <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
        </div>
        <h2 className="text-xl font-bold text-blue-700 mb-2">Sistem Notifikasi Puskesmas</h2>
        <p className="text-gray-600">Memuat notifikasi...</p>
        <p className="text-sm text-gray-400 mt-2">Menyiapkan data untuk {profile?.kecamatan || 'wilayah Anda'}</p>
      </div>
    );
  }

  if (!profile || profile.role !== 'puskesmas') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white p-4">
        <div className="text-center max-w-md">
          <div className="relative mx-auto mb-6">
            <div className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-30"></div>
            <AlertCircle className="relative w-16 h-16 text-red-500 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Akses Ditolak</h2>
          <p className="text-gray-600 mb-6">
            Halaman ini hanya dapat diakses oleh akun puskesmas.
          </p>
          <Link
            href="/login"
            className="inline-block w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Login ke Akun Puskesmas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Bell className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                    Notifikasi Puskesmas
                  </h1>
                  <p className="text-gray-600 mt-1">
                    {profile?.nama || 'Puskesmas'} • {profile?.kecamatan || 'Wilayah'}
                    <span className="text-sm text-blue-600 ml-2">
                      ({notifications.length} notifikasi)
                    </span>
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <span>📢 Sistem notifikasi real-time untuk puskesmas</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Memperbarui...' : 'Refresh'}
              </button>
              <button
                onClick={markAllAsRead}
                disabled={stats.unread === 0}
                className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-80 font-medium"
              >
                <CheckCheck className="w-4 h-4" />
                Tandai Semua Dibaca
              </button>
              <Link
                href="/laporanwarga"
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-br from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                <Eye className="w-4 h-4" />
                Lihat Laporan
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600 mt-1">Total</div>
              </div>
              <Bell className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-600">{stats.unread}</div>
                <div className="text-sm text-gray-600 mt-1">Belum Dibaca</div>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.today}</div>
                <div className="text-sm text-gray-600 mt-1">Hari Ini</div>
              </div>
              <Calendar className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">{stats.report_notifications}</div>
                <div className="text-sm text-gray-600 mt-1">Laporan</div>
              </div>
              <FileText className="w-8 h-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
                <div className="text-sm text-gray-600 mt-1">Darurat</div>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-gray-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-600">{stats.read}</div>
                <div className="text-sm text-gray-600 mt-1">Sudah Dibaca</div>
              </div>
              <Check className="w-8 h-8 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari notifikasi (judul, isi, nama warga)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
            </div>

            <div className="flex gap-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white min-w-[180px]"
              >
                <option value="all">Semua Notifikasi</option>
                <option value="unread">Belum Dibaca ({stats.unread})</option>
                <option value="report">Laporan dari Warga</option>
                <option value="urgent">Darurat & Penting</option>
              </select>

              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                }}
                className="px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 flex items-center gap-2 font-medium"
              >
                <X className="w-4 h-4" />
                Reset Filter
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <div>
              <span className="font-medium">{filteredNotifications.length}</span> dari{' '}
              <span className="font-medium">{notifications.length}</span> notifikasi ditemukan
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span>Sistem aktif</span>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Bell className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-700 mb-3">
                {searchTerm || filterType !== 'all'
                  ? 'Tidak ada notifikasi yang sesuai'
                  : 'Belum ada notifikasi'
                }
              </h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                {searchTerm || filterType !== 'all'
                  ? 'Coba ubah filter atau kata kunci pencarian'
                  : `Notifikasi akan muncul otomatis saat ada laporan baru dari warga di ${profile?.kecamatan || 'wilayah Anda'}`
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterType('all');
                  }}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Tampilkan Semua
                </button>
                <Link
                  href="/laporanwarga"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  Lihat Laporan Warga
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 hover:bg-gray-50 transition-colors border-l-4 ${getNotificationColor(notification.type, notification.is_read)} ${!notification.is_read ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>

                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-800 text-lg">
                              {notification.title}
                            </h3>

                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${notification.type === 'report_new' ? 'bg-green-100 text-green-800' :
                                notification.type === 'urgent' ? 'bg-red-100 text-red-800' :
                                  notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-blue-100 text-blue-800'
                                }`}>
                                {getTypeLabel(notification.type)}
                              </span>

                              {!notification.is_read && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-medium">
                                  Baru
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mb-4">
                            <p className="text-gray-700 whitespace-pre-line">
                              {notification.message}
                            </p>
                          </div>

                          {/* Additional Info */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                              {notification.users && (
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-gray-400" />
                                  <span>
                                    <span className="font-medium">Dari:</span>{' '}
                                    <span className="text-blue-600">{notification.users.nama}</span>
                                  </span>
                                </div>
                              )}

                              {notification.reports?.lokasi && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-gray-400" />
                                  <span>
                                    <span className="font-medium">Lokasi:</span>{' '}
                                    <span className="text-gray-800">{notification.reports.lokasi}</span>
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">
                                  {formatDate(notification.created_at)}
                                </span>
                              </div>

                              {notification.report_id && (
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-600">
                                    ID Laporan: {notification.report_id.substring(0, 8)}...
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          {notification.report_id && (
                            <Link
                              href={`/laporanwarga?id=${notification.report_id}`}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              Lihat
                            </Link>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {!notification.is_read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1"
                            >
                              <Check className="w-4 h-4" />
                              Tandai Dibaca
                            </button>
                          )}

                          <button
                            onClick={() => viewNotificationDetail(notification)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            Detail
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedNotification && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    {getNotificationIcon(selectedNotification.type)}
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Detail Notifikasi</h3>
                      <p className="text-gray-600 mt-1">
                        {format(new Date(selectedNotification.created_at), 'dd MMMM yyyy HH:mm', { locale: id })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <h4 className="text-lg font-semibold text-gray-800">
                        {selectedNotification.title}
                      </h4>
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${selectedNotification.type === 'report_new' ? 'bg-green-100 text-green-800' :
                        selectedNotification.type === 'urgent' ? 'bg-red-100 text-red-800' :
                          selectedNotification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                        }`}>
                        {getTypeLabel(selectedNotification.type)}
                      </span>
                    </div>

                    <div className={`p-4 rounded-lg bg-white ${!selectedNotification.is_read ? 'border-l-4 border-blue-500' : ''}`}>
                      <p className="text-gray-700 whitespace-pre-line">
                        {selectedNotification.message}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedNotification.users && (
                      <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                        <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <User className="w-5 h-5 text-blue-600" />
                          Informasi Pengirim
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm text-gray-500 block mb-1">Nama</label>
                            <p className="font-medium text-gray-900">{selectedNotification.users.nama}</p>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500 block mb-1">Email</label>
                            <p className="font-medium text-gray-900">{selectedNotification.users.email}</p>
                          </div>
                          {selectedNotification.users.phone && (
                            <div>
                              <label className="text-sm text-gray-500 block mb-1">Telepon</label>
                              <p className="font-medium text-gray-900">{selectedNotification.users.phone}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Informasi Teknis
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm text-gray-500 block mb-1">ID Notifikasi</label>
                          <p className="font-mono text-sm text-gray-900">{selectedNotification.id}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500 block mb-1">Status</label>
                          <p className={`font-medium ${selectedNotification.is_read ? 'text-green-600' : 'text-blue-600'}`}>
                            {selectedNotification.is_read ? 'Sudah Dibaca' : 'Belum Dibaca'}
                          </p>
                        </div>
                        {selectedNotification.report_id && (
                          <div>
                            <label className="text-sm text-gray-500 block mb-1">ID Laporan Terkait</label>
                            <p className="font-mono text-sm text-gray-900">{selectedNotification.report_id}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedNotification.reports && (
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Droplets className="w-5 h-5 text-blue-600" />
                        Detail Laporan Air
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-white rounded-lg border">
                          <div className="text-sm text-gray-500 mb-1">Lokasi</div>
                          <div className="font-medium text-gray-900">
                            {selectedNotification.reports.lokasi}
                          </div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg border">
                          <div className="text-sm text-gray-500 mb-1">Status</div>
                          <div className="font-medium text-gray-900">
                            {selectedNotification.reports.status}
                          </div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg border">
                          <div className="text-sm text-gray-500 mb-1">Kondisi Bau</div>
                          <div className="font-medium text-gray-900">
                            {selectedNotification.reports.bau}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap justify-between gap-4 pt-6 border-t border-gray-200">
                    <div className="flex gap-3">
                      {!selectedNotification.is_read && (
                        <button
                          onClick={() => {
                            markAsRead(selectedNotification.id);
                            setSelectedNotification({ ...selectedNotification, is_read: true });
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          <Check className="w-4 h-4" />
                          Tandai Dibaca
                        </button>
                      )}
                    </div>

                    <div className="flex gap-3">
                      {selectedNotification.report_id && (
                        <Link
                          href={`/laporanwarga?id=${selectedNotification.report_id}`}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Eye className="w-4 h-4" />
                          Buka Laporan
                        </Link>
                      )}
                      <button
                        onClick={() => setShowDetailModal(false)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 border border-gray-300 text-white rounded-lg"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Panel */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl shadow-lg p-6 border border-blue-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              Cara Kerja Sistem Notifikasi
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">1. Warga Membuat Laporan</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Ketika warga membuat laporan di aplikasi, sistem otomatis mendeteksi laporan baru.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">2. Sistem Membuat Notifikasi</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Sistem membuat notifikasi otomatis untuk puskesmas berdasarkan kecamatan warga.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">3. Real-time Notification</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Notifikasi muncul secara real-time di dashboard puskesmas tanpa perlu refresh.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">4. Tindak Lanjut</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Puskesmas dapat langsung membuka detail laporan dan mengambil tindakan.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Statistik & Status Sistem
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <div className="text-2xl font-bold text-blue-600">{stats.unread}</div>
                  <div className="text-sm text-gray-600 mt-1">Belum Dibaca</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <div className="text-2xl font-bold text-green-600">{stats.today}</div>
                  <div className="text-sm text-gray-600 mt-1">Hari Ini</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200">
                  <span className="text-gray-700">Kecamatan</span>
                  <span className="font-medium text-blue-600">{profile?.kecamatan || '-'}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200">
                  <span className="text-gray-700">Puskesmas</span>
                  <span className="font-medium text-gray-800">{profile?.nama || '-'}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200">
                  <span className="text-gray-700">Status Sistem</span>
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="font-medium text-green-600">Aktif</span>
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Sistem diperbarui: {new Date().toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Sistem Notifikasi Air Bersih</p>
          <p className="mt-1">Puskesmas {profile?.kecamatan || 'Wilayah'} • Notifikasi real-time aktif</p>
        </div>
      </div>
    </div>
  );
}