'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import StatCard from '@/components/StatCard';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Droplets,
  MapPin,
  Bell,
  AlertTriangle,
  Heart,
  BookOpen,
  Navigation,
  Filter,
  Maximize2,
  RefreshCw,
  User
} from 'lucide-react';
import dynamic from 'next/dynamic';
import HealthWidget from '@/components/health/HealthWidget';
import toast from 'react-hot-toast'; 

// Dynamic import untuk Leaflet components (SSR false)
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const ZoomControl = dynamic(
  () => import('react-leaflet').then((mod) => mod.ZoomControl),
  { ssr: false }
);

type Report = {
  id: string;
  status: string;
  bau: string;
  rasa: string;
  warna: string;
  created_at: string;
  feedback: string | null;
};

type WaterSource = {
  id: string;
  nama: string;
  jenis: string;
  alamat: string;
  status: string;
  kecamatan: string;
  last_checked: string | null;
  latitude: number | null;
  longitude: number | null;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'urgent' | 'update';
  is_read: boolean;
  created_at: string;
  user_id: string | null;
};

type Statistics = {
  totalLaporan: number;
  pending: number;
  diproses: number;
  selesai: number;
  notifikasiBaru: number;
  sumberAman: number;
};

// Koordinat default berdasarkan kecamatan di Semarang
const KECAMATAN_COORDINATES: Record<string, [number, number]> = {
  'Semarang Barat': [-6.9667, 110.4167],
  'Semarang Timur': [-6.9500, 110.4333],
  'Semarang Utara': [-6.9500, 110.4167],
  'Semarang Selatan': [-6.9833, 110.4167],
  'Semarang Tengah': [-6.9833, 110.4167],
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Clock className="w-5 h-5 text-yellow-500" />;
    case 'diproses':
      return <AlertCircle className="w-5 h-5 text-blue-500" />;
    case 'selesai':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    default:
      return <Clock className="w-5 h-5 text-gray-400" />;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Menunggu';
    case 'diproses':
      return 'Diproses';
    case 'selesai':
      return 'Selesai';
    default:
      return status;
  }
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case 'urgent':
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    case 'update':
      return <Bell className="w-5 h-5 text-blue-500" />;
    default:
      return <Bell className="w-5 h-5 text-gray-400" />;
  }
};

const getNotificationBadgeColor = (type: string) => {
  switch (type) {
    case 'warning':
      return 'bg-yellow-500';
    case 'urgent':
      return 'bg-red-500';
    case 'update':
      return 'bg-blue-500';
    default:
      return 'bg-gray-500';
  }
};

// Komponen Map Controls
function MapControls({ onLocate, onRefresh }: { 
  onLocate: () => void; 
  onRefresh: () => void;
}) {
  return (
    <div className="leaflet-bottom leaflet-right">
      <div className="leaflet-control leaflet-bar bg-white rounded-lg shadow-lg overflow-hidden">
        <button
          onClick={onRefresh}
          className="flex items-center justify-center w-10 h-10 hover:bg-gray-100 border-b border-gray-200"
          title="Refresh peta"
        >
          <RefreshCw className="w-4 h-4 text-gray-700" />
        </button>
        <button
          onClick={onLocate}
          className="flex items-center justify-center w-10 h-10 hover:bg-gray-100"
          title="Lokasi saya"
        >
          <Navigation className="w-4 h-4 text-blue-600" />
        </button>
      </div>
    </div>
  );
}

// Komponen Map Legend
function MapLegend() {
  return (
    <div className="leaflet-bottom leaflet-left">
      <div className="leaflet-control leaflet-bar bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3">
        <h4 className="font-bold text-gray-800 text-xs mb-2">Legenda</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs text-gray-700">Air Aman</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-xs text-gray-700">Air Rawan</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs text-gray-700">Tidak Aman</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Komponen Marker untuk Sumber Air
function WaterSourceMarker({ source }: { source: WaterSource }) {
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    // Dynamic import Leaflet hanya di client
    if (typeof window !== 'undefined') {
      import('leaflet').then((leaflet) => {
        setL(leaflet.default);
      });
    }
  }, []);

  if (!L || !source.latitude || !source.longitude) return null;

  const iconColor = 
    source.status === 'aman' ? 'green' :
    source.status === 'rawan' ? 'orange' : 'red';
  
  const iconUrl = `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${iconColor}.png`;
  const shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png';
  
  const customIcon = new L.Icon({
    iconUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  return (
    <Marker
      position={[source.latitude, source.longitude]}
      icon={customIcon}
    >
      <Popup>
        <div className="p-2 min-w-[200px]">
          <h3 className="font-bold text-gray-900 text-sm mb-2">{source.nama}</h3>
          <div className="space-y-1 text-xs">
            <p className="text-gray-600">{source.alamat}</p>
            <p className="font-medium">
              Status: <span className={
                source.status === 'aman' ? 'text-green-600' :
                source.status === 'rawan' ? 'text-yellow-600' :
                'text-red-600'
              }>
                {source.status.toUpperCase()}
              </span>
            </p>
            <p className="text-gray-500">Jenis: {source.jenis}</p>
            {source.last_checked && (
              <p className="text-gray-500">
                Terakhir dicek: {new Date(source.last_checked).toLocaleDateString('id-ID')}
              </p>
            )}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${source.latitude},${source.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Lihat Rute di Google Maps
            </a>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// Komponen Marker untuk Lokasi User
function UserLocationMarker({ position }: { position: [number, number] }) {
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((leaflet) => {
        setL(leaflet.default);
      });
    }
  }, []);

  if (!L) return null;

  const userIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    className: 'user-location-marker'
  });

  return (
    <Marker position={position} icon={userIcon}>
      <Popup>
        <div className="p-2">
          <div className="font-medium text-gray-900 mb-2">Lokasi Anda</div>
          <p className="text-sm text-gray-600">
            {position[0].toFixed(6)}, {position[1].toFixed(6)}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}

// Komponen Map Loading State
function MapLoading() {
  return (
    <div className="h-[400px] bg-gray-100 rounded-xl flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Memuat peta...</p>
      </div>
    </div>
  );
}

export default function WargaDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [waterSources, setWaterSources] = useState<WaterSource[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<Statistics>({
    totalLaporan: 0,
    pending: 0,
    diproses: 0,
    selesai: 0,
    notifikasiBaru: 0,
    sumberAman: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [userKecamatan, setUserKecamatan] = useState('');
  const [dataFetched, setDataFetched] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-6.9667, 110.4167]);
  const [mapZoom, setMapZoom] = useState(13);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [showMapFilters, setShowMapFilters] = useState(false);
  const [mapFilter, setMapFilter] = useState<'all' | 'aman' | 'rawan' | 'tidak_aman'>('all');
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setIsLoading(false);
      return;
    }

    if (!dataFetched) {
      fetchData();
      getCurrentLocation();
    }
  }, [user, authLoading, dataFetched]);

  useEffect(() => {
    // Set timeout untuk memastikan Leaflet CSS dimuat
    const timer = setTimeout(() => {
      setIsMapLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Fetching data for user:', user?.id);
      
      // 1. Get user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('kecamatan, kelurahan, puskesmas_id, nama')
        .eq('id', user?.id)
        .single();
  
      if (userError) {
        console.error('❌ User data error:', userError);
        toast.error('Data user tidak ditemukan');
        return;
      }
  
      console.log('✅ User data found:', userData);
      
      let sourcesData: WaterSource[] = [];
      
      if (userData?.kecamatan) {
        setUserKecamatan(userData.kecamatan);
        
        // Set map center
        if (KECAMATAN_COORDINATES[userData.kecamatan]) {
          setMapCenter(KECAMATAN_COORDINATES[userData.kecamatan]);
        }
  
        // 2. Fetch water sources berdasarkan KECAMATAN user
        const { data: fetchedSourcesData, error: sourcesError } = await supabase
          .from('water_sources')
          .select('*')
          .eq('kecamatan', userData.kecamatan)
          .limit(10);
  
        if (sourcesError) {
          console.warn('Water sources error:', sourcesError);
        } else {
          sourcesData = fetchedSourcesData || [];
          setWaterSources(sourcesData);
          console.log('✅ Water sources:', sourcesData.length);
        }
      } else {
        console.warn('⚠️ User does not have kecamatan data');
      }
  
      // 3. Fetch reports personal user
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('id, status, bau, rasa, warna, created_at, feedback')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);
  
      if (reportsError) {
        console.warn('Reports error:', reportsError);
      } else {
        setReports(reportsData || []);
      }
  
      // 4. Fetch notifications - Query langsung tanpa wilayahService
      if (userData?.kecamatan) {
        console.log(`🔔 Fetching notifications for kecamatan: ${userData.kecamatan}`);
        
        // Query 1: Notifikasi untuk kecamatan spesifik user
        const { data: kecamatanNotif, error: kecError } = await supabase
          .from('notifications')
          .select('*')
          .eq('kecamatan', userData.kecamatan)
          .order('created_at', { ascending: false })
          .limit(5);
  
        if (kecError) {
          console.warn('Kecamatan notifications error:', kecError);
        }
  
        // Query 2: Notifikasi global (tanpa kecamatan)
        const { data: globalNotif, error: globalError } = await supabase
          .from('notifications')
          .select('*')
          .is('kecamatan', null)
          .order('created_at', { ascending: false })
          .limit(5);
  
        if (globalError) {
          console.warn('Global notifications error:', globalError);
        }
  
        // Gabungkan dan sortir
        const allNotifications = [
          ...(kecamatanNotif || []),
          ...(globalNotif || [])
        ].sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
  
        // Filter duplikat
        const seen = new Set();
        const uniqueNotifications = allNotifications.filter((notification: any) => {
          const key = `${notification.title}-${notification.message}-${notification.type}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
  
        // Format ke tipe Notification
        const formattedNotifications: Notification[] = uniqueNotifications.map((notif: any) => ({
          id: notif.id,
          title: notif.title,
          message: notif.message,
          type: notif.type,
          is_read: notif.is_read || false,
          created_at: notif.created_at,
          user_id: notif.user_id || user?.id || null
        }));
  
        setNotifications(formattedNotifications);
        console.log('✅ Notifications found:', formattedNotifications.length);
  
        // Hitung notifikasi baru
        const notifikasiBaru = formattedNotifications.filter(n => !n.is_read).length;
        
        // 5. Hitung statistics
        const reportsArray = reportsData || [];
        const pending = reportsArray.filter(r => r.status === 'pending').length;
        const diproses = reportsArray.filter(r => r.status === 'diproses').length;
        const selesai = reportsArray.filter(r => r.status === 'selesai').length;
        const sumberAman = sourcesData.filter((s: WaterSource) => s.status === 'aman').length;
  
        setStats({
          totalLaporan: reportsArray.length,
          pending,
          diproses,
          selesai,
          notifikasiBaru,
          sumberAman,
        });
      } else {
        // Jika user tidak punya kecamatan, tampilkan notifikasi global saja
        const { data: globalNotif, error: globalError } = await supabase
          .from('notifications')
          .select('*')
          .is('kecamatan', null)
          .order('created_at', { ascending: false })
          .limit(8);
  
        if (!globalError && globalNotif) {
          const formattedNotifications: Notification[] = globalNotif.map((notif: any) => ({
            id: notif.id,
            title: notif.title,
            message: notif.message,
            type: notif.type,
            is_read: notif.is_read || false,
            created_at: notif.created_at,
            user_id: notif.user_id || user?.id || null
          }));
  
          setNotifications(formattedNotifications);
          
          const notifikasiBaru = formattedNotifications.filter(n => !n.is_read).length;
          
          const reportsArray = reportsData || [];
          const pending = reportsArray.filter(r => r.status === 'pending').length;
          const diproses = reportsArray.filter(r => r.status === 'diproses').length;
          const selesai = reportsArray.filter(r => r.status === 'selesai').length;
  
          setStats(prev => ({
            ...prev,
            totalLaporan: reportsArray.length,
            pending,
            diproses,
            selesai,
            notifikasiBaru,
          }));
        }
      }
  
      setDataFetched(true);
      console.log('✅ Data fetch complete');
  
    } catch (error: any) {
      console.error('❌ Fetch data error:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi untuk menandai notifikasi sebagai sudah dibaca
  const markNotificationAsRead = async (notificationId: string) => {
    try {
      console.log('📌 Marking notification as read:', notificationId);
      
      // 1. Update status di tabel notifications
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (updateError) {
        console.error('❌ Error updating notification:', updateError);
        
        // Coba alternatif: insert ke notification_reads
        const { error: insertError } = await supabase
          .from('notification_reads')
          .insert({
            user_id: user?.id,
            notification_id: notificationId,
            read_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('❌ Error inserting to notification_reads:', insertError);
          return;
        }
      }

      // 2. Update local state untuk UI
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true } 
            : notif
        )
      );

      // 3. Update stats (kurangi notifikasi baru)
      setStats(prev => ({
        ...prev,
        notifikasiBaru: Math.max(0, prev.notifikasiBaru - 1)
      }));

      console.log('✅ Notification marked as read');

    } catch (error) {
      console.error('❌ Error in markNotificationAsRead:', error);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
        },
        (error) => {
          console.log('Tidak dapat mengakses lokasi:', error.message);
        }
      );
    }
  };

  const handleLocateMe = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.setView(userLocation, 15);
    } else {
      getCurrentLocation();
    }
  };

  const handleRefreshMap = () => {
    fetchData();
  };

  const filteredWaterSources = waterSources.filter(source => {
    if (mapFilter === 'all') return true;
    return source.status === mapFilter;
  });

  const safeWaterSources = waterSources.filter(source => source.status === 'aman').slice(0, 3);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Menyiapkan dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">Memuat data untuk pertama kali</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">Silakan login terlebih dahulu</h2>
          <Link href="/login" className="text-blue-600 hover:text-blue-800 mt-2 inline-block">
            Kembali ke halaman login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Selamat Datang di Air Bersih
            </h1>
            <p className="text-gray-600 mt-2">
              Pantau kualitas air di wilayah <span className="font-semibold text-blue-600">{userKecamatan || 'Anda'}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link 
              href="/notifikasi"
              className="relative p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {stats.notifikasiBaru > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {stats.notifikasiBaru}
                </span>
              )}
            </Link>
            <Link 
              href="/profil"
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <User className="w-5 h-5 text-gray-600" />
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Laporan"
          value={stats.totalLaporan}
          icon={Droplets}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />

        <StatCard
          title="Dalam Proses"
          value={stats.pending + stats.diproses}
          icon={Clock}
          iconBg="bg-yellow-100"
          iconColor="text-yellow-600"
        />

        <StatCard
          title="Selesai"
          value={stats.selesai}
          icon={CheckCircle}
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />

        <StatCard
          title="Sumber Aman"
          value={stats.sumberAman}
          icon={MapPin}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />

        <StatCard
          title="Notifikasi"
          value={stats.notifikasiBaru}
          icon={Bell}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          highlight={stats.notifikasiBaru > 0}
        />
      </div>

      {/* FULL WIDTH LAPORAN TERBARU */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Laporan Terbaru</h2>
            <Link
              href="/lapor"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
            >
              + Buat Laporan
            </Link>
          </div>

          <div className="divide-y">
            {reports.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Droplets className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p>Belum ada laporan</p>
              </div>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between">
                    <div>
                      <span className="font-medium">
                        {getStatusText(report.status)}
                      </span>
                      <p className="text-xs text-gray-500">
                        {new Date(report.created_at).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <Link
                      href={`/status/${report.id}`}
                      className="text-blue-600 text-sm"
                    >
                      Detail →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      {/* PETA INTERAKTIF */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Peta Sumber Air di {userKecamatan}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Klik marker untuk detail sumber air
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMapFilters(!showMapFilters)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <Link 
              href="/peta"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <Maximize2 className="w-4 h-4" />
              Fullscreen
            </Link>
          </div>
        </div>

        {/* Filter Options */}
        {showMapFilters && (
          <div className="px-6 py-4 border-b bg-gray-50">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setMapFilter('all')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mapFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Semua ({waterSources.length})
              </button>
              <button
                onClick={() => setMapFilter('aman')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mapFilter === 'aman'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Aman ({waterSources.filter((s: WaterSource) => s.status === 'aman').length})
              </button>
              <button
                onClick={() => setMapFilter('rawan')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mapFilter === 'rawan'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Rawan ({waterSources.filter((s: WaterSource) => s.status === 'rawan').length})
              </button>
              <button
                onClick={() => setMapFilter('tidak_aman')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mapFilter === 'tidak_aman'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Tidak Aman ({waterSources.filter((s: WaterSource) => s.status === 'tidak_aman').length})
              </button>
            </div>
          </div>
        )}

        {/* Map Container */}
        <div className="h-[400px] relative">
          {!isMapLoaded ? (
            <MapLoading />
          ) : (
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
              ref={mapRef}
              className="rounded-b-xl"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* User Location Marker */}
              {userLocation && (
                <UserLocationMarker position={userLocation} />
              )}

              {/* Water Source Markers */}
              {filteredWaterSources
                .filter(source => source.latitude && source.longitude)
                .map((source) => (
                  <WaterSourceMarker key={source.id} source={source} />
                ))}

              {/* Map Controls */}
              <ZoomControl position="bottomright" />
              <MapControls onLocate={handleLocateMe} onRefresh={handleRefreshMap} />
              <MapLegend />
            </MapContainer>
          )}
          
          {/* Map Info Overlay */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <div>
                <span className="text-sm font-medium text-gray-800">
                  {filteredWaterSources.filter(s => s.latitude && s.longitude).length} Sumber Air
                </span>
                <p className="text-xs text-gray-500 mt-0.5">Kecamatan: {userKecamatan}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="space-y-6">

        {/* TOP GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* NOTIFIKASI TERBARU (DOMINAN) */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-800">Notifikasi Terbaru</h2>
                {stats.notifikasiBaru > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {stats.notifikasiBaru} baru
                  </span>
                )}
              </div>
              <Link href="/notifikasi" className="text-blue-600 text-sm font-medium">
                Lihat semua →
              </Link>
            </div>

            <div className="divide-y">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p>Belum ada notifikasi</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      !notification.is_read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() =>
                      !notification.is_read && markNotificationAsRead(notification.id)
                    }
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <h3 className="font-medium text-gray-800">
                            {notification.title}
                          </h3>
                          {!notification.is_read && (
                            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                              Baru
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(notification.created_at).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">

            {/* SUMBER AIR AMAN */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between">
                <h2 className="text-lg font-semibold text-gray-800">Sumber Air Aman</h2>
                <span className="text-sm text-gray-500">{userKecamatan}</span>
              </div>

              <div className="divide-y">
                {safeWaterSources.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>Belum ada sumber air aman</p>
                  </div>
                ) : (
                  safeWaterSources.map((source) => (
                    <div key={source.id} className="p-4 flex gap-3">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <MapPin className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{source.nama}</p>
                        <p className="text-sm text-gray-600">{source.alamat}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-6 py-4 border-t">
                <Link href="/sumber-air" className="text-blue-600 text-sm font-medium">
                  Lihat semua →
                </Link>
              </div>
            </div>

            {/* HEALTH */}
            <HealthWidget />
          </div>
        </div>
      </div>


      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link 
          href="/lapor"
          className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-200 transition-colors">
              <AlertTriangle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Lapor Masalah</h3>
              <p className="text-sm text-gray-600 mt-1">Laporkan kondisi air tidak normal</p>
            </div>
          </div>
        </Link>

        <Link 
          href="/sumber-air"
          className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-200 transition-colors">
              <MapPin className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Cari Sumber Air</h3>
              <p className="text-sm text-gray-600 mt-1">Temukan sumber air aman terdekat</p>
            </div>
          </div>
        </Link>

        <Link 
          href="/panduan"
          className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-lg group-hover:bg-purple-200 transition-colors">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Panduan</h3>
              <p className="text-sm text-gray-600 mt-1">Cara cek dan filter air</p>
            </div>
          </div>
        </Link>

        <Link 
          href="/penyakit"
          className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-red-100 p-3 rounded-lg group-hover:bg-red-200 transition-colors">
              <Heart className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Info Penyakit</h3>
              <p className="text-sm text-gray-600 mt-1">Penyakit akibat air kotor</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}