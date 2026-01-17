"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Shield,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { supabase, getUserProfile } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset password state
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  // handleLogin function
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Langsung login tanpa cek session dulu
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setError(error.message);
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      console.log("Login successful:", data.user?.email);
      toast.success("Login berhasil!");

      // 🔥 FIX: Tunggu 2 detik untuk pastikan session fully sync
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message);
      toast.error(err.message);
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setError("Masukkan email untuk reset password");
      toast.error("Masukkan email untuk reset password");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      console.error("Reset password error:", error);
      setError(error.message);
      toast.error(error.message || "Gagal mengirim reset password");
      setIsLoading(false);
      return;
    }

    setResetSent(true);
    toast.success("Link reset password telah dikirim ke email Anda");
    setIsLoading(false);
  };

  const toggleResetMode = () => {
    setIsResetMode(!isResetMode);
    setResetEmail("");
    setResetSent(false);
    setError("");
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* LEFT - Sidebar */}
      <div className="hidden md:flex bg-gradient-to-t from-blue-600 to-cyan-500 text-white px-12">
        <div className="max-w-md mx-auto flex flex-col justify-center">
          <div className="mb-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
              <div className="w-20 h-20 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="Logo AirBersih"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-4">
              Sistem Monitoring Air Bersih
            </h2>
            <p className="text-blue-100">
              Masuk untuk melanjutkan pemantauan kualitas air dan laporan
              wilayah Anda.
            </p>
          </div>

          <div className="space-y-4">
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

            {/* Demo Account Info */}
            <div className="mt-6 p-4 bg-white/10 rounded-xl">
              <h4 className="text-sm font-semibold mb-2">Demo Akun:</h4>
              <div className="space-y-1 text-sm text-blue-100 font-semibold">
                <p>• Puskesmas: puskesmas.semarangbarat@example.com</p>
                <p>• Warga: warga@example.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT - Login Form */}
      <div className="flex flex-col justify-center px-6 py-12 md:px-12 overflow-y-auto">
        <div className="max-w-md mx-auto w-full">
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Beranda
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-400 p-3 rounded-2xl">
                <Lock className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              {isResetMode ? "Reset Password" : "Masuk ke Akun"}
            </h1>
            <p className="text-gray-600 mt-2">
              {isResetMode
                ? "Masukkan email untuk reset password"
                : "Gunakan email dan password Anda"}
            </p>
          </div>

          {/* Error Message */}
          {error && !isResetMode && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* RESET PASSWORD MODE */}
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
                  onClick={toggleResetMode}
                  className="w-full bg-gradient-to-r from-blue-600 to-teal-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-teal-700 transition-all duration-300"
                >
                  Kembali ke Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="email@contoh.com"
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Mengirim...
                    </div>
                  ) : (
                    "Kirim Link Reset"
                  )}
                </button>

                <button
                  type="button"
                  onClick={toggleResetMode}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium w-full text-center"
                >
                  ← Kembali ke Login
                </button>
              </form>
            )
          ) : (
            /* LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@contoh.com"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={toggleResetMode}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Lupa password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Ingat saya</span>
                </label>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Memproses...
                  </div>
                ) : (
                  "Masuk"
                )}
              </button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">
                    atau lanjutkan dengan
                  </span>
                </div>
              </div>

              {/* Register Link */}
              <div className="text-center">
                <p className="text-gray-600">
                  Belum punya akun?{" "}
                  <Link
                    href="/register"
                    className="text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Daftar sekarang
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
