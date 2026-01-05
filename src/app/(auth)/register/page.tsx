'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  User,
  Mail,
  Phone,
  MapPin,
  Home,
  Key,
  Shield,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const KECAMATAN_LIST = [
  'Semarang Barat',
  'Semarang Timur',
  'Semarang Utara',
  'Semarang Selatan',
  'Semarang Tengah',
];

export default function RegisterPage() {
  const { signUp } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nama: '',
    nik: '',
    phone: '',
    kecamatan: '',
    kelurahan: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.nama.trim()) errors.nama = 'Nama wajib diisi';
    if (!formData.nik.trim()) errors.nik = 'NIK wajib diisi';
    else if (formData.nik.length !== 16) errors.nik = 'NIK harus 16 digit';
    
    if (!formData.email.trim()) errors.email = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Email tidak valid';
    
    if (!formData.phone.trim()) errors.phone = 'Nomor HP wajib diisi';
    else if (formData.phone.length < 10) errors.phone = 'Nomor HP minimal 10 digit';
    
    if (!formData.kecamatan) errors.kecamatan = 'Pilih kecamatan';
    if (!formData.kelurahan.trim()) errors.kelurahan = 'Kelurahan wajib diisi';
    
    if (!formData.password) errors.password = 'Password wajib diisi';
    else if (formData.password.length < 6) errors.password = 'Password minimal 6 karakter';
    
    if (!formData.confirmPassword) errors.confirmPassword = 'Konfirmasi password wajib diisi';
    else if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Password tidak sama';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 ========== REGISTER FORM SUBMIT ==========');
    console.log('📋 Form data:', formData);
    
    if (!validateForm()) {
      toast.error('Harap perbaiki kesalahan form terlebih dahulu');
      return;
    }
  
    setIsLoading(true);
  
    try {
      console.log('📤 Calling signUp function...');
      const result = await signUp({
        email: formData.email,
        password: formData.password,
        nama: formData.nama,
        nik: formData.nik,
        phone: formData.phone,
        kecamatan: formData.kecamatan,
        kelurahan: formData.kelurahan,
      });
      
      console.log('📥 Signup result:', result);
      
      if (result.error) {
        // Tampilkan error yang lebih spesifik
        let errorMessage = 'Pendaftaran gagal';
        
        if (result.error.message?.includes('already registered')) {
          errorMessage = 'Email sudah terdaftar';
        } else if (result.error.code === '23505') {
          errorMessage = 'Email atau NIK sudah terdaftar';
        } else if (result.error.message) {
          errorMessage = result.error.message;
        }
        
        console.error('❌ Signup error details:', result.error);
        toast.error(errorMessage);
        return;
      }
      
      toast.success('🎉 Pendaftaran berhasil!');
      console.log('✅ Registration successful! Redirecting...');
      
      // Auto redirect ke dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ Unexpected error:', error);
      toast.error('Terjadi kesalahan tak terduga. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="
      h-screen grid md:grid-cols-2 overflow-hidden
      bg-gradient-to-br from-blue-50 via-white to-cyan-50
    ">
      {/* LEFT — INFO (STICKY / NO SCROLL) */}
      <div className="
        hidden md:flex
        h-screen
        sticky top-0
        bg-gradient-to-br from-blue-600 to-cyan-500
        text-white px-12
      ">
        <div className="max-w-md mx-auto flex flex-col justify-center">
          <div className="mb-10">
            <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
              <User className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold mb-4">
              Bergabung dengan Komunitas
            </h2>
            <p className="text-blue-100">
              Daftarkan diri Anda untuk melindungi keluarga dari air
              terkontaminasi dan menciptakan lingkungan lebih sehat.
            </p>
          </div>
  
          <div className="space-y-4">
            <InfoItem
              icon={<Shield className="w-5 h-5" />}
              title="Data Terlindungi"
              desc="Informasi pribadi Anda aman"
            />
            <InfoItem
              icon={<MapPin className="w-5 h-5" />}
              title="Layanan Lokal"
              desc="Puskesmas terdekat akan merespon"
            />
            <InfoItem
              icon={<Phone className="w-5 h-5" />}
              title="Notifikasi Real-time"
              desc="Update status laporan langsung"
            />
          </div>
        </div>
      </div>
  
      {/* RIGHT — FORM (SCROLLABLE ONLY HERE) */}
      <div className="
        flex flex-col
        px-6 py-12 md:px-12
        overflow-y-auto
      ">
        <div className="max-w-xl mx-auto w-full">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-800">
              Daftar Akun Warga
            </h1>
            <p className="text-gray-600 mt-2">
              Isi data diri dengan lengkap dan valid
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-5">
              <Input
                label="Nama Lengkap"
                name="nama"
                value={formData.nama}
                onChange={handleChange}
                icon={<User className="w-5 h-5" />}
                placeholder="Nama lengkap"
                full
                error={formErrors.nama}
              />

              <Input
                label="NIK"
                name="nik"
                value={formData.nik}
                onChange={handleChange}
                placeholder="16 digit"
                maxLength={16}
                error={formErrors.nik}
              />

              <Input
                label="Email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                icon={<Mail className="w-5 h-5" />}
                type="email"
                placeholder="email@contoh.com"
                error={formErrors.email}
              />

              <Input
                label="No. HP"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                icon={<Phone className="w-5 h-5" />}
                placeholder="08xxxxxxxxxx"
                error={formErrors.phone}
              />

              <Select
                label="Kecamatan"
                name="kecamatan"
                value={formData.kecamatan}
                onChange={handleChange}
                options={KECAMATAN_LIST}
                error={formErrors.kecamatan}
              />

              <Input
                label="Kelurahan"
                name="kelurahan"
                value={formData.kelurahan}
                onChange={handleChange}
                icon={<Home className="w-5 h-5" />}
                placeholder="Kelurahan"
                full
                error={formErrors.kelurahan}
              />

              <PasswordInput
                label="Password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                show={showPassword}
                setShow={setShowPassword}
                error={formErrors.password}
              />

              <PasswordInput
                label="Konfirmasi Password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                show={showConfirmPassword}
                setShow={setShowConfirmPassword}
                error={formErrors.confirmPassword}
              />
            </div>

            {/* Debug Info */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-yellow-800 font-medium">Info Penting:</p>
                  <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                    <li>• NIK harus 16 digit angka</li>
                    <li>• Pastikan email belum pernah terdaftar</li>
                    <li>• Pilih kecamatan yang sesuai dengan domisili</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Mendaftarkan...
                </>
              ) : (
                'Daftar Sekarang'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Sudah punya akun?{' '}
            <Link
              href="/login"
              className="text-blue-600 font-semibold hover:underline"
            >
              Login di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ===== SMALL COMPONENTS ===== */

function InfoItem({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="bg-white/20 p-2 rounded-lg">{icon}</div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-blue-100">{desc}</p>
      </div>
    </div>
  );
}

function Input({
  label,
  icon,
  full,
  error,
  ...props
}: any) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="block text-sm font-medium mb-2">{label} *</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          {...props}
          className={`w-full ${
            icon ? 'pl-10' : 'pl-4'
          } pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
          required
        />
        {error && (
          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {error}
          </p>
        )}
      </div>
    </div>
  );
}

function Select({ label, options, error, ...props }: any) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label} *</label>
      <select
        {...props}
        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 bg-white ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300'
        }`}
        required
      >
        <option value="">Pilih Kecamatan</option>
        {options.map((o: string) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      {error && (
        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}

function PasswordInput({
  label,
  show,
  setShow,
  error,
  ...props
}: any) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label} *</label>
      <div className="relative">
        <input
          {...props}
          type={show ? 'text' : 'password'}
          className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
          required
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Key className="w-5 h-5" />
        </div>
      </div>
      {error && (
        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}