'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  Home,
  FlaskConical,
  Bell,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Building,
  Menu,
  X,
  FileText,
  MapPin,
  AlertTriangle,
  Mail,
  MapPin as MapPinIcon
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'

const navigation = [
  { name: 'Dashboard', href: '/puskesmas', icon: Home },
  { name: 'Analisis Lab', href: '/analisis-lab', icon: FlaskConical },
  { name: 'Laporan', href: '/laporanwarga', icon: FileText },
  { name: 'Notifikasi', href: '/notifikasipuskesmas', icon: Bell },
  { name: 'Statistik', href: '/statistik', icon: BarChart3 },
  { name: 'Sumber Air', href: '/sumber-airpuskesmas', icon: MapPin },
  { name: 'Data Warga', href: '/data-warga', icon: Users },
  { name: 'Pengaturan', href: '/pengaturan', icon: Settings },
]

export default function PuskesmasSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  
  
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile } = useAuth()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.replace('/')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsMobileOpen(false)
    }
  }

  const getInitials = () => {
    if (profile?.nama) {
      return profile.nama
        .split(' ')
        .map((word: string) => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    }
    return user?.email?.charAt(0).toUpperCase() || 'PK'
  }

  const getUserName = () => {
    return profile?.nama || 
           user?.user_metadata?.nama || 
           user?.email?.split('@')[0] || 
           'Petugas Puskesmas'
  }

  const getUserEmail = () => {
    return user?.email || 'email@example.com'
  }
  
  const getKecamatan = () => {
    // Prioritaskan dari profile (AuthProvider)
    if (profile?.kecamatan) {
     return profile.kecamatan
   }
   
    // Fallback berdasarkan email
    if (user?.email) {
      const email = user.email.toLowerCase()
      if (email.includes('timur')) return 'Semarang Timur'
      if (email.includes('barat')) return 'Semarang Barat'
      if (email.includes('tengah')) return 'Semarang Tengah'
      if (email.includes('selatan')) return 'Semarang Selatan'
      if (email.includes('utara')) return 'Semarang Utara'
    }

  
  // Coba dari user metadata
  if (user?.user_metadata?.kecamatan) {
    return user.user_metadata.kecamatan
  }
  
  
  // Default generic
  return 'Wilayah Puskesmas'
}

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <div className={`
        ${isCollapsed ? 'w-20' : 'w-64'} 
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        fixed lg:relative h-screen bg-gradient-to-br from-blue-500 to-cyan-400 text-white 
        flex flex-col transition-all duration-300 z-40
      `}>
        
        {/* Custom Scrollbar Style */}
        <style jsx>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 10px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.5);
          }
        `}</style>

      {/* Logo */}
      <div className="p-6 border-b border-blue-800">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="Logo AirBersih" 
              className="w-full h-full object-contain"
            />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold">PUSKESMAS</h1>
              <p className="text-xs text-white">Portal Air Bersih</p>
            </div>
          )}
        </div>
      </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href)
            
            return (
              <a
                key={item.name}
                href={item.href}
                className={`flex items-center ${
                  isCollapsed ? 'justify-center px-3' : 'px-4'
                } py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-[#1E5EFF] text-white shadow-lg'
                    : 'text-blue-100 hover:bg-[#2F6BFF] hover:text-white'
                }`}
                onClick={() => setIsMobileOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                {!isCollapsed && (
                  <span className="ml-3 font-medium">{item.name}</span>
                )}
              </a>
            )
          })}
        </nav>

        {/* User Profile - Simplified Version */}
        <div className={`p-4 pb-6 border-t border-blue-800 ${isCollapsed ? 'text-center' : ''}`}>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-[#1E5EFF] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
              {getInitials()}
            </div>
            
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" title={getUserName()}>
                  {getUserName()}
                </p>
                
                <div className="space-y-1 mt-1">
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-blue-300 flex-shrink-0" />
                    <p className="text-xs text-white truncate" title={getUserEmail()}>
                      {getUserEmail()}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <MapPinIcon className="w-3 h-3 text-blue-300 flex-shrink-0" />
                    <p className="text-xs text-white truncate" title={getKecamatan()}>
                      {getKecamatan()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Logout Button */}
          <div>
            {!isCollapsed ? (
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-br from-blue-50 to-white hover:from-red-700 hover:to-red-800 text-red-800 hover:text-white py-2.5 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-semibold">Keluar</span>
              </button>
            ) : (
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center text-blue-300 hover:text-white py-2.5 rounded-lg hover:bg-blue-800 transition-colors"
                title="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 bg-white border border-gray-300 rounded-full p-1 shadow-lg hover:shadow-xl hidden lg:block"
        >
          <div className="w-4 h-4 text-gray-600 flex items-center justify-center">
            {isCollapsed ? '→' : '←'}
          </div>
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}