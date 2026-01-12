'use client'

import { ReactElement } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'indigo'
  trend?: 'up' | 'down' | 'stable'
  change?: string
  subtitle?: string | React.ReactNode
}

export default function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  trend,
  change,
  subtitle 
}: StatsCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    purple: 'from-purple-500 to-purple-600',
    red: 'from-red-500 to-red-600',
    indigo: 'from-indigo-500 to-indigo-600'
  }

  const bgColorClasses = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    yellow: 'bg-yellow-50',
    purple: 'bg-purple-50',
    red: 'bg-red-50',
    indigo: 'bg-indigo-50'
  }

  const trendIcons = {
    up: <TrendingUp className="w-4 h-4" />,
    down: <TrendingDown className="w-4 h-4" />,
    stable: <Minus className="w-4 h-4" />
  }

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    stable: 'text-gray-600'
  }

  return (
    <div className={`${bgColorClasses[color]} rounded-2xl p-6 hover:shadow-lg transition-shadow`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          <p className="text-2xl font-bold text-gray-800 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} text-white`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-white">
        <span className="text-sm text-gray-600">{subtitle || ''}</span>
        {trend && change && (
          <div className={`flex items-center gap-1 text-sm font-medium ${trendColors[trend]}`}>
            {trendIcons[trend]}
            <span>{change}</span>
          </div>
        )}
      </div>
    </div>
  )
}