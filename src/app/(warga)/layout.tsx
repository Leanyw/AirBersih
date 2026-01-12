import type { Metadata } from 'next';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Dashboard Warga - Air Bersih',
  description: 'Dashboard untuk warga dalam memantau kualitas air',
};

export default function WargaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}