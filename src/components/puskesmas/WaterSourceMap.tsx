// components/puskesmas/WaterSourceMap.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Clock
} from 'lucide-react';

interface WaterSource {
  id: string;
  nama: string;
  jenis: 'sumur' | 'pdam' | 'mata_air' | 'sungai' | 'embung';
  alamat: string;
  status: 'aman' | 'rawan' | 'tidak_aman';
  kecamatan: string;
  last_checked?: string;
  latitude: number;
  longitude: number;
  catatan: string | null;
  created_at?: string;
  updated_at?: string;
}

interface WaterSourceMapProps {
  sources: WaterSource[];
  mapType?: 'map' | 'satellite';
  onSourceClick?: (source: WaterSource) => void;
  onMapTypeChange?: (type: 'map' | 'satellite') => void;
}

// ─── HELPER COMPONENTS ───────────────────────────────────────────────────────

/**
 * Handles keeping the map view updated when `center` changes.
 * This prevents the need to remount the entire MapContainer.
 */
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

/**
 * Defines the custom marker icon based on status.
 */
function getCustomIcon(status: string) {
  const iconColor =
    status === 'aman' ? 'green' :
      status === 'rawan' ? 'orange' : 'red';

  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${iconColor}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
}

function WaterSourceMarker({ source, onClick }: {
  source: WaterSource;
  onClick?: (source: WaterSource) => void;
}) {
  const customIcon = useMemo(() => getCustomIcon(source.status), [source.status]);

  if (!source.latitude || !source.longitude) return null;

  return (
    <Marker
      position={[source.latitude, source.longitude]}
      icon={customIcon}
      eventHandlers={{
        click: () => onClick?.(source)
      }}
    >
      <Popup>
        <div className="p-2 min-w-[250px]" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-bold text-gray-900 text-lg mb-2">{source.nama}</h3>
          <div className="space-y-2 text-sm">
            <p className="text-gray-600">{source.alamat}</p>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${source.status === 'aman' ? 'bg-green-100 text-green-800' :
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
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function WaterSourceMap({
  sources,
  mapType = 'map',
  onSourceClick,
  onMapTypeChange
}: WaterSourceMapProps) {
  const [currentMapType, setCurrentMapType] = useState<'map' | 'satellite'>(mapType);

  // Default center
  const [mapCenter, setMapCenter] = useState<[number, number]>([-6.9667, 110.4167]);
  const [mapZoom, setMapZoom] = useState(13);

  // Memoize valid sources to prevent re-filtering on every render
  const validSources = useMemo(() => sources.filter(source =>
    source.latitude && source.longitude &&
    typeof source.latitude === 'number' &&
    typeof source.longitude === 'number'
  ), [sources]);

  // Update map center when validSources change (only first time or significantly)
  useEffect(() => {
    if (validSources.length > 0) {
      const firstSource = validSources[0];
      // Optional: Only update if far away? For now, we center on the first source found.
      setMapCenter([firstSource.latitude, firstSource.longitude]);
      setMapZoom(14);
    }
  }, [validSources.length]); // Only update if count changes, or you can add other dependency carefully

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
    console.log('Refresh map clicked');
  };

  const handleMapTypeChange = (type: 'map' | 'satellite') => {
    setCurrentMapType(type);
    onMapTypeChange?.(type);
  };

  const stats = {
    total: validSources.length,
    aman: validSources.filter(s => s.status === 'aman').length,
    rawan: validSources.filter(s => s.status === 'rawan').length,
    tidak_aman: validSources.filter(s => s.status === 'tidak_aman').length
  };

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        className="rounded-lg z-0" // Explicit z-index 0 to avoid overlapping with modal
      >
        {/* MapUpdater listens to changes in mapCenter and moves the view */}
        <MapUpdater center={mapCenter} zoom={mapZoom} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={currentMapType === 'satellite'
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
        />

        {validSources.map((source) => (
          <WaterSourceMarker
            key={source.id}
            source={source}
            onClick={onSourceClick}
          />
        ))}

        <ZoomControl position="bottomright" />
        <MapControls onLocate={handleLocateMe} onRefresh={handleRefreshMap} />
        <MapLegend />
      </MapContainer>

      {/* Map Info Overlay */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg" style={{ zIndex: 1000 }}>
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
          </div>
        </div>
      </div>

      {/* Map Type Toggle */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden" style={{ zIndex: 1000 }}>
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
    </div>
  );
}