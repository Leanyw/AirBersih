"use client";

import { useState, useEffect } from "react";
import { Search, Bell, HelpCircle, ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";

export default function AdminHeader() {
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const { user, profile } = useAuth();

  const getPageTitle = () => {
    const paths: Record<string, string> = {
      "/admin": "Dashboard Admin",
      "/admin/analisis-lab": "Analisis Laboratorium",
      "/admin/data-warga": "Data Warga",
      "/admin/data-puskesmas": "Data Puskesmas",
      "/admin/sumber-air": "Sumber Air",
      "/admin/laporan": "Laporan",
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
      "Dinas Kesehatan"
    );
  };

  const getUserRole = () => {
    return profile?.role === "puskesmas"
      ? "Petugas Puskesmas"
      : "Dinas Kesehatan";
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{getPageTitle()}</h1>
        </div>
      </div>
    </header>
  );
}
