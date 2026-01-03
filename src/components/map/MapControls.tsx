'use client';

import { useMap } from 'react-leaflet';
import { Navigation, RefreshCw, ZoomIn, ZoomOut, Layers } from 'lucide-react';

interface MapControlsProps {
  onLocateMe: () => void;
  onRefresh: () => void;
  userLocationAvailable: boolean;
}

export default function MapControls({ 
  onLocateMe, 
  onRefresh,
  userLocationAvailable 
}: MapControlsProps) {
  const map = useMap();

  const handleZoomIn = () => {
    map.zoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
  };

  const handleResetView = () => {
    map.setView([-6.9667, 110.4167], 13);
  };

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
          onClick={onLocateMe}
          className={`flex items-center justify-center w-10 h-10 hover:bg-gray-100 border-b border-gray-200 ${
            !userLocationAvailable ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          title="Lokasi saya"
          disabled={!userLocationAvailable}
        >
          <Navigation className="w-4 h-4 text-blue-600" />
        </button>
        
        <button
          onClick={handleZoomIn}
          className="flex items-center justify-center w-10 h-10 hover:bg-gray-100 border-b border-gray-200"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4 text-gray-700" />
        </button>
        
        <button
          onClick={handleZoomOut}
          className="flex items-center justify-center w-10 h-10 hover:bg-gray-100"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4 text-gray-700" />
        </button>
      </div>
      
      {/* Layer Control */}
      <div className="leaflet-control leaflet-bar bg-white rounded-lg shadow-lg mt-2">
        <button
          onClick={handleResetView}
          className="flex items-center justify-center w-10 h-10 hover:bg-gray-100"
          title="Reset view"
        >
          <Layers className="w-4 h-4 text-gray-700" />
        </button>
      </div>
    </div>
  );
}