// apps/web/components/dashboard/branch-admin/waste-logging.tsx
'use client'

import { useState } from 'react'
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
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { formatCurrency } from '@/lib/utils'

export function WasteLogging() {
  const [showForm, setShowForm] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'log' | 'analytics'>('log')
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  const { data: wasteEntries, isLoading } = useWasteEntries({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    limit: 20
  })

  const { data: analytics } = useWasteAnalytics({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  })

  const { data: inventoryItems } = useInventoryItems()
  const { data: recipes } = useRecipes()

  const createWasteEntry = useCreateWasteEntry()

  const handleCreateWaste = (data: any) => {
    createWasteEntry.mutate(data, {
      onSuccess: () => {
        setShowForm(false)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Waste Management</h2>
          <p className="text-gray-600">Log and track food waste with automatic cost calculation</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Log Waste
        </Button>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Entries</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.summary.totalEntries}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <CurrencyDollarIcon className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Cost</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(analytics.summary.totalCost)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ChartBarIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Per Entry</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(analytics.summary.averageCostPerEntry)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ChartBarIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Raw vs Product</p>
                  <div className="flex space-x-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      RAW: {analytics.summary.wasteByType?.RAW || 0}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      PRODUCT: {analytics.summary.wasteByType?.PRODUCT || 0}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Date Range:</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-1"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setSelectedTab('log')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              selectedTab === 'log'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Waste Log
          </button>
          <button
            onClick={() => setSelectedTab('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              selectedTab === 'analytics'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Analytics
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
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

interface WasteLogTabProps {
  entries: any[]
  isLoading: boolean
}

function WasteLogTab({ entries, isLoading }: WasteLogTabProps) {
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
            <div className="flex items-center space-x-3 mb-2">
              <Badge variant={entry.wasteType === 'RAW' ? 'destructive' : 'warning'}>
                {entry.wasteType}
              </Badge>
              <Badge 
                variant="outline" 
                className={getReasonColor(entry.reason)}
              >
                {entry.reason.replace('_', ' ')}
              </Badge>
              <Badge variant={entry.status === 'PENDING' ? 'secondary' : 'success'}>
                {entry.status}
              </Badge>
            </div>
            
            <h3 className="font-medium text-lg text-gray-900 mb-1">
              {entry.inventoryItem?.name || entry.recipe?.name || 'Unknown Item'}
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Quantity:</span>
                <p>{entry.quantity} {entry.unit}</p>
              </div>
              <div>
                <span className="font-medium">Cost:</span>
                <p className="font-medium text-red-600">
                  {formatCurrency(entry.estimatedCost)}
                </p>
              </div>
              <div>
                <span className="font-medium">Location:</span>
                <p>{entry.location || 'Not specified'}</p>
              </div>
              <div>
                <span className="font-medium">Logged by:</span>
                <p>{entry.creator.username}</p>
              </div>
            </div>

            {entry.reasonDetail && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border-l-4 border-gray-300">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Details:</span> {entry.reasonDetail}
                </p>
              </div>
            )}
          </div>
          
          <div className="text-right text-sm text-gray-500">
            <p>{new Date(entry.wastedAt).toLocaleDateString()}</p>
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
      {/* Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Waste by Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <WasteAnalyticsChart
              data={Object.entries(analytics.breakdown.byReason).map(([reason, data]: [string, any]) => ({
                name: reason.replace('_', ' '),
                value: data.totalCost,
                count: data.count
              }))}
              type="pie"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Waste by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <WasteAnalyticsChart
              data={Object.entries(analytics.breakdown.byCategory).map(([category, data]: [string, any]) => ({
                name: category.replace('_', ' '),
                value: data.totalCost,
                count: data.count
              }))}
              type="bar"
            />
          </CardContent>
        </Card>
      </div>

      {/* Top Wasted Items */}
      <Card>
        <CardHeader>
          <CardTitle>Top Wasted Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.breakdown.topItems.slice(0, 10).map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-bold text-red-600">#{index + 1}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-500">
                      {item.count} entries • {item.totalQuantity} total units wasted
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-600">
                    {formatCurrency(item.totalCost)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Avg: {formatCurrency(item.totalCost / item.count)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Daily Trend */}
      {analytics.trends.daily && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Waste Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <WasteAnalyticsChart
              data={analytics.trends.daily}
              type="line"
            />
          </CardContent>
        </Card>
      )}
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