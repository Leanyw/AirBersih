'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Shield,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { signIn, resetPassword } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Di dalam handleLogin function di login/page.tsx:
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn(email, password);

      if (result.error) {
        console.error('Login error:', result.error);
        
        let errorMessage = 'Login gagal';
        if (result.error.message?.includes('Invalid')) {
          errorMessage = 'Email atau password salah';
        } else if (result.error.message) {
          errorMessage = result.error.message;
        }
        
        toast.error(errorMessage);
        return;
      }

      toast.success('Login berhasil');
      // Tidak perlu router.push karena AuthProvider akan handle redirect otomatis
      
    } catch (error: any) {
      console.error('Unexpected login error:', error);
      toast.error('Terjadi kesalahan tak terduga');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return toast.error('Masukkan email');

    setIsLoading(true);
    try {
      const { error } = await resetPassword(resetEmail);
      if (error) throw error;

      setResetSent(true);
      toast.success('Link reset dikirim ke email');
    } catch {
      toast.error('Gagal mengirim reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* LEFT */}
      <div className="hidden md:flex bg-gradient-to-br from-blue-600 to-cyan-500 text-white px-12">
        <div className="max-w-md mx-auto flex flex-col justify-center">
          <div className="mb-10">
            <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Selamat Datang Kembali</h2>
            <p className="text-blue-100">
              Masuk untuk melanjutkan pemantauan kualitas air dan laporan wilayah Anda.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">Akses Aman</p>
              <p className="text-sm text-blue-100">
                Data Anda terlindungi dengan enkripsi
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex flex-col justify-center px-6 py-12 md:px-12 overflow-y-auto">
        <div className="max-w-md mx-auto w-full">
          {/* BACK TO LANDING */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Beranda
          </Link>

          {/* HEADER */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              <div className="bg-blue-600 p-3 rounded-2xl">
                <Lock className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              {isResetMode ? 'Reset Password' : 'Masuk ke Akun'}
            </h1>
            <p className="text-gray-600 mt-2">
              {isResetMode
                ? 'Masukkan email untuk reset password'
                : 'Gunakan email dan password Anda'}
            </p>
          </div>

          {/* RESET MODE */}
          {isResetMode ? (
            resetSent ? (
              <div className="text-center space-y-6">
                <CheckCircle className="w-14 h-14 text-green-600 mx-auto" />
                <p className="text-gray-700">
                  Link reset telah dikirim ke
                  <br />
                  <span className="font-semibold">{resetEmail}</span>
                </p>
                <button
                  onClick={() => {
                    setIsResetMode(false);
                    setResetSent(false);
                  }}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold"
                >
                  Kembali ke Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-6">
                <Input
                  label="Email"
                  value={resetEmail}
                  onChange={(e: any) => setResetEmail(e.target.value)}
                  icon={<Mail className="w-5 h-5" />}
                  type="email"
                />

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold"
                >
                  {isLoading ? 'Mengirim...' : 'Kirim Link Reset'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsResetMode(false)}
                  className="text-sm text-blue-600 hover:underline w-full"
                >
                  ← Kembali ke Login
                </button>
              </form>
            )
          ) : (
            /* LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-6">
              <Input
                label="Email"
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
                icon={<Mail className="w-5 h-5" />}
                type="email"
              />

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium">Password</label>
                  <button
                    type="button"
                    onClick={() => setIsResetMode(true)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Lupa password?
                  </button>
                </div>

                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3 rounded-xl font-semibold"
              >
                {isLoading ? 'Memproses...' : 'Masuk'}
              </button>

              <p className="text-center text-sm text-gray-600">
                Belum punya akun?{' '}
                <Link
                  href="/register"
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Daftar di sini
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== SMALL COMPONENT ===== */
function Input({ label, icon, ...props }: any) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
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
          } pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500`}
          required
        />
      </div>
    </div>
  );
}
