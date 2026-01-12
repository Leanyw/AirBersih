'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, MapPin, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface AddWaterSourceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  puskesmasId: string
  kecamatan: string
}

export default function AddWaterSourceModal({
  isOpen,
  onClose,
  onSuccess,
  puskesmasId,
  kecamatan
}: AddWaterSourceModalProps) {
  const [formData, setFormData] = useState({
    nama: '',
    jenis: 'sumur_bor',
    status: 'aman',
    category: 'aman',
    alamat: '',
    latitude: '',
    longitude: '',
    kapasitas: '',
    pengguna_terdaftar: 0,
    verification_notes: ''
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nama || !formData.alamat) {
      toast.error('Nama dan alamat harus diisi')
      return
    }

    setIsLoading(true)
    
    try {
      const { error } = await supabase
        .from('water_sources')
        .insert({
          ...formData,
          puskesmas_id: puskesmasId,
          kecamatan: kecamatan,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          verified: false,
          last_checked: new Date().toISOString(),
          created_at: new Date().toISOString()
        })

      if (error) throw error
      
      toast.success('Sumber air berhasil ditambahkan')
      onSuccess()
    } catch (error: any) {
      console.error('Error adding water source:', error)
      toast.error('Gagal menambahkan sumber air: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <MapPin className="size-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-800">Tambah Sumber Air Baru</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Sumber Air *
                </label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => setFormData({...formData, nama: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Contoh: Sumur Desa Sehat"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jenis Sumber *
                </label>
                <select
                  value={formData.jenis}
                  onChange={(e) => setFormData({...formData, jenis: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="sumur_bor">Sumur Bor</option>
                  <option value="sumur_gali">Sumur Gali</option>
                  <option value="pdam">PDAM</option>
                  <option value="mata_air">Mata Air</option>
                  <option value="sungai">Sungai</option>
                  <option value="air_hujan">Air Hujan</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status Keamanan *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="aman">Aman</option>
                  <option value="rawan">Rawan</option>
                  <option value="tidak_aman">Tidak Aman</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="aman">Aman</option>
                  <option value="terancam">Terancam</option>
                  <option value="berbahaya">Berbahaya</option>
                </select>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alamat Lengkap *
              </label>
              <textarea
                value={formData.alamat}
                onChange={(e) => setFormData({...formData, alamat: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="Contoh: Jl. Sehat No. 12, RT 02/RW 04, Desa Sejahtera"
                required
              />
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Latitude (Opsional)
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Contoh: -6.966667"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Longitude (Opsional)
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Contoh: 110.416667"
                />
              </div>
            </div>

            {/* Capacity & Users */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kapasitas
                </label>
                <input
                  type="text"
                  value={formData.kapasitas}
                  onChange={(e) => setFormData({...formData, kapasitas: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Contoh: 5000 L/hari"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah Pengguna Terdaftar
                </label>
                <input
                  type="number"
                  value={formData.pengguna_terdaftar}
                  onChange={(e) => setFormData({...formData, pengguna_terdaftar: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Verification Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catatan Verifikasi
              </label>
              <textarea
                value={formData.verification_notes}
                onChange={(e) => setFormData({...formData, verification_notes: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows={2}
                placeholder="Catatan tambahan untuk sumber air ini..."
              />
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800 font-medium">Informasi:</p>
                  <ul className="text-sm text-blue-700 mt-1 space-y-1">
                    <li>• Sumber air akan otomatis muncul di peta jika koordinat diisi</li>
                    <li>• Data sumber air akan terlihat oleh warga di wilayah yang sama</li>
                    <li>• Status dan kategori dapat diupdate nanti</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Menyimpan...' : 'Simpan Sumber Air'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50"
              >
                Batalkan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}