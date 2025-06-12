// apps/web/components/dashboard/restaurant-admin/inventory-analytics-chart.tsx
'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CubeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { cn, formatCurrency } from '@/lib/utils'

interface InventoryAnalyticsChartProps {
  data: any[]
  type?: 'trend' | 'category' | 'branch'
  title?: string
  showTrends?: boolean
}

export function InventoryAnalyticsChart({ 
  data, 
  type = 'trend', 
  title,
  showTrends = true 
}: InventoryAnalyticsChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    return data.map(item => ({
      name: item.name || item.label || item.category || 'Unknown',
      value: item.value || item.totalValue || item.currentStock || 0,
      count: item.count || item.itemCount || 1,
      percentage: item.percentage || 0,
      trend: item.trend || 0,
      color: item.color || generateColor(item.name || item.label || ''),
      status: getInventoryStatus(item)
    }))
  }, [data])

  const totalValue = chartData.reduce((sum, item) => sum + (item.value || 0), 0)

  if (!chartData.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
          <p className="text-gray-600">No data available for analysis in the selected period.</p>
        </CardContent>
      </Card>
    )
  }

  switch (type) {
    case 'trend':
      return <TrendChart data={chartData} title={title} showTrends={showTrends} />
    case 'category':
      return <CategoryChart data={chartData} title={title} totalValue={totalValue} />
    case 'branch':
      return <BranchChart data={chartData} title={title} totalValue={totalValue} />
    default:
      return <TrendChart data={chartData} title={title} showTrends={showTrends} />
  }
}

function TrendChart({ data, title, showTrends }: { 
  data: any[], 
  title?: string, 
  showTrends: boolean 
}) {
  const sortedData = [...data].sort((a, b) => {
    const dateA = new Date(a.date || a.name)
    const dateB = new Date(b.date || b.name)
    return dateA.getTime() - dateB.getTime()
  })
  
  const maxValue = Math.max(...sortedData.map(item => item.value))
  const minValue = Math.min(...sortedData.map(item => item.value))
  const range = maxValue - minValue

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartBarIcon className="w-5 h-5" />
          {title || 'Inventory Trend Analysis'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        {showTrends && sortedData.length > 1 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-600 font-medium">Period Start</p>
              <p className="text-lg font-bold text-blue-900">
                {formatCurrency(sortedData[0]?.value || 0)}
              </p>
            </div>
            <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-600 font-medium">Current</p>
              <p className="text-lg font-bold text-green-900">
                {formatCurrency(sortedData[sortedData.length - 1]?.value || 0)}
              </p>
            </div>
            <div className="text-center p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-xs text-purple-600 font-medium">Peak Value</p>
              <p className="text-lg font-bold text-purple-900">{formatCurrency(maxValue)}</p>
            </div>
          </div>
        )}
        
        {/* Visual Trend Line */}
        <div className="relative h-48 bg-gradient-to-b from-blue-50 to-white rounded-lg p-4 border">
          <div className="flex justify-between items-end h-full">
            {sortedData.map((item, index) => {
              const height = range > 0 ? ((item.value - minValue) / range) * 100 : 50
              const isIncreasing = index > 0 && item.value > sortedData[index - 1].value
              const isDecreasing = index > 0 && item.value < sortedData[index - 1].value
              
              return (
                <div key={index} className="flex flex-col items-center space-y-2 flex-1">
                  <div className="relative flex-1 flex items-end group">
                    <div 
                      className="w-4 h-4 bg-gradient-to-t from-blue-600 to-blue-400 rounded-full transition-all duration-500 relative hover:scale-125 cursor-pointer shadow-lg"
                      style={{ marginBottom: `${height}%` }}
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {formatCurrency(item.value)}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                    {showTrends && index > 0 && (
                      <div className="absolute -top-6 right-0">
                        {isIncreasing && <ArrowTrendingUpIcon className="w-3 h-3 text-green-500" />}
                        {isDecreasing && <ArrowTrendingDownIcon className="w-3 h-3 text-red-500" />}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 text-center transform -rotate-45 mt-2">
                    {item.name}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Data Summary */}
        <div className="mt-6 space-y-2">
          <h4 className="font-medium text-gray-900">Period Summary</h4>
          <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
            {sortedData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <span className="text-gray-700">{item.name}</span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{formatCurrency(item.value)}</span>
                  {item.count && (
                    <Badge variant="outline" className="text-xs">
                      {item.count} items
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CategoryChart({ data, title, totalValue }: { 
  data: any[], 
  title?: string, 
  totalValue: number 
}) {
  const sortedData = [...data].sort((a, b) => b.value - a.value).slice(0, 8)
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CubeIcon className="w-5 h-5" />
          {title || 'Category Performance'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Value</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Categories</p>
            <p className="text-xl font-bold text-gray-900">{data.length}</p>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-4">
          {sortedData.map((item, index) => {
            const percentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded text-white text-xs flex items-center justify-center font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">
                        {item.name.replace('_', ' ')}
                      </span>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge 
                          variant={item.status === 'critical' ? 'destructive' : item.status === 'warning' ? 'warning' : 'default'}
                          className="text-xs"
                        >
                          {item.status}
                        </Badge>
                        {item.trend !== 0 && (
                          <TrendIndicator trend={item.trend} />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-900">{formatCurrency(item.value)}</span>
                    <div className="text-xs text-gray-500">
                      {percentage.toFixed(1)}% • {item.count} items
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
                      style={{ width: `${Math.max(percentage, 2)}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function BranchChart({ data, title, totalValue }: { 
  data: any[], 
  title?: string, 
  totalValue: number 
}) {
  const sortedData = [...data].sort((a, b) => b.value - a.value)
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartBarIcon className="w-5 h-5" />
          {title || 'Branch Performance'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedData.map((branch, index) => {
            const percentage = totalValue > 0 ? (branch.value / totalValue) * 100 : 0
            const isTopPerformer = index === 0
            const needsAttention = branch.status === 'critical'
            
            return (
              <div 
                key={index} 
                className={cn(
                  'p-4 rounded-lg border transition-all duration-200 hover:shadow-md',
                  isTopPerformer ? 'bg-green-50 border-green-200' : 
                  needsAttention ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium',
                      isTopPerformer ? 'bg-gradient-to-r from-green-500 to-green-600' :
                      needsAttention ? 'bg-gradient-to-r from-red-500 to-red-600' :
                      'bg-gradient-to-r from-blue-500 to-purple-600'
                    )}>
                      #{index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{branch.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm text-gray-600">{branch.count} items</span>
                        {isTopPerformer && (
                          <Badge variant="success" className="text-xs">
                            Top Performer
                          </Badge>
                        )}
                        {needsAttention && (
                          <Badge variant="destructive" className="text-xs">
                            <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                            Attention Needed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(branch.value)}
                      </span>
                      {branch.trend !== 0 && (
                        <TrendIndicator trend={branch.trend} />
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {percentage.toFixed(1)}% of total
                    </div>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={cn(
                      'h-2 rounded-full transition-all duration-500',
                      isTopPerformer ? 'bg-gradient-to-r from-green-400 to-green-600' :
                      needsAttention ? 'bg-gradient-to-r from-red-400 to-red-600' :
                      'bg-gradient-to-r from-blue-400 to-purple-600'
                    )}
                    style={{ width: `${Math.max(percentage, 5)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function TrendIndicator({ trend }: { trend: number }) {
  const isPositive = trend > 0
  return (
    <div className={cn(
      'flex items-center text-xs font-medium px-2 py-1 rounded-full',
      isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    )}>
      <ArrowTrendingUpIcon 
        className={cn('w-3 h-3 mr-1', !isPositive && 'rotate-180')} 
      />
      {Math.abs(trend).toFixed(1)}%
    </div>
  )
}

// Helper function to determine inventory status
function getInventoryStatus(item: any): 'good' | 'warning' | 'critical' {
  const currentStock = item.currentStock || item.value || 0
  const minStock = item.minStockLevel || item.threshold || 0
  
  if (currentStock === 0) return 'critical'
  if (currentStock <= minStock) return 'warning'
  return 'good'
}

// Utility function to generate consistent colors
function generateColor(name: string): string {
  const colors = [
    '#3b82f6', '#8b5cf6', '#ef4444', '#f97316', '#eab308', 
    '#84cc16', '#22c55e', '#06b6d4', '#6366f1', '#ec4899'
  ]
  
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}