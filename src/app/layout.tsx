import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/providers/AuthProvider';
import { Toaster } from 'react-hot-toast';
import HealthAlert from '@/components/health/HealthAlert';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Air Bersih - Monitoring Kualitas Air',
  description: 'Aplikasi monitoring kualitas air untuk daerah 3T',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        {/* Leaflet CSS */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <main className="min-h-screen bg-gray-50">
            {children}
            <HealthAlert/>
          </main>
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}