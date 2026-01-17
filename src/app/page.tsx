'use client';

import Link from 'next/link';
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider';
import {
  Droplets,
  AlertCircle,
  MapPin,
  TrendingUp,
  Shield,
  Bell,
  ChevronRight,
} from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* ===== NAVBAR ===== */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Logo AirBersih"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <p className="font-bold text-lg">AirBersih</p>
              <p className="text-xs text-gray-500">
                Monitoring Air Daerah 3T
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition shadow"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition shadow"
                >
                  Daftar
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        {/* background blur */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl" />
        <div className="absolute top-40 -left-24 w-96 h-96 bg-cyan-200/40 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6 py-28 grid lg:grid-cols-2 gap-14 items-center">
          {/* LEFT */}
          <div>
            <span className="inline-block mb-4 px-4 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
              🌍 Untuk Daerah 3T
            </span>

            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              Monitoring Kualitas Air
              <span className="block text-blue-600">
                untuk Masyarakat
              </span>
            </h1>

            <p className="text-gray-600 text-lg mb-10 max-w-xl">
              Laporkan masalah air, pantau kualitas secara real-time,
              dan temukan sumber air aman di wilayah Anda.
            </p>

            <div className="flex gap-4">
              <Link
                href={user ? '/dashboard' : '/register'}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition flex items-center gap-2"
              >
                Mulai Sekarang
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="border border-gray-300 px-8 py-3 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Masuk
              </Link>
            </div>
          </div>

          {/* RIGHT CARD */}
          <div className="bg-white/80 backdrop-blur rounded-3xl border border-gray-200 shadow-xl p-8 grid grid-cols-2 gap-6">
            <Feature icon={AlertCircle} title="Lapor Cepat" desc="Foto & deskripsi langsung" />
            <Feature icon={MapPin} title="Peta Air" desc="Sumber aman terdekat" />
            <Feature icon={TrendingUp} title="Real-time" desc="Status selalu update" />
            <Feature icon={Shield} title="Analisis" desc="Data wilayah & tren" />
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="relative py-32 overflow-hidden">
        {/* background */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-blue-50 to-white" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-200/30 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6">
          {/* heading */}
          <div className="text-center max-w-2xl mx-auto mb-20">
            <span className="inline-block mb-4 px-4 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
              ✨ Fitur Unggulan
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Semua yang Anda Butuhkan
            </h2>
            <p className="text-gray-600 text-lg">
              Dirancang khusus untuk memantau, melaporkan, dan melindungi
              kualitas air di wilayah Anda.
            </p>
          </div>

          {/* cards */}
          <div className="grid md:grid-cols-3 gap-10">
            <FeatureBigFancy
              icon={AlertCircle}
              title="Pelaporan Masalah"
              desc="Laporkan kondisi air tercemar dengan foto dan deskripsi langsung dari lokasi."
            />
            <FeatureBigFancy
              icon={Bell}
              title="Notifikasi Real-time"
              desc="Dapatkan peringatan dan update status laporan secara instan."
              highlight
            />
            <FeatureBigFancy
              icon={Shield}
              title="Analisis Data"
              desc="Pantau kualitas air wilayah Anda melalui data dan tren terverifikasi."
            />
          </div>
        </div>
      </section>


      {/* ===== FOOTER ===== */}
      <footer className="border-t border-gray-200 py-10 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} AirBersih — Untuk Masyarakat 3T
        </div>
      </footer>
    </main>
  );
}

/* ===== COMPONENTS ===== */
function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl hover:bg-blue-50 transition">
      <Icon className="w-6 h-6 text-blue-600" />
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-gray-600">{desc}</p>
    </div>
  );
}

function FeatureBig({
  icon: Icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <div className="border border-gray-200 bg-white rounded-2xl p-7 hover:shadow-lg transition">
      <Icon className="w-7 h-7 text-blue-600 mb-4" />
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{desc}</p>
    </div>
  );
}

function FeatureBigFancy({
  icon: Icon,
  title,
  desc,
  highlight = false,
}: {
  icon: any;
  title: string;
  desc: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative rounded-3xl p-8 transition
        ${
          highlight
            ? 'bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-2xl scale-105'
            : 'bg-white border border-gray-200 hover:shadow-xl'
        }`}
    >
      <div
        className={`w-14 h-14 flex items-center justify-center rounded-2xl mb-6
          ${
            highlight
              ? 'bg-white/20'
              : 'bg-blue-100'
          }`}
      >
        <Icon
          className={`w-7 h-7 ${
            highlight ? 'text-white' : 'text-blue-600'
          }`}
        />
      </div>

      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p
        className={`text-sm leading-relaxed ${
          highlight ? 'text-blue-100' : 'text-gray-600'
        }`}
      >
        {desc}
      </p>
    </div>
  );
}
