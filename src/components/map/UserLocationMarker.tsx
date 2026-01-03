'use client';

import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, MapPin } from 'lucide-react';

interface UserLocationMarkerProps {
  position: [number, number];
}

// Custom icon untuk lokasi user
const userIcon = L.icon({
  iconUrl: '/map-icons/user-location.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
  className: 'user-location-marker animate-pulse'
});

export default function UserLocationMarker({ position }: UserLocationMarkerProps) {
  return (
    <Marker position={position} icon={userIcon}>
      <Popup>
        <div className="p-2">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-gray-900">Lokasi Anda</span>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Latitude: {position[0].toFixed(6)}
            <br />
            Longitude: {position[1].toFixed(6)}
          </p>
          <button
            onClick={() => {
              // Share location
              const url = `https://maps.google.com/?q=${position[0]},${position[1]}`;
              navigator.clipboard.writeText(url);
              alert('Lokasi disalin ke clipboard!');
            }}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition-colors"
          >
            <Navigation className="w-4 h-4" />
            Salin Lokasi
          </button>
        </div>
      </Popup>
    </Marker>
  );
}