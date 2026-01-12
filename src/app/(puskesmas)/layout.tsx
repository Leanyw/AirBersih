import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'
import { AuthProvider } from '@/providers/AuthProvider'
import { Toaster } from 'react-hot-toast'
import PuskesmasSidebar from '@/components/puskesmas/PuskesmasSidebar'
import PuskesmasHeader from '@/components/puskesmas/PuskesmasHeader'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Dashboard Puskesmas - Air Bersih',
  description: 'Sistem monitoring kualitas air untuk puskesmas',
}

export default function PuskesmasLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Toaster position="top-right" />
      <AuthProvider>
        <div className="flex h-screen">
          <PuskesmasSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <PuskesmasHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
              {children}
            </main>
            <footer className="bg-white border-t border-gray-200 py-3 px-6">
              <p className="text-sm text-gray-600 text-center">
                Puskesmas Dashboard • © 2024 Air Bersih
              </p>
            </footer>
          </div>
        </div>
      </AuthProvider>
    </>
  )
}