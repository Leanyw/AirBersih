"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
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
  MapPin as MapPinIcon,
  ChessQueen,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: Home },
  { name: "Analisis Lab", href: "/admin/analisis-lab", icon: FlaskConical },
  { name: "Laporan", href: "/admin/laporan-warga", icon: FileText },
  { name: "Sumber Air", href: "/admin/sumber-air", icon: MapPin },
  { name: "Data Warga", href: "/admin/data-warga", icon: Users },
  { name: "Data Puskesmas", href: "/admin/data-puskesmas", icon: Users },
];

export default function AdminSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        {isMobileOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* Sidebar */}
      <div
        className={`
        ${isCollapsed ? "w-20" : "w-64"} 
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        fixed lg:relative h-screen bg-gradient-to-br from-blue-500 to-cyan-400 text-white 
        flex flex-col transition-all duration-300 z-40
      `}>
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
                <h1 className="text-xl font-bold">DinKes</h1>
                <p className="text-xs text-white">Portal Air Bersih</p>
              </div>
            )}
          </div>
        </div>
      
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;

            return (
              <a
                key={item.name}
                href={item.href}
                className={`flex items-center ${
                  isCollapsed ? "justify-center px-3" : "px-4"
                } py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-[#1E5EFF] text-white shadow-lg"
                    : "text-blue-100 hover:bg-[#2F6BFF] hover:text-white"
                }`}
                onClick={() => setIsMobileOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                {!isCollapsed && (
                  <span className="ml-3 font-medium">{item.name}</span>
                )}
              </a>
            );
          })}
        </nav>

        {/* User Profile - Simplified Version */}
        <div
          className={`p-4 border-t border-blue-800 ${
            isCollapsed ? "text-center" : ""
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#1E5EFF] rounded-full flex items-center justify-center text-white font-bold">
              Admin
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" title="Admin">
                  Admin
                </p>

                <div className="space-y-1 mt-1">
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-blue-300" />
                    <p className="text-xs text-white truncate" title="Admin">
                      Admin
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <div className="mt-4">
            {!isCollapsed ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 text-red-300 hover:text-white py-2 rounded-lg hover:bg-red-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Keluar</span>
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center text-blue-300 hover:text-white py-2 rounded-lg hover:bg-blue-800 transition-colors"
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
            {isCollapsed ? "→" : "←"}
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
  );
}
