'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, X, Bell, Info } from 'lucide-react';

type HealthAlert = {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  disease_id?: string;
};

export default function HealthAlert() {
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Load dismissed alerts from localStorage
    const dismissed = JSON.parse(localStorage.getItem('dismissed_health_alerts') || '[]');
    setDismissedAlerts(dismissed);

    // Fetch alerts (in real app, this would come from API)
    const mockAlerts: HealthAlert[] = [
      {
        id: '1',
        title: 'Peningkatan Kasus Diare',
        message: 'Terdapat peningkatan kasus diare di wilayah Anda. Pastikan air minum direbus hingga mendidih.',
        severity: 'medium',
        disease_id: '1'
      },
      {
        id: '2',
        title: 'Musim Hujan - Risiko Air Kotor',
        message: 'Waspada kontaminasi air selama musim hujan. Gunakan air bersih untuk konsumsi.',
        severity: 'low'
      }
    ];

    // Filter out dismissed alerts
    const filteredAlerts = mockAlerts.filter(alert => !dismissed.includes(alert.id));
    setAlerts(filteredAlerts);
  }, []);

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => [...prev, alertId]);
    localStorage.setItem('dismissed_health_alerts', JSON.stringify([...dismissedAlerts, alertId]));
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'low':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  if (alerts.length === 0 || !isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`mb-3 rounded-lg border p-4 shadow-lg ${getSeverityStyles(alert.severity)} animate-slide-up`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {getSeverityIcon(alert.severity)}
              <div className="flex-1">
                <h4 className="font-bold mb-1">{alert.title}</h4>
                <p className="text-sm opacity-90">{alert.message}</p>
                {alert.disease_id && (
                  <a
                    href={`/kesehatan/penyakit/${alert.disease_id}`}
                    className="inline-block mt-2 text-sm font-medium hover:underline"
                  >
                    Pelajari cara pencegahan →
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={() => dismissAlert(alert.id)}
              className="ml-4 text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}