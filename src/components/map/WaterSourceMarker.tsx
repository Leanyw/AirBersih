'use client';

import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { CheckCircle, AlertTriangle, XCircle, Droplets } from 'lucide-react';

interface WaterSource {
  id: string;
  nama: string;
  jenis: string;
  status: string;
  latitude: number;
  longitude: number;
  alamat: string;
  last_checked: string;
}

interface WaterSourceMarkerProps {
  source: WaterSource;
  onClick: () => void;
}

// Custom icons berdasarkan status
const createCustomIcon = (status: string) => {
  const iconSize: [number, number] = [32, 32];
  const iconAnchor: [number, number] = [16, 32];
  const popupAnchor: [number, number] = [0, -32];
  
  let iconUrl = '';
  let iconColor = '';
  
  switch (status) {
    case 'aman':
      iconUrl = '/map-icons/water-safe.png';
      iconColor = '#10B981';
      break;
    case 'rawan':
      iconUrl = '/map-icons/water-warning.png';
      iconColor = '#F59E0B';
      break;
    case 'tidak_aman':
      iconUrl = '/map-icons/water-danger.png';
      iconColor = '#EF4444';
      break;
    default:
      iconUrl = '/map-icons/water-unknown.png';
      iconColor = '#6B7280';
  }
  
  return L.icon({
    iconUrl,
    iconSize,
    iconAnchor,
    popupAnchor,
    className: 'water-source-marker'
  });
};

export default function WaterSourceMarker({ source, onClick }: WaterSourceMarkerProps) {
  const icon = createCustomIcon(source.status);
  
  const getStatusIcon = () => {
    switch (source.status) {
      case 'aman': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rawan': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'tidak_aman': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Droplets className="w-4 h-4 text-gray-600" />;
    }
  };
  
  const getStatusColor = () => {
    switch (source.status) {
      case 'aman': return 'bg-green-100 text-green-800';
      case 'rawan': return 'bg-yellow-100 text-yellow-800';
      case 'tidak_aman': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Marker
      position={[source.latitude, source.longitude]}
      icon={icon}
      eventHandlers={{
        click: onClick
      }}
    >
      <Popup>
        <div className="p-2 min-w-[250px]">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-bold text-gray-900 text-lg">{source.nama}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
              {source.status.toUpperCase()}
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-700">Jenis: {source.jenis}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm text-gray-700">
                Status: {source.status === 'aman' ? 'Aman Dikonsumsi' : 
                       source.status === 'rawan' ? 'Perlu Perhatian' : 
                       'Tidak Aman'}
              </span>
            </div>
            
            <div className="text-sm text-gray-600 mt-3">
              <p className="font-medium mb-1">Alamat:</p>
              <p className="text-gray-700">{source.alamat}</p>
            </div>
            
            <div className="text-sm text-gray-500 mt-2">
              Terakhir dicek: {formatDate(source.last_checked)}
            </div>
            
            <button
              onClick={() => {
                // Aksi ketika tombol diklik (bisa untuk navigasi, dll)
                if (window.confirm(`Tampilkan rute ke ${source.nama}?`)) {
                  const url = `https://www.google.com/maps/dir/?api=1&destination=${source.latitude},${source.longitude}`;
                  window.open(url, '_blank');
                }
              }}
              className="w-full mt-3 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Lihat Rute
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}