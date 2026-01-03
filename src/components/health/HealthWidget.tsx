'use client';

import { useState } from 'react';
import { Heart, Thermometer, Droplet, AlertTriangle } from 'lucide-react';

export default function HealthWidget() {
  const [diseases] = useState([
    { name: 'Diare', cases: 125, trend: 'up' },
    { name: 'Kolera', cases: 12, trend: 'stable' },
    { name: 'Hepatitis A', cases: 28, trend: 'down' },
    { name: 'Tipus', cases: 45, trend: 'up' },
  ]);

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold text-gray-800">Data Kesehatan</h2>
        </div>
        <p className="text-sm text-gray-600 mt-1">Penyakit terkait air di wilayah Semarang Barat</p>
      </div>
      
      <div className="p-4">
        <div className="space-y-4">
          {diseases.map((disease) => (
            <div key={disease.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <Thermometer className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">{disease.name}</h3>
                  <p className="text-xs text-gray-600">{disease.cases} kasus bulan ini</p>
                </div>
              </div>
              <div className={`flex items-center gap-1 ${
                disease.trend === 'up' ? 'text-red-600' :
                disease.trend === 'down' ? 'text-green-600' :
                'text-yellow-600'
              }`}>
                {disease.trend === 'up' ? '📈' : disease.trend === 'down' ? '📉' : '➡️'}
                <span className="text-sm font-medium">
                  {disease.trend === 'up' ? 'Naik' : disease.trend === 'down' ? 'Turun' : 'Stabil'}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">Tips Pencegahan</h4>
              <ul className="text-xs text-blue-700 mt-1 space-y-1">
                <li>• Rebus air sampai mendidih (100°C)</li>
                <li>• Simpan air dalam wadah tertutup</li>
                <li>• Cuci tangan sebelum makan</li>
                <li>• Gunakan filter air jika perlu</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}