'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  MapPin,
  Navigation,
  Filter,
  X,
  Share2,
  Maximize2,
  Minimize2
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamic imports
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

// Komponen Marker yang aman
function WaterSourceMarker({ source }: { 
  source: {
    id: string;
    nama: string;
    alamat: string;
    status: string;
    jenis: string;
    last_checked: string | null;
    latitude: number | null;
    longitude: number | null;
  }
}) {
  const [L, setL] = useState<any>(null);

  useEffect(() => {
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
  
  const customIcon = new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${iconColor}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
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
        <div className="p-2 min-w-[250px]">
          <h3 className="font-bold text-gray-900 text-lg mb-2">{source.nama}</h3>
          <div className="space-y-2 text-sm">
            <p className="text-gray-600">{source.alamat}</p>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                source.status === 'aman' ? 'bg-green-100 text-green-800' :
                source.status === 'rawan' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {source.status.toUpperCase()}
              </span>
              <span className="text-gray-500">{source.jenis}</span>
            </div>
            {source.last_checked && (
              <p className="text-gray-500">
                Terakhir dicek: {new Date(source.last_checked).toLocaleDateString('id-ID')}
              </p>
            )}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${source.latitude},${source.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'white', textDecoration: 'none' }}
              className="inline-block mt-2 px-3 py-2 bg-blue-600 text-sm rounded hover:bg-blue-700"
            >
              Lihat Rute di Google Maps
            </a>


          </div>
        </div>
      </Popup>
    </Marker>
  );
}

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

export default function PetaPage() {
  const { user } = useAuth();
  const [waterSources, setWaterSources] = useState<WaterSource[]>([]);
  const [userKecamatan, setUserKecamatan] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([-6.9667, 110.4167]);
  const [mapZoom, setMapZoom] = useState(13);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapFilter, setMapFilter] = useState<'all' | 'aman' | 'rawan' | 'tidak_aman'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
      getCurrentLocation();
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMapLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Get user kecamatan
      const { data: userData } = await supabase
        .from('users')
        .select('kecamatan')
        .eq('id', user?.id)
        .maybeSingle();

      if (userData?.kecamatan) {
        setUserKecamatan(userData.kecamatan);
        
        // Get water sources
        const { data: sourcesData } = await supabase
          .from('water_sources')
          .select('*')
          .eq('kecamatan', userData.kecamatan);

        setWaterSources(sourcesData || []);
        
        // Set map center to first source or kecamatan default
        const sourceWithCoords = sourcesData?.find(s => s.latitude && s.longitude);
        if (sourceWithCoords) {
          setMapCenter([sourceWithCoords.latitude!, sourceWithCoords.longitude!]);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
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

  const handleShare = () => {
    const mapUrl = window.location.href;
    navigator.clipboard.writeText(mapUrl);
    alert('Link peta telah disalin ke clipboard!');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const filteredSources = waterSources.filter(source => {
    if (mapFilter === 'all') return true;
    return source.status === mapFilter;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Memuat peta...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600"
              >
                <X className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Peta Sumber Air Bersih</h1>
                <p className="text-sm text-gray-600">
                  Wilayah: <span className="font-semibold text-blue-600">{userKecamatan}</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMapFilter('all')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    mapFilter === 'all' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setMapFilter('aman')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    mapFilter === 'aman' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Aman
                </button>
                <button
                  onClick={() => setMapFilter('rawan')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    mapFilter === 'rawan' 
                      ? 'bg-yellow-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Rawan
                </button>
                <button
                  onClick={() => setMapFilter('tidak_aman')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    mapFilter === 'tidak_aman' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Tidak Aman
                </button>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={handleLocateMe}
                  className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                  title="Lokasi saya"
                >
                  <Navigation className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  onClick={handleShare}
                  className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                  title="Bagikan peta"
                >
                  <Share2 className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                  title={isFullscreen ? 'Keluar fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-5 h-5 text-gray-700" />
                  ) : (
                    <Maximize2 className="w-5 h-5 text-gray-700" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Map */}
      <div className="h-[calc(100vh-80px)]">
        {isMapLoaded && (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Water Sources */}
            {filteredSources
              .filter(source => source.latitude && source.longitude)
              .map((source) => (
                <WaterSourceMarker key={source.id} source={source} />
              ))}

            <ZoomControl position="bottomright" />
          </MapContainer>
        )}
      </div>

      {/* Floating Info */}
      <div className="fixed bottom-6 left-6 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4">
        <h4 className="font-bold text-gray-800 text-sm mb-2">Legenda</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-xs text-gray-700">Sumber Air Aman</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span className="text-xs text-gray-700">Sumber Air Rawan</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-xs text-gray-700">Sumber Tidak Aman</span>
          </div>
        </div>
      </div>
    </div>
  );
}