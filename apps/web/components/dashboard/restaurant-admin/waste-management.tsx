// apps/web/components/dashboard/restaurant-admin/waste-management.tsx
'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useWasteEntries, useCreateWasteEntry, useWasteAnalytics } from '@/hooks/use-waste'
import { useInventoryItems } from '@/hooks/use-inventory'
import { useRecipes } from '@/hooks/use-recipes'
import { WasteEntryForm } from '../shared/waste-entry-form'
import { WasteAnalyticsChart } from '../shared/waste-analytics-chart'
import { 
  PlusIcon, 
  ChartBarIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  FunnelIcon,
  ArrowDownIcon,
  ClockIcon,
  BuildingStorefrontIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn, formatCurrency } from '@/lib/utils'

interface WasteDashboardData {
  totalCost: number
  totalEntries: number
  averageCostPerEntry: number
  reductionPercentage: number
  monthlyTrend: number
  topWasteReasons: Array<{
    reason: string
    count: number
    cost: number
    percentage: number
  }>
  branchComparison: Array<{
    branchName: string
    wasteCount: number
    wasteCost: number
    trend: number
  }>
}

export function WasteManagement() {
  const [showForm, setShowForm] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'log' | 'analytics'>('overview')
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d')
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  const { data: wasteEntries, isLoading } = useWasteEntries({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    limit: 50,
    branchId: selectedBranch === 'all' ? undefined : selectedBranch
  })

  const { data: analytics } = useWasteAnalytics({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    branchId: selectedBranch === 'all' ? undefined : selectedBranch
  })

  const { data: inventoryItems } = useInventoryItems()
  const { data: recipes } = useRecipes()
  const createWasteEntry = useCreateWasteEntry()

  const branches = [
    { id: 'all', name: 'All Branches' },
    { id: 'main', name: 'Main Branch' },
    { id: 'north', name: 'North Branch' },
    { id: 'east', name: 'East Branch' }
  ]

  const timeframes = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: 'custom', label: 'Custom range' }
  ]

  // Mock dashboard data - in real app, this would come from analytics API
  const dashboardData: WasteDashboardData = {
    totalCost: 8450,
    totalEntries: 156,
    averageCostPerEntry: 54.17,
    reductionPercentage: 12.3,
    monthlyTrend: -8.5,
    topWasteReasons: [
      { reason: 'EXPIRED', count: 45, cost: 2890, percentage: 34.2 },
      { reason: 'OVERCOOKED', count: 28, cost: 1560, percentage: 18.5 },
      { reason: 'SPOILED', count: 23, cost: 1340, percentage: 15.8 },
      { reason: 'WRONG_ORDER', count: 19, cost: 980, percentage: 11.6 },
      { reason: 'DROPPED', count: 15, cost: 720, percentage: 8.5 }
    ],
    branchComparison: [
      { branchName: 'Main Branch', wasteCount: 68, wasteCost: 3890, trend: -5.2 },
      { branchName: 'North Branch', wasteCount: 52, wasteCost: 2980, trend: -12.1 },
      { branchName: 'East Branch', wasteCount: 36, wasteCost: 1580, trend: -3.8 }
    ]
  }

  const handleCreateWaste = (data: any) => {
    createWasteEntry.mutate(data, {
      onSuccess: () => {
        setShowForm(false)
      }
    })
  }


  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Waste Management</h1>
          <p className="text-gray-600 mt-1">
            Monitor and reduce food waste across all branches with intelligent analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeframes.map(timeframe => (
                <SelectItem key={timeframe.value} value={timeframe.value}>
                  {timeframe.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="flex items-center gap-2"
          >
            <ChartBarIcon className="w-4 h-4" />
            Export Report
          </Button>
          <Button 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Log Waste
          </Button>
        </div>
      </div>

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Waste Cost"
          value={formatCurrency(dashboardData.totalCost)}
          change={`${dashboardData.monthlyTrend}% vs last month`}
          icon={<CurrencyDollarIcon className="w-5 h-5" />}
          trend={dashboardData.monthlyTrend < 0 ? "down" : "up"}
          variant={dashboardData.monthlyTrend < 0 ? "success" : "warning"}
        />
        <MetricCard
          title="Waste Entries"
          value={dashboardData.totalEntries.toString()}
          change="This period"
          icon={<ExclamationTriangleIcon className="w-5 h-5" />}
          trend="neutral"
          variant="default"
        />
        <MetricCard
          title="Average per Entry"
          value={formatCurrency(dashboardData.averageCostPerEntry)}
          change="Cost efficiency"
          icon={<ChartBarIcon className="w-5 h-5" />}
          trend="neutral"
          variant="default"
        />
        <MetricCard
          title="Waste Reduction"
          value={`${dashboardData.reductionPercentage}%`}
          change="Improvement this quarter"
          icon={<ArrowTrendingDownIcon className="w-5 h-5" />}
          trend="down"
          variant="success"
        />
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: ChartBarIcon },
            { id: 'log', label: 'Waste Log', icon: ExclamationTriangleIcon },
            { id: 'analytics', label: 'Analytics', icon: ChartBarIcon }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={cn(
                'py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
                selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTimeframe === 'custom' && (
              <>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="border border-gray-300 rounded-md px-3 py-2"
                />
                <span className="text-gray-500 self-center">to</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="border border-gray-300 rounded-md px-3 py-2"
                />
              </>
            )}
            <Button variant="outline" className="flex items-center gap-2">
              <FunnelIcon className="w-4 h-4" />
              Advanced Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      <div className="space-y-6">
        {selectedTab === 'overview' && (
          <OverviewTab 
            dashboardData={dashboardData}
            analytics={analytics}
          />
        )}
        
        {selectedTab === 'log' && (
          <WasteLogTab 
            entries={wasteEntries?.entries || []} 
            isLoading={isLoading}
          />
        )}
        
        {selectedTab === 'analytics' && analytics && (
          <WasteAnalyticsTab analytics={analytics} />
        )}
      </div>

      {/* Waste Entry Form Modal */}
      <WasteEntryForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleCreateWaste}
        inventoryItems={inventoryItems || []}
        recipes={recipes || []}
        isLoading={createWasteEntry.isPending}
      />
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  change: string
  icon: React.ReactNode
  trend: 'up' | 'down' | 'neutral'
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

function MetricCard({ title, value, change, icon, trend, variant = 'default' }: MetricCardProps) {
  const variantStyles = {
    default: 'bg-blue-100 text-blue-600',
    success: 'bg-green-100 text-green-600',
    warning: 'bg-yellow-100 text-yellow-600',
    danger: 'bg-red-100 text-red-600'
  }

  const trendStyles = {
    up: 'text-red-600',
    down: 'text-green-600',
    neutral: 'text-gray-500'
  }

  const TrendIcon = trend === 'up' ? ArrowTrendingUpIcon : trend === 'down' ? ArrowTrendingDownIcon : ClockIcon

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn('p-2 rounded-lg', variantStyles[variant])}>
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
          {trend !== 'neutral' && (
            <TrendIcon className={cn('w-5 h-5', trendStyles[trend])} />
          )}
        </div>
        <div className="mt-4">
          <span className={cn('text-sm font-medium', trendStyles[trend])}>
            {change}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function OverviewTab({ dashboardData, analytics }: { 
  dashboardData: WasteDashboardData
  analytics: any 
}) {
  return (
    <div className="space-y-6">
      {/* Top Waste Reasons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Waste Reasons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.topWasteReasons.map((reason, index) => (
                <div key={reason.reason} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-bold text-red-600">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {reason.reason.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {reason.count} entries • {reason.percentage}% of total
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(reason.cost)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Branch Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BuildingStorefrontIcon className="w-5 h-5" />
              Branch Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.branchComparison.map((branch, index) => (
                <div key={branch.branchName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <BuildingStorefrontIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{branch.branchName}</p>
                      <p className="text-xs text-gray-500">
                        {branch.wasteCount} entries this period
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center space-x-2">
                    <div>
                      <p className="font-bold text-gray-900">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(branch.wasteCost)}
                      </p>
                      <div className="flex items-center text-xs">
                        <ArrowDownIcon className={cn('w-3 h-3 mr-1', 
                          branch.trend < 0 ? 'text-green-600' : 'text-red-600 rotate-180'
                        )} />
                        <span className={cn(
                          'font-medium',
                          branch.trend < 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {Math.abs(branch.trend)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Waste Reduction Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Waste Reduction Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ArrowTrendingDownIcon className="w-5 h-5 text-green-600" />
                <h3 className="font-medium text-green-900">Best Performing</h3>
              </div>
              <p className="text-sm text-green-700">
                North Branch reduced waste by 12.1% this month through better portion control and staff training.
              </p>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                <h3 className="font-medium text-yellow-900">Action Needed</h3>
              </div>
              <p className="text-sm text-yellow-700">
                Expired ingredients account for 34% of waste. Consider implementing better inventory rotation.
              </p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ChartBarIcon className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium text-blue-900">Opportunity</h3>
              </div>
              <p className="text-sm text-blue-700">
                Potential savings of $2,100/month by reducing overcooked items through better kitchen timing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function WasteLogTab({ entries, isLoading }: { entries: any[], isLoading: boolean }) {
  if (isLoading) {
    return <WasteLogSkeleton />
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Waste Entries
          </h3>
          <p className="text-gray-600">
            No waste has been logged in the selected time period.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <WasteEntryCard key={entry.id} entry={entry} />
      ))}
    </div>
  )
}

function WasteEntryCard({ entry }: { entry: any }) {
  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'EXPIRED':
      case 'SPOILED':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'OVERCOOKED':
      case 'DROPPED':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'WRONG_ORDER':
      case 'CUSTOMER_RETURN':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <Badge variant={entry.wasteType === 'RAW' ? 'destructive' : 'secondary'}>
                {entry.wasteType}
              </Badge>
              <Badge 
                variant="outline" 
                className={getReasonColor(entry.reason)}
              >
                {entry.reason.replace('_', ' ')}
              </Badge>
              <Badge variant={entry.status === 'PENDING' ? 'secondary' : 'default'}>
                {entry.status}
              </Badge>
            </div>
            
            <h3 className="font-semibold text-lg text-gray-900 mb-3">
              {entry.inventoryItem?.name || entry.recipe?.name || 'Unknown Item'}
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Quantity:</span>
                <p className="text-gray-900">{entry.quantity} {entry.unit}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Cost:</span>
                <p className="font-semibold text-red-600">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(entry.estimatedCost)}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Location:</span>
                <p className="text-gray-900">{entry.location || 'Not specified'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Logged by:</span>
                <p className="text-gray-900">{entry.creator.username}</p>
              </div>
            </div>

            {entry.reasonDetail && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border-l-4 border-gray-300">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Details:</span> {entry.reasonDetail}
                </p>
              </div>
            )}
          </div>
          
          <div className="text-right text-sm text-gray-500 ml-4">
            <p className="font-medium">{new Date(entry.wastedAt).toLocaleDateString()}</p>
            <p>{new Date(entry.wastedAt).toLocaleTimeString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function WasteAnalyticsTab({ analytics }: { analytics: any }) {
  return (
    <div className="space-y-6">
      {/* Analytics content would go here */}
      <WasteAnalyticsChart
        data={analytics?.trends?.daily || []}
        type="line"
      />
    </div>
  )
}

function WasteLogSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="flex space-x-2">
                <div className="h-6 bg-gray-200 rounded w-16"></div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
                <div className="h-6 bg-gray-200 rounded w-18"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="grid grid-cols-4 gap-4">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}