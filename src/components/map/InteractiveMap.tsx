'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import { supabase } from '@/lib/supabase';
import WaterSourceMarker from './WaterSourceMarker';
import UserLocationMarker from './UserLocationMarker';
import MapControls from './MapControls';
import MapLegend from './Legend';
import { Loader2, AlertCircle, MapPin } from 'lucide-react';

interface WaterSource {
  id: string;
  nama: string;
  jenis: string;
  status: string;
  latitude: number;
  longitude: number;
  alamat: string;
  last_checked: string;
  kecamatan: string;
}

interface InteractiveMapProps {
  kecamatan?: string;
  showUserLocation?: boolean;
  onSourceClick?: (source: WaterSource) => void;
  height?: string;
  zoom?: number;
}

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
  iconUrl: '/leaflet/images/marker-icon.png',
  shadowUrl: '/leaflet/images/marker-shadow.png',
});

// Default center (Semarang)
const DEFAULT_CENTER: [number, number] = [-6.9667, 110.4167];
const DEFAULT_ZOOM = 13;

export default function InteractiveMap({
  kecamatan,
  showUserLocation = true,
  onSourceClick,
  height = '500px',
  zoom = DEFAULT_ZOOM
}: InteractiveMapProps) {
  const [waterSources, setWaterSources] = useState<WaterSource[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const mapRef = useRef<any>(null);

  // Fetch water sources
  useEffect(() => {
    fetchWaterSources();
  }, [kecamatan]);

  // Get user location
  useEffect(() => {
    if (showUserLocation) {
      getUserLocation();
    }
  }, [showUserLocation]);

  const fetchWaterSources = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('water_sources')
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      // Filter by kecamatan jika ada
      if (kecamatan) {
        query = query.eq('kecamatan', kecamatan);
      }

      const { data, error } = await query;

      if (error) throw error;

      setWaterSources(data || []);
      
      // Jika ada data, set center ke data pertama
      if (data && data.length > 0) {
        setMapCenter([data[0].latitude, data[0].longitude]);
      }

    } catch (err: any) {
      console.error('Error fetching water sources:', err);
      setError('Gagal memuat data sumber air');
    } finally {
      setIsLoading(false);
    }
  };

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setMapCenter([latitude, longitude]);
      },
      (error) => {
        console.warn('Error getting location:', error.message);
        // Fallback ke lokasi berdasarkan kecamatan
        setUserLocation(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };

  const handleSourceClick = (source: WaterSource) => {
    if (onSourceClick) {
      onSourceClick(source);
    }
    
    // Center map ke sumber air yang dipilih
    if (mapRef.current) {
      mapRef.current.flyTo([source.latitude, source.longitude], 15);
    }
  };

  const handleLocateMe = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo(userLocation, 15);
    } else {
      getUserLocation();
    }
  };

  if (isLoading) {
    return (
      <div className="relative" style={{ height }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 rounded-lg">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
          <p className="text-gray-600">Memuat peta...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative" style={{ height }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 rounded-lg">
          <AlertCircle className="w-8 h-8 text-red-600 mb-2" />
          <p className="text-red-600 font-medium">Error</p>
          <p className="text-red-500 text-sm">{error}</p>
          <button
            onClick={fetchWaterSources}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden shadow-lg" style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        ref={mapRef}
        className="rounded-xl"
      >
        {/* Tile Layer - OpenStreetMap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Alternate tile layers for offline/fallback */}
        <TileLayer
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
          maxNativeZoom={20}
          maxZoom={20}
        />
        
        {/* Water Source Markers */}
        {waterSources.map((source) => (
          <WaterSourceMarker
            key={source.id}
            source={source}
            onClick={() => handleSourceClick(source)}
          />
        ))}
        
        {/* User Location Marker */}
        {showUserLocation && userLocation && (
          <UserLocationMarker position={userLocation} />
        )}
        
        {/* Zoom Control */}
        <ZoomControl position="bottomright" />
        
        {/* Map Controls Component */}
        <MapControls 
          onLocateMe={handleLocateMe}
          onRefresh={fetchWaterSources}
          userLocationAvailable={!!userLocation}
        />
      </MapContainer>
      
      {/* Legend */}
      <MapLegend />
      
      {/* Water Source Counter */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-800">
            {waterSources.length} Sumber Air
          </span>
        </div>
      </div>
    </div>
  );
}