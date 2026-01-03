'use client';

import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  iconBg = 'bg-blue-100',
  iconColor = 'text-blue-600',
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow p-6 min-h-[120px]">
      <div className="flex items-center justify-between h-full">
        {/* Text */}
        <div className="flex flex-col justify-center h-[72px]">
          <p className="text-gray-500 text-sm leading-none mb-2">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-800 leading-none">
            {value}
          </p>
        </div>

        {/* Icon */}
        <div
          className={`${iconBg} ${iconColor} flex items-center justify-center 
                      h-[48px] w-[48px] rounded-lg`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
