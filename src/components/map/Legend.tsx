'use client';

import { CheckCircle, AlertTriangle, XCircle, Navigation } from 'lucide-react';

export default function MapLegend() {
  return (
    <div className="leaflet-bottom leaflet-left">
      <div className="leaflet-control leaflet-bar bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4">
        <h4 className="font-bold text-gray-800 text-sm mb-2">Legenda Peta</h4>
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
          <div className="flex items-center gap-2 mt-3">
            <Navigation className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-700">Lokasi Anda</span>
          </div>
        </div>
      </div>
    </div>
  );
}