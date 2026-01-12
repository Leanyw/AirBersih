'use client'

import { ReactElement } from 'react'
import { TrendingUp, TrendingDown, Minus, Bell } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  trend?: 'up' | 'down' | 'stable'
  trendValue?: string
  description?: string
  highlight?: boolean
  notificationCount?: number
  onClick?: () => void
}

export default function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  iconBg, 
  iconColor,
  trend,
  trendValue,
  description,
  highlight = false,
  notificationCount = 0,
  onClick
}: StatCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null
    
    const trendConfig = {
      up: { 
        icon: <TrendingUp className="w-4 h-4" />, 
        color: 'text-green-600' 
      },
      down: { 
        icon: <TrendingDown className="w-4 h-4" />, 
        color: 'text-red-600' 
      },
      stable: { 
        icon: <Minus className="w-4 h-4" />, 
        color: 'text-gray-600' 
      }
    }

    const config = trendConfig[trend]
    
    return (
      <span className={`flex items-center text-sm ${config.color}`}>
        {config.icon}
        {trendValue && <span className="ml-1">{trendValue}</span>}
      </span>
    )
  }

  return (
    <div 
      className={`
        bg-white rounded-xl border p-6 hover:shadow-md transition-all duration-300
        ${highlight ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}
        ${onClick ? 'cursor-pointer hover:border-blue-300' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">{title}</h3>
            
            {/* Notification Badge */}
            {notificationCount > 0 && (
              <div className="relative">
                <Bell className="w-4 h-4 text-yellow-600" />
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notificationCount}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-baseline">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {trend && (
              <div className="ml-3">
                {getTrendIcon()}
              </div>
            )}
          </div>
          
          {description && (
            <p className="text-xs text-gray-500 mt-2">{description}</p>
          )}
        </div>
        
        <div className={`${iconBg} p-3 rounded-lg ml-4`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
      
      {/* Highlight Indicator */}
      {highlight && (
        <div className="mt-4 pt-4 border-t border-blue-100">
          <div className="flex items-center text-xs text-blue-600">
            <div className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></div>
            <span className="font-medium">Perhatian: Ada update baru</span>
          </div>
        </div>
      )}
    </div>
  )
}