// components/puskesmas/WaterSourceMap.tsx - UPDATE PROP INTERFACE
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { 
  MapPin,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

// Dynamic imports untuk Leaflet
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

interface WaterSource {
  id: string;
  nama: string;
  jenis: string;
  alamat: string;
  status: 'aman' | 'rawan' | 'tidak_aman';
  kecamatan: string;
  last_checked: string | null;
  latitude: number;
  longitude: number;
  verified: boolean;
  pengguna_terdaftar: number;
  kapasitas: number;
  category: string;
  rt: string;
  rw: string;
  kelurahan: string;
}

interface WaterSourceMapProps {
  sources: WaterSource[];
  mapType?: 'map' | 'satellite';
  onSourceClick?: (source: WaterSource) => void; // <- TAMBAHKAN INI
  onMapTypeChange?: (type: 'map' | 'satellite') => void; // <- OPTIONAL
}

// Komponen Marker untuk Sumber Air - UPDATE
function WaterSourceMarker({ source, onClick }: { 
  source: WaterSource; 
  onClick?: (source: WaterSource) => void;
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
  
  const iconUrl = `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${iconColor}.png`;
  const shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png';
  
  const customIcon = new L.Icon({
    iconUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  const handleClick = () => {
    onClick?.(source);
  };

  return (
    <Marker
      position={[source.latitude, source.longitude]}
      icon={customIcon}
      eventHandlers={{
        click: handleClick
      }}
    >
      <Popup>
        <div className="p-2 min-w-[250px]" onClick={(e) => e.stopPropagation()}>
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
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div>
                <span className="text-gray-500">Pengguna:</span>
                <p className="font-medium">{source.pengguna_terdaftar} KK</p>
              </div>
              <div>
                <span className="text-gray-500">Kapasitas:</span>
                <p className="font-medium">{source.kapasitas} L</p>
              </div>
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${source.latitude},${source.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              Lihat Rute di Google Maps
            </a>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

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
          <Clock className="w-4 h-4 text-gray-700" />
        </button>
        <button
          onClick={onLocate}
          className="flex items-center justify-center w-10 h-10 hover:bg-gray-100"
          title="Lokasi saya"
        >
          <MapPin className="w-4 h-4 text-blue-600" />
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
        <h4 className="font-bold text-gray-800 text-xs mb-2">Legenda Sumber Air</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs text-gray-700">Aman</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-xs text-gray-700">Rawan</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs text-gray-700">Tidak Aman</span>
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-xs text-gray-700">Terverifikasi</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Komponen Loading State
function MapLoading() {
  return (
    <div className="h-full w-full bg-gray-100 flex items-center justify-center rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Memuat peta...</p>
      </div>
    </div>
  );
}

export default function WaterSourceMap({ 
  sources, 
  mapType = 'map', 
  onSourceClick,
  onMapTypeChange 
}: WaterSourceMapProps) {
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [currentMapType, setCurrentMapType] = useState<'map' | 'satellite'>(mapType);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-6.9667, 110.4167]);
  const [mapZoom, setMapZoom] = useState(13);

  // Filter sumber yang punya koordinat valid
  const validSources = sources.filter(source => 
    source.latitude && source.longitude &&
    typeof source.latitude === 'number' &&
    typeof source.longitude === 'number'
  );

  useEffect(() => {
    // Set timeout untuk memastikan Leaflet CSS dimuat
    const timer = setTimeout(() => {
      setIsMapLoaded(true);
    }, 100);

    // Set map center berdasarkan sumber pertama atau default
    if (validSources.length > 0) {
      const firstSource = validSources[0];
      setMapCenter([firstSource.latitude, firstSource.longitude]);
      setMapZoom(14);
    }

    return () => clearTimeout(timer);
  }, [validSources]);

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter([latitude, longitude]);
          setMapZoom(15);
        },
        (error) => {
          console.log('Tidak dapat mengakses lokasi:', error.message);
        }
      );
    }
  };

  const handleRefreshMap = () => {
    // Logic refresh bisa ditambahkan jika perlu
    console.log('Refresh map clicked');
  };

  const handleMapTypeChange = (type: 'map' | 'satellite') => {
    setCurrentMapType(type);
    onMapTypeChange?.(type);
  };

  const handleSourceClick = (source: WaterSource) => {
    console.log('Source clicked:', source);
    onSourceClick?.(source);
  };

  // Group sources by status untuk statistik
  const stats = {
    total: validSources.length,
    aman: validSources.filter(s => s.status === 'aman').length,
    rawan: validSources.filter(s => s.status === 'rawan').length,
    tidak_aman: validSources.filter(s => s.status === 'tidak_aman').length,
    verified: validSources.filter(s => s.verified).length
  };

  return (
    <div className="h-full w-full relative">
      {!isMapLoaded ? (
        <MapLoading />
      ) : (
        <>
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            className="rounded-lg"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url={currentMapType === 'satellite' 
                ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              }
            />
            
            {/* Water Source Markers */}
            {validSources.map((source) => (
              <WaterSourceMarker 
                key={source.id} 
                source={source} 
                onClick={handleSourceClick}
              />
            ))}

            <ZoomControl position="bottomright" />
            <MapControls onLocate={handleLocateMe} onRefresh={handleRefreshMap} />
            <MapLegend />
          </MapContainer>
          
          {/* Map Info Overlay */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <div>
                  <h4 className="text-sm font-bold text-gray-800">Statistik Sumber Air</h4>
                  <p className="text-xs text-gray-500">{validSources.length} sumber terdaftar</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center">
                  <div className="text-xs text-green-600 font-bold">{stats.aman}</div>
                  <div className="text-xs text-gray-500">Aman</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-yellow-600 font-bold">{stats.rawan}</div>
                  <div className="text-xs text-gray-500">Rawan</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-red-600 font-bold">{stats.tidak_aman}</div>
                  <div className="text-xs text-gray-500">Tidak Aman</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-blue-600 font-bold">{stats.verified}</div>
                  <div className="text-xs text-gray-500">Terverifikasi</div>
                </div>
              </div>
            </div>
          </div>

          {/* Map Type Toggle */}
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden">
            <div className="flex">
              <button
                onClick={() => handleMapTypeChange('map')}
                className={`px-3 py-2 text-sm ${currentMapType === 'map' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
              >
                Peta
              </button>
              <button
                onClick={() => handleMapTypeChange('satellite')}
                className={`px-3 py-2 text-sm ${currentMapType === 'satellite' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
              >
                Satelit
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}