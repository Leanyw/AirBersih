'use client'

import { Report } from '@/types/puskesmas'
import {
  User,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Eye
} from 'lucide-react'

interface ReportListProps {
  reports: Report[]
  onUpdateStatus: (reportId: string, status: 'pending' | 'processing' | 'completed' | 'rejected') => void
}

export default function ReportList({ reports, onUpdateStatus }: ReportListProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'processing':
        return <AlertTriangle className="w-5 h-5 text-blue-500" />
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'rejected':
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      default:
        return null
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-4">
      {reports.map(report => (
        <div
          key={report.id}
          className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">{report.userName}</h3>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-1" />
                  {report.location}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(report.priority)}`}>
                {report.priority === 'high' ? 'Tinggi' : 
                 report.priority === 'medium' ? 'Sedang' : 'Rendah'}
              </span>
              {getStatusIcon(report.status)}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-gray-700 mb-2 line-clamp-2">{report.description}</p>
            {report.photoUrl && (
              <div className="mt-2">
                <img
                  src={report.photoUrl}
                  alt="Foto laporan"
                  className="w-32 h-32 object-cover rounded-lg"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-500">
              <Calendar className="w-4 h-4 mr-1" />
              {new Date(report.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </div>

            <div className="flex space-x-2">
              <select
                value={report.status}
                onChange={(e) => onUpdateStatus(report.id, e.target.value as any)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pending">Menunggu</option>
                <option value="processing">Diproses</option>
                <option value="completed">Selesai</option>
                <option value="rejected">Ditolak</option>
              </select>
              
              <button
                onClick={() => window.location.href = `/puskesmas/analisis-lab?report=${report.id}`}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
              >
                <Eye className="w-4 h-4" />
                Lihat
              </button>
            </div>
          </div>

          {/* Water Quality Indicators */}
          {report.waterQuality && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600">Bau</div>
                  <div className={`font-medium ${
                    report.waterQuality.smell === 'tidak_berbau' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {report.waterQuality.smell === 'tidak_berbau' ? 'Normal' : 'Abnormal'}
                  </div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600">Warna</div>
                  <div className={`font-medium ${
                    report.waterQuality.color === 'jernih' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {report.waterQuality.color === 'jernih' ? 'Jernih' : 'Keruh'}
                  </div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600">Rasa</div>
                  <div className={`font-medium ${
                    report.waterQuality.taste === 'normal' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {report.waterQuality.taste === 'normal' ? 'Normal' : 'Abnormal'}
                  </div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600">Suhu</div>
                  <div className="font-medium text-blue-600">
                    {report.waterQuality.temperature}°C
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}