import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";
import React from "react";
import { Toaster } from "react-hot-toast";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Toaster position="top-right" />
      <div>
        <div className="flex h-screen">
          <AdminSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <AdminHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
              {children}
            </main>
            <footer className="bg-white border-t border-gray-200 py-3 px-6">
              <p className="text-sm text-gray-600 text-center">
                Admin Dashboard • © 2026 Air Bersih
              </p>
            </footer>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminLayout;
