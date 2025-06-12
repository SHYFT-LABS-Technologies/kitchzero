// apps/web/components/dashboard/shared/waste-analytics-chart.tsx
'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface WasteAnalyticsChartProps {
  data: any[]
  type: 'pie' | 'bar' | 'line'
  title?: string
  showTrends?: boolean
}

export function WasteAnalyticsChart({ 
  data, 
  type, 
  title,
  showTrends = false 
}: WasteAnalyticsChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    // Normalize data structure
    return data.map(item => ({
      name: item.name || item.label || item.category || 'Unknown',
      value: item.value || item.cost || item.amount || 0,
      count: item.count || item.entries || 1,
      percentage: item.percentage || 0,
      trend: item.trend || 0,
      color: item.color || generateColor(item.name || item.label || '')
    }))
  }, [data])

  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0)
  const totalCount = chartData.reduce((sum, item) => sum + item.count, 0)

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  if (!chartData.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600">No data to display for the selected period.</p>
        </CardContent>
      </Card>
    )
  }

  switch (type) {
    case 'pie':
      return <PieChart data={chartData} title={title} totalValue={totalValue} />
    case 'bar':
      return <BarChart data={chartData} title={title} totalValue={totalValue} />
    case 'line':
      return <LineChart data={chartData} title={title} showTrends={showTrends} />
    default:
      return <BarChart data={chartData} title={title} totalValue={totalValue} />
  }
}

function PieChart({ data, title, totalValue }: { 
  data: any[], 
  title?: string, 
  totalValue: number 
}) {
  const sortedData = [...data].sort((a, b) => b.value - a.value).slice(0, 8)
  
  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      )}
      
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Total Cost</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Categories</p>
          <p className="text-xl font-bold text-gray-900">{data.length}</p>
        </div>
      </div>

      {/* Visual representation using progress bars (since we can't use charts) */}
      <div className="space-y-3">
        {sortedData.map((item, index) => {
          const percentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium text-gray-700">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                  <span className="text-xs text-gray-500 ml-2">({percentage.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: item.color 
                  }}
                />
              </div>
              <div className="text-xs text-gray-500">
                {item.count} {item.count === 1 ? 'entry' : 'entries'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BarChart({ data, title, totalValue }: { 
  data: any[], 
  title?: string, 
  totalValue: number 
}) {
  const sortedData = [...data].sort((a, b) => b.value - a.value).slice(0, 10)
  const maxValue = Math.max(...sortedData.map(item => item.value))
  
  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      )}
      
      <div className="space-y-4">
        {sortedData.map((item, index) => {
          const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0
          const totalPercentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0
          
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-red-400 to-red-600 rounded text-white text-xs flex items-center justify-center font-medium">
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-gray-900">{formatCurrency(item.value)}</span>
                  <span className="text-xs text-gray-500 ml-2">({totalPercentage.toFixed(1)}%)</span>
                </div>
              </div>
              
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="h-4 rounded-full bg-gradient-to-r from-red-400 to-red-600 transition-all duration-500 flex items-center justify-end pr-2"
                    style={{ width: `${Math.max(percentage, 5)}%` }}
                  >
                    {percentage > 20 && (
                      <span className="text-xs font-medium text-white">
                        {item.count}
                      </span>
                    )}
                  </div>
                </div>
                {percentage <= 20 && (
                  <span className="absolute right-0 top-0 text-xs text-gray-500 ml-2">
                    {item.count} {item.count === 1 ? 'entry' : 'entries'}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LineChart({ data, title, showTrends }: { 
  data: any[], 
  title?: string, 
  showTrends: boolean 
}) {
  // Assume data is time-series for line chart
  const sortedData = [...data].sort((a, b) => {
    const dateA = new Date(a.date || a.name)
    const dateB = new Date(b.date || b.name)
    return dateA.getTime() - dateB.getTime()
  })
  
  const maxValue = Math.max(...sortedData.map(item => item.value))
  const minValue = Math.min(...sortedData.map(item => item.value))
  const range = maxValue - minValue

  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      )}
      
      {/* Trend Summary */}
      {showTrends && sortedData.length > 1 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">Period Start</p>
            <p className="font-bold text-gray-900">{formatCurrency(sortedData[0]?.value || 0)}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">Period End</p>
            <p className="font-bold text-gray-900">{formatCurrency(sortedData[sortedData.length - 1]?.value || 0)}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">Peak</p>
            <p className="font-bold text-gray-900">{formatCurrency(maxValue)}</p>
          </div>
        </div>
      )}
      
      {/* Simple line visualization using connected dots */}
      <div className="relative h-48 bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-end h-full">
          {sortedData.map((item, index) => {
            const height = range > 0 ? ((item.value - minValue) / range) * 100 : 50
            const isIncreasing = index > 0 && item.value > sortedData[index - 1].value
            const isDecreasing = index > 0 && item.value < sortedData[index - 1].value
            
            return (
              <div key={index} className="flex flex-col items-center space-y-2 flex-1">
                <div className="relative flex-1 flex items-end">
                  <div 
                    className="w-3 h-3 bg-red-500 rounded-full transition-all duration-500 relative"
                    style={{ marginBottom: `${height}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-700 whitespace-nowrap">
                      {formatCurrency(item.value)}
                    </div>
                  </div>
                  {showTrends && index > 0 && (
                    <div className="absolute top-0 right-2">
                      {isIncreasing && <ArrowTrendingUpIcon className="w-3 h-3 text-red-500" />}
                      {isDecreasing && <ArrowTrendingDownIcon className="w-3 h-3 text-green-500" />}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 text-center">
                  {item.name}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Data Points */}
      <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
        {sortedData.map((item, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
            <span className="text-gray-700">{item.name}</span>
            <div className="flex items-center space-x-2">
              <span className="font-medium">{formatCurrency(item.value)}</span>
              {item.count && (
                <Badge variant="outline" className="text-xs">
                  {item.count}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Utility function to generate consistent colors
function generateColor(name: string): string {
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e',
    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
    '#f43f5e', '#64748b', '#78716c', '#dc2626', '#ea580c'
  ]
  
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}