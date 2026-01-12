'use client'

import { Report } from '@/types/puskesmas'
import {
  User,
  Phone,
  Home,
  Calendar,
  MapPin,
  FileText,
  Image as ImageIcon,
  Download,
  Send,
  Printer
} from 'lucide-react'

interface ReportDetailProps {
  report: Report
}

export default function ReportDetail({ report }: ReportDetailProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Detail Laporan</h2>
          <p className="text-gray-600">ID: {report.id}</p>
        </div>
        <span className={`px-4 py-2 rounded-full font-medium ${
          report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          report.status === 'processing' ? 'bg-blue-100 text-blue-800' :
          report.status === 'completed' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {report.status === 'pending' ? 'Menunggu' :
           report.status === 'processing' ? 'Diproses' :
           report.status === 'completed' ? 'Selesai' : 'Ditolak'}
        </span>
      </div>

      {/* User Information */}
      <div className="bg-blue-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <User className="w-5 h-5 mr-2" />
          Informasi Pelapor
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">{report.userName}</p>
              <p className="text-sm text-gray-600">Warga</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center text-gray-700">
              <Phone className="w-5 h-5 mr-2 text-gray-500" />
              <span>{report.userPhone || 'Tidak tersedia'}</span>
            </div>
            <div className="flex items-center text-gray-700">
              <Home className="w-5 h-5 mr-2 text-gray-500" />
              <span>RT {report.userRT || 'XX'}/RW {report.userRW || 'XX'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Report Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Location */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Lokasi Laporan
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Alamat Lengkap</p>
                <p className="font-medium">{report.location}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Koordinat</p>
                  <p className="font-medium">{report.coordinates || 'Tidak tersedia'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Jarak dari Puskesmas</p>
                  <p className="font-medium">{report.distance || 'Tidak tersedia'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Timeline
            </h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="w-3 h-3 bg-blue-600 rounded-full mt-2 mr-3"></div>
                <div>
                  <p className="font-medium">Laporan dibuat</p>
                  <p className="text-sm text-gray-600">
                    {new Date(report.createdAt).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
              {report.updatedAt && (
                <div className="flex items-start">
                  <div className="w-3 h-3 bg-green-600 rounded-full mt-2 mr-3"></div>
                  <div>
                    <p className="font-medium">Status diperbarui</p>
                    <p className="text-sm text-gray-600">
                      {new Date(report.updatedAt).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              )}
              {report.completedAt && (
                <div className="flex items-start">
                  <div className="w-3 h-3 bg-purple-600 rounded-full mt-2 mr-3"></div>
                  <div>
                    <p className="font-medium">Laporan selesai</p>
                    <p className="text-sm text-gray-600">
                      {new Date(report.completedAt).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Description */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Deskripsi Laporan
            </h3>
            <p className="text-gray-700 whitespace-pre-line">
              {report.description}
            </p>
            
            {/* Water Quality Summary */}
            {report.waterQuality && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">Kondisi Air Dilaporkan:</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Bau: {report.waterQuality.smell}</li>
                  <li>• Rasa: {report.waterQuality.taste}</li>
                  <li>• Warna: {report.waterQuality.color}</li>
                  <li>• Suhu: {report.waterQuality.temperature}°C</li>
                </ul>
              </div>
            )}
          </div>

          {/* Photos */}
          {report.photoUrl && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <ImageIcon className="w-5 h-5 mr-2" />
                Foto Pendukung
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <img
                    src={report.photoUrl}
                    alt="Foto laporan"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    Foto utama
                  </div>
                </div>
                {report.additionalPhotos && report.additionalPhotos.length > 0 && 
                  report.additionalPhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photo}
                        alt={`Foto tambahan ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-4 pt-6 border-t border-gray-200">
        <button className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Download className="w-4 h-4" />
          Unduh Laporan (PDF)
        </button>
        <button className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center gap-2">
          <Send className="w-4 h-4" />
          Kirim Hasil ke Warga
        </button>
        <button className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition-colors flex items-center gap-2">
          <Printer className="w-4 h-4" />
          Print
        </button>
      </div>
    </div>
  )
}