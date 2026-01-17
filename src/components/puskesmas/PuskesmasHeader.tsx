"use client";

import { useState, useEffect } from "react";
import { Search, Bell, HelpCircle, ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";

export default function PuskesmasHeader() {
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const { user, profile } = useAuth();

  // Fetch notifikasi yang belum dibaca
  useEffect(() => {
    if (!user?.id) return;

    fetchUnreadNotifications();

    // Subscribe ke realtime untuk update notifikasi
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `puskesmas_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUnreadNotifications = async () => {
    try {
      const { data, error, count } = await supabase
        .from("notifications")
        .select("*", { count: "exact" })
        .eq("puskesmas_id", user?.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setUnreadCount(count || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const getPageTitle = () => {
    const paths: Record<string, string> = {
      "/puskesmas": "Dashboard Puskesmas",
      "/analisis-lab": "Analisis Laboratorium",
      "/notifikasi": "Sistem Notifikasi",
      "/statistik": "Statistik",
      "/data-warga": "Data Warga",
      "/sumber-air": "Sumber Air",
      "/laporan": "Laporan",
      "/pengaturan": "Pengaturan",
    };

    for (const [path, title] of Object.entries(paths)) {
      if (pathname?.startsWith(path)) {
        return title;
      }
    }

    return "Dashboard";
  };

  const getInitials = () => {
    if (profile?.nama) {
      return profile.nama
        .split(" ")
        .map((word: string) => word[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || "PK";
  };

  const getUserName = () => {
    return (
      profile?.nama ||
      user?.user_metadata?.nama ||
      user?.email?.split("@")[0] ||
      "Petugas Puskesmas"
    );
  };

  const getUserRole = () => {
    return profile?.role === "puskesmas" ? "Petugas Puskesmas" : "Staff";
  };

  const handleNotificationClick = () => {
    // Navigasi ke halaman notifikasi
    router.push("/notifikasipuskesmas");
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{getPageTitle()}</h1>
          <p className="text-gray-600 text-sm">
            {profile?.nama || "Puskesmas"}
          </p>
        </div>

        {/* Right side actions */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          {/* Notifications & User */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={handleNotificationClick}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="font-semibold text-gray-800">{getUserName()}</p>
                <p className="text-xs text-gray-600">{getUserRole()}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold">
                  {getInitials()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
