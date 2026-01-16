'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  AlertTriangle,
  MapPin,
  BookOpen,
  Heart,
  User,
  Menu,
  X,
  Droplets,
  Bell,
  LogOut,
  FileText,
  Map,
  Info,
  Shield,
  Settings
} from 'lucide-react';

export default function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  // Menu Navigation yang lengkap
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Lapor Masalah', href: '/lapor', icon: AlertTriangle },
    { name: 'Sumber Air Aman', href: '/sumber-air', icon: MapPin },
    { name: 'Panduan & Tutorial', href: '/panduan', icon: BookOpen },
    { name: 'Info Penyakit', href: '/penyakit', icon: Heart },
    { name: 'Notifikasi', href: '/notifikasi', icon: Bell },
    { name: 'Status Laporan', href: '/laporan', icon: FileText },
    { name: 'Peta Interaktif', href: '/peta', icon: Map },
    { name: 'Info Kesehatan', href: '/kesehatan', icon: Info },
    { name: 'Info Keamanan Air', href: '/info-keamanan', icon: Shield },
    { name: 'Profil Saya', href: '/profile', icon: User },
    { name: 'Pengaturan', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          {sidebarOpen ? (
            <X className="w-6 h-6 text-gray-700" />
          ) : (
            <Menu className="w-6 h-6 text-gray-700" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:inset-auto lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 flex items-center justify-center">
                <img 
                  src="/logo.png" 
                  alt="Logo AirBersih" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Air Bersih</h1>
                <p className="text-sm text-gray-600">Dashboard Warga</p>
              </div>
            </div>
          </div>

          {/* User info */}
          {user && (
            <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-cyan-50">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user.user_metadata?.nama || user.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    {user.email || 'user@example.com'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Menu */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Menu Utama
              </p>
              {navigation.slice(0, 6).map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200
                      ${isActive 
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' 
                        : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                    <span className="font-medium text-sm">{item.name}</span>
                    {item.name === 'Notifikasi'}
                  </Link>
                );
              })}
            </div>

            <div className="px-3 py-2 mt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Layanan Tambahan
              </p>
              {navigation.slice(6, 10).map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200
                      ${isActive 
                        ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{item.name}</span>
                  </Link>
                );
              })}
            </div>

            <div className="px-3 py-2 mt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Akun & Pengaturan
              </p>
              {navigation.slice(10).map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200
                      ${isActive 
                        ? 'bg-gray-100 text-gray-900' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Quick Stats */}
          <div className="p-4 border-t border-gray-200">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">Laporan Aktif</span>
                <span className="text-xs font-bold text-blue-600">3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">Status Air</span>
                <span className="text-xs font-bold text-green-600">Aman</span>
              </div>
            </div>
          </div>

          {/* Logout button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors duration-200 font-medium border border-red-200 hover:border-red-300"
            >
              <LogOut className="w-5 h-5" />
              Keluar Akun
            </button>
          </div>

          {/* Version info */}
          <div className="px-4 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Air Bersih v1.0 • {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>

      {/* Close sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}