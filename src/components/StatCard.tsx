import { LucideIcon } from 'lucide-react';


interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  highlight?: boolean;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  highlight = false
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <p className={`text-3xl font-bold ${highlight ? 'text-red-600' : 'text-gray-800'}`}>
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${iconBg}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}
