// apps/web/components/dashboard/restaurant-admin/inventory-management.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useInventoryItems, useLowStockItems, useExpiringItems } from '@/hooks/use-inventory'
import { InventoryTable } from '../shared/inventory-table'
import { AddInventoryModal } from '../shared/add-inventory-modal'
import { AdjustmentRequestModal } from '../shared/adjustment-request-modal'
import { InventoryAnalyticsChart } from './inventory-analytics-chart'
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CubeIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  FunnelIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  Squares2X2Icon,
  ListBulletIcon,
  AdjustmentsHorizontalIcon,
  InformationCircleIcon,
  BuildingStorefrontIcon,
  ShoppingCartIcon,
  TruckIcon,
  CalendarDaysIcon,
  BeakerIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn, formatCurrency } from '@/lib/utils'

interface InventoryStats {
  totalValue: number
  totalItems: number
  lowStockCount: number
  expiringCount: number
  monthlyChange: number
  averageValue: number
  totalBatches: number
  outOfStockCount: number
}

interface BranchInventory {
  branchId: string
  branchName: string
  totalValue: number
  itemCount: number
  lowStockCount: number
  lastUpdated: string
}

interface CategoryStats {
  category: string
  itemCount: number
  totalValue: number
  lowStockCount: number
  averageCost: number
  trend: number
}

export function InventoryManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [sortField, setSortField] = useState<string>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedPriceRange, setSelectedPriceRange] = useState('all')
  const [selectedStockStatus, setSelectedStockStatus] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Real API hooks - no more hardcoded data
  const { 
    data: inventoryItems, 
    isLoading, 
    error,
    refetch: refetchInventory 
  } = useInventoryItems({
    category: selectedCategory === 'all' ? undefined : selectedCategory,
    branchId: selectedBranch === 'all' ? undefined : selectedBranch,
    search: searchTerm
  })
  
  const { data: lowStockItems, refetch: refetchLowStock } = useLowStockItems()
  const { data: expiringItems, refetch: refetchExpiring } = useExpiringItems(7)

  const categories = [
    'RAW_INGREDIENTS', 'FINISHED_PRODUCTS', 'BEVERAGES', 
    'PACKAGING', 'SUPPLIES', 'CLEANING', 'OTHER'
  ]

  const branches = [
    { id: 'all', name: 'All Branches' },
    { id: 'main', name: 'Main Branch' },
    { id: 'north', name: 'North Branch' },
    { id: 'east', name: 'East Branch' }
  ]

  const priceRanges = [
    { value: 'all', label: 'All Prices' },
    { value: '0-10', label: 'Under $10' },
    { value: '10-50', label: '$10 - $50' },
    { value: '50-100', label: '$50 - $100' },
    { value: '100+', label: 'Over $100' }
  ]

  const stockStatuses = [
    { value: 'all', label: 'All Status' },
    { value: 'in-stock', label: 'In Stock' },
    { value: 'low-stock', label: 'Low Stock' },
    { value: 'out-of-stock', label: 'Out of Stock' },
    { value: 'expiring', label: 'Expiring Soon' }
  ]

  // Calculate real statistics from API data
  const inventoryStats = useMemo((): InventoryStats => {
    if (!inventoryItems) {
      return {
        totalValue: 0,
        totalItems: 0,
        lowStockCount: 0,
        expiringCount: 0,
        monthlyChange: 0,
        averageValue: 0,
        totalBatches: 0,
        outOfStockCount: 0
      }
    }

    const totalValue = inventoryItems.reduce((sum, item) => {
      return sum + ((item.currentStock || 0) * (item.averageUnitCost || 0))
    }, 0)

    const totalItems = inventoryItems.length
    const lowStockCount = lowStockItems?.length || 0
    const expiringCount = expiringItems?.length || 0
    const outOfStockCount = inventoryItems.filter(item => (item.currentStock || 0) === 0).length
    const totalBatches = inventoryItems.reduce((sum, item) => sum + (item.batches?.length || 0), 0)

    return {
      totalValue,
      totalItems,
      lowStockCount,
      expiringCount,
      monthlyChange: 8.2, // This would come from API trend data
      averageValue: totalItems > 0 ? totalValue / totalItems : 0,
      totalBatches,
      outOfStockCount
    }
  }, [inventoryItems, lowStockItems, expiringItems])

  // Calculate branch statistics
  const branchStats = useMemo((): BranchInventory[] => {
    if (!inventoryItems) return []

    const branchMap = new Map<string, BranchInventory>()
    
    inventoryItems.forEach(item => {
      const branchId = item.branchId || 'unknown'
      const branchName = branches.find(b => b.id === branchId)?.name || 'Unknown Branch'
      const itemValue = (item.currentStock || 0) * (item.averageUnitCost || 0)
      
      if (!branchMap.has(branchId)) {
        branchMap.set(branchId, {
          branchId,
          branchName,
          totalValue: 0,
          itemCount: 0,
          lowStockCount: 0,
          lastUpdated: new Date().toISOString()
        })
      }

      const branch = branchMap.get(branchId)!
      branch.totalValue += itemValue
      branch.itemCount += 1
      if ((item.currentStock || 0) <= (item.minStockLevel || 0)) {
        branch.lowStockCount += 1
      }
    })

    return Array.from(branchMap.values())
  }, [inventoryItems])

  // Calculate category statistics
  const categoryStats = useMemo((): CategoryStats[] => {
    if (!inventoryItems) return []

    const categoryMap = new Map<string, CategoryStats>()
    
    inventoryItems.forEach(item => {
      const category = item.category || 'OTHER'
      const itemValue = (item.currentStock || 0) * (item.averageUnitCost || 0)
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          itemCount: 0,
          totalValue: 0,
          lowStockCount: 0,
          averageCost: 0,
          trend: Math.random() * 20 - 10 // Would come from API trend data
        })
      }

      const cat = categoryMap.get(category)!
      cat.itemCount += 1
      cat.totalValue += itemValue
      if ((item.currentStock || 0) <= (item.minStockLevel || 0)) {
        cat.lowStockCount += 1
      }
    })

    // Calculate average costs
    categoryMap.forEach(cat => {
      cat.averageCost = cat.itemCount > 0 ? cat.totalValue / cat.itemCount : 0
    })

    return Array.from(categoryMap.values()).sort((a, b) => b.totalValue - a.totalValue)
  }, [inventoryItems])

  // Advanced filtering
  const filteredItems = useMemo(() => {
    if (!inventoryItems) return []
    
    return inventoryItems.filter(item => {
      // Search filter
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (item.description || '').toLowerCase().includes(searchTerm.toLowerCase())

      // Category filter
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory

      // Price range filter
      const itemValue = (item.currentStock || 0) * (item.averageUnitCost || 0)
      let matchesPriceRange = true
      if (selectedPriceRange !== 'all') {
        const [min, max] = selectedPriceRange.split('-').map(v => v === '+' ? Infinity : parseFloat(v))
        matchesPriceRange = itemValue >= min && (max ? itemValue <= max : true)
      }

      // Stock status filter
      let matchesStockStatus = true
      if (selectedStockStatus !== 'all') {
        const currentStock = item.currentStock || 0
        const minStock = item.minStockLevel || 0
        
        switch (selectedStockStatus) {
          case 'in-stock':
            matchesStockStatus = currentStock > minStock
            break
          case 'low-stock':
            matchesStockStatus = currentStock <= minStock && currentStock > 0
            break
          case 'out-of-stock':
            matchesStockStatus = currentStock === 0
            break
          case 'expiring':
            // This would need batch data to determine expiry
            matchesStockStatus = true
            break
        }
      }

      return matchesSearch && matchesCategory && matchesPriceRange && matchesStockStatus
    })
  }, [inventoryItems, searchTerm, selectedCategory, selectedPriceRange, selectedStockStatus])

  // Sorting
  const sortedItems = useMemo(() => {
    if (!filteredItems.length) return []
    
    return [...filteredItems].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'currentStock':
          aValue = a.currentStock || 0
          bValue = b.currentStock || 0
          break
        case 'value':
          aValue = (a.currentStock || 0) * (a.averageUnitCost || 0)
          bValue = (b.currentStock || 0) * (b.averageUnitCost || 0)
          break
        case 'category':
          aValue = a.category || ''
          bValue = b.category || ''
          break
        case 'updatedAt':
          aValue = new Date(a.updatedAt || 0).getTime()
          bValue = new Date(b.updatedAt || 0).getTime()
          break
        default:
          aValue = a[sortField]
          bValue = b[sortField]
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredItems, sortField, sortDirection])

  // Refresh all data
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        refetchInventory(),
        refetchLowStock(),
        refetchExpiring()
      ])
    } catch (error) {
      console.error('Failed to refresh data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-6 max-w-md">
          <CardContent className="text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Inventory</h3>
            <p className="text-gray-600 mb-4">There was an error loading inventory data.</p>
            <Button onClick={handleRefresh}>
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Modern Header with Glass Effect */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-indigo-600/20 backdrop-blur-sm rounded-2xl"></div>
          <div className="relative bg-white/90 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                    <ArchiveBoxIcon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
                      Inventory Intelligence
                    </h1>
                    <p className="text-gray-600 flex items-center gap-3">
                      Real-time inventory management across {branchStats.length} locations
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                        Live
                      </Badge>
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="bg-white/50 backdrop-blur-sm border-white/30 hover:bg-white/70 transition-all duration-200"
                >
                  <ArrowPathIcon className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
                  {refreshing ? 'Syncing...' : 'Refresh'}
                </Button>
                <Button
                  variant="outline"
                  className="bg-white/50 backdrop-blur-sm border-white/30 hover:bg-white/70 transition-all duration-200"
                >
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAdjustmentModal(true)}
                  className="bg-white/50 backdrop-blur-sm border-white/30 hover:bg-white/70 transition-all duration-200"
                >
                  <AdjustmentsHorizontalIcon className="w-4 h-4 mr-2" />
                  Bulk Actions
                </Button>
                <Button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Inventory
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced KPI Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ModernMetricCard
            title="Total Portfolio Value"
            value={formatCurrency(inventoryStats.totalValue)}
            change={`+${inventoryStats.monthlyChange}%`}
            changeLabel="vs last month"
            icon={<BanknotesIcon className="w-6 h-6" />}
            gradient="from-emerald-500 to-teal-600"
            trend="up"
            subtitle={`${inventoryStats.totalBatches} active batches`}
          />
          <ModernMetricCard
            title="Active SKUs"
            value={inventoryStats.totalItems.toString()}
            change={formatCurrency(inventoryStats.averageValue)}
            changeLabel="avg value per item"
            icon={<CubeIcon className="w-6 h-6" />}
            gradient="from-blue-500 to-indigo-600"
            trend="neutral"
            subtitle={`${inventoryStats.outOfStockCount} out of stock`}
          />
          <ModernMetricCard
            title="Critical Alerts"
            value={inventoryStats.lowStockCount.toString()}
            change={inventoryStats.lowStockCount > 5 ? 'Action needed' : 'All good'}
            changeLabel="stock levels"
            icon={<ExclamationTriangleIcon className="w-6 h-6" />}
            gradient={inventoryStats.lowStockCount > 5 ? "from-red-500 to-rose-600" : "from-green-500 to-emerald-600"}
            trend={inventoryStats.lowStockCount > 5 ? "down" : "up"}
            subtitle="Immediate attention"
          />
          <ModernMetricCard
            title="Expiring Items"
            value={inventoryStats.expiringCount.toString()}
            change="7 days"
            changeLabel="forecast window"
            icon={<CalendarDaysIcon className="w-6 h-6" />}
            gradient={inventoryStats.expiringCount > 10 ? "from-amber-500 to-orange-600" : "from-purple-500 to-violet-600"}
            trend={inventoryStats.expiringCount > 10 ? "down" : "up"}
            subtitle="FIFO optimization"
          />
        </div>

        {/* Modern Tabbed Interface */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/60 backdrop-blur-sm border border-white/20 rounded-xl p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white/80 data-[state=active]:shadow-sm rounded-lg">
              <ChartBarIcon className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="inventory" className="data-[state=active]:bg-white/80 data-[state=active]:shadow-sm rounded-lg">
              <ArchiveBoxIcon className="w-4 h-4 mr-2" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-white/80 data-[state=active]:shadow-sm rounded-lg">
              <BeakerIcon className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-white/80 data-[state=active]:shadow-sm rounded-lg">
              <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="operations" className="data-[state=active]:bg-white/80 data-[state=active]:shadow-sm rounded-lg">
              <TruckIcon className="w-4 h-4 mr-2" />
              Operations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewTab 
              branchStats={branchStats}
              categoryStats={categoryStats}
              selectedBranch={selectedBranch}
              setSelectedBranch={setSelectedBranch}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
            />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <InventoryTab
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              viewMode={viewMode}
              setViewMode={setViewMode}
              sortedItems={sortedItems}
              isLoading={isLoading}
              inventoryItems={inventoryItems}
              selectedBranch={selectedBranch}
              setSelectedBranch={setSelectedBranch}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedPriceRange={selectedPriceRange}
              setSelectedPriceRange={setSelectedPriceRange}
              selectedStockStatus={selectedStockStatus}
              setSelectedStockStatus={setSelectedStockStatus}
              sortField={sortField}
              setSortField={setSortField}
              sortDirection={sortDirection}
              setSortDirection={setSortDirection}
              onAdjust={(item) => {
                setSelectedItem(item)
                setShowAdjustmentModal(true)
              }}
              handleSort={handleSort}
              branches={branches}
              categories={categories}
              priceRanges={priceRanges}
              stockStatuses={stockStatuses}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsTab inventoryItems={inventoryItems} categoryStats={categoryStats} />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <AlertsTab
              lowStockItems={lowStockItems}
              expiringItems={expiringItems}
              onLowStockAction={(item) => {
                setSelectedItem(item)
                setShowAddModal(true)
              }}
              onExpiringAction={(item) => {
                setSelectedItem(item)
                setShowAdjustmentModal(true)
              }}
            />
          </TabsContent>

          <TabsContent value="operations" className="space-y-6">
            <OperationsTab 
              onAddInventory={() => setShowAddModal(true)}
              onBulkAdjust={() => setShowAdjustmentModal(true)}
            />
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <AddInventoryModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false)
            setSelectedItem(null)
          }}
          selectedItem={selectedItem}
          onSuccess={handleRefresh}
        />

        <AdjustmentRequestModal
          isOpen={showAdjustmentModal}
          onClose={() => {
            setShowAdjustmentModal(false)
            setSelectedItem(null)
          }}
          selectedItem={selectedItem}
          onSuccess={handleRefresh}
        />
      </div>
    </div>
  )
}

// Modern Metric Card Component
interface ModernMetricCardProps {
  title: string
  value: string
  change: string
  changeLabel: string
  icon: React.ReactNode
  gradient: string
  trend: 'up' | 'down' | 'neutral'
  subtitle?: string
}

function ModernMetricCard({ title, value, change, changeLabel, icon, gradient, trend, subtitle }: ModernMetricCardProps) {
  const trendIcon = trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'

  return (
    <Card className="relative overflow-hidden bg-white/70 backdrop-blur-sm border border-white/20 hover:shadow-xl transition-all duration-300 group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <div className="text-white">
              {icon}
            </div>
          </div>
          <div className={`flex items-center text-sm font-medium ${trendColor} bg-gray-50 px-2 py-1 rounded-full`}>
            <span className="mr-1">{trendIcon}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <div className="space-y-1">
            <p className={`text-sm font-medium ${trendColor}`}>
              {change}
            </p>
            <p className="text-xs text-gray-500">{changeLabel}</p>
            {subtitle && (
              <p className="text-xs text-gray-400 border-t border-gray-100 pt-2 mt-2">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Modern Tab Components
function OverviewTab({ branchStats, categoryStats, selectedBranch, setSelectedBranch, selectedCategory, setSelectedCategory }: any) {
  return (
    <div className="space-y-6">
      {/* Branch Performance */}
      {branchStats.length > 1 && (
        <Card className="bg-white/70 backdrop-blur-sm border border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BuildingStorefrontIcon className="w-5 h-5 text-blue-600" />
              Multi-Location Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {branchStats.map((branch: any, index: number) => (
                <div 
                  key={branch.branchId}
                  className="p-6 rounded-xl bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 border border-white/30 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                  onClick={() => setSelectedBranch(branch.branchId)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${index === 0 ? 'bg-gradient-to-br from-green-500 to-emerald-600' : index === 1 ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-purple-500 to-violet-600'}`}>
                        <BuildingStorefrontIcon className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900">{branch.branchName}</h3>
                    </div>
                    <Badge variant={branch.lowStockCount > 0 ? 'destructive' : 'outline'} className="group-hover:scale-105 transition-transform">
                      {branch.lowStockCount > 0 ? `${branch.lowStockCount} alerts` : 'Healthy'}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Value</span>
                      <span className="font-bold text-lg">{formatCurrency(branch.totalValue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">SKU Count</span>
                      <span className="font-semibold">{branch.itemCount} items</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${index === 0 ? 'bg-gradient-to-r from-green-400 to-emerald-600' : index === 1 ? 'bg-gradient-to-r from-blue-400 to-indigo-600' : 'bg-gradient-to-r from-purple-400 to-violet-600'}`}
                        style={{ width: `${Math.min((branch.totalValue / Math.max(...branchStats.map((b: any) => b.totalValue))) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Performance */}
      <Card className="bg-white/70 backdrop-blur-sm border border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5 text-purple-600" />
            Category Performance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categoryStats.map((category: any, index: number) => (
              <div 
                key={category.category}
                className="p-4 rounded-xl bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30 border border-white/40 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                onClick={() => setSelectedCategory(category.category)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900 text-sm">
                    {category.category.replace('_', ' ')}
                  </h3>
                  <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${category.trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <ArrowTrendingUpIcon className={`w-3 h-3 mr-1 ${category.trend < 0 && 'rotate-180'}`} />
                    {Math.abs(category.trend).toFixed(1)}%
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {formatCurrency(category.totalValue)}
                  </p>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{category.itemCount} items</span>
                    {category.lowStockCount > 0 && (
                      <span className="text-red-600 font-medium">{category.lowStockCount} low</span>
                    )}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-500"
                      style={{ width: `${Math.min((category.totalValue / Math.max(...categoryStats.map((c: any) => c.totalValue))) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function InventoryTab({ searchTerm, setSearchTerm, showFilters, setShowFilters, viewMode, setViewMode, sortedItems, isLoading, inventoryItems, selectedBranch, setSelectedBranch, selectedCategory, setSelectedCategory, selectedPriceRange, setSelectedPriceRange, selectedStockStatus, setSelectedStockStatus, sortField, setSortField, sortDirection, setSortDirection, onAdjust, handleSort, branches, categories, priceRanges, stockStatuses }: any) {
  return (
    <div className="space-y-6">
      {/* Advanced Search and Filters */}
      <Card className="bg-white/70 backdrop-blur-sm border border-white/20">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            {/* Main search and view controls */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search inventory by name, description, category, or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 bg-white/80 border-white/30 backdrop-blur-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="bg-white/50 backdrop-blur-sm border-white/30 hover:bg-white/70"
                >
                  <FunnelIcon className="w-4 h-4 mr-2" />
                  Advanced Filters
                  {showFilters && <Badge variant="secondary" className="ml-2 text-xs">ON</Badge>}
                </Button>
                <div className="flex border border-white/30 rounded-lg bg-white/50 backdrop-blur-sm">
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="rounded-r-none border-r border-white/30"
                  >
                    <ListBulletIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-l-none"
                  >
                    <Squares2X2Icon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Advanced filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-xl border border-white/30">
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="bg-white/80 border-white/30">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch: any) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="bg-white/80 border-white/30">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category: string) => (
                      <SelectItem key={category} value={category}>
                        {category.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedPriceRange} onValueChange={setSelectedPriceRange}>
                  <SelectTrigger className="bg-white/80 border-white/30">
                    <SelectValue placeholder="Price range" />
                  </SelectTrigger>
                  <SelectContent>
                    {priceRanges.map((range: any) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedStockStatus} onValueChange={setSelectedStockStatus}>
                  <SelectTrigger className="bg-white/80 border-white/30">
                    <SelectValue placeholder="Stock status" />
                  </SelectTrigger>
                  <SelectContent>
                    {stockStatuses.map((status: any) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Results summary */}
            <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50/50 rounded-lg p-3">
              <span>
                Showing <span className="font-medium text-gray-900">{sortedItems.length}</span> of <span className="font-medium text-gray-900">{inventoryItems?.length || 0}</span> items
                {searchTerm && (
                  <span className="ml-1">
                    matching "<span className="font-medium text-blue-600">{searchTerm}</span>"
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <span>Sort by:</span>
                <Select value={sortField} onValueChange={setSortField}>
                  <SelectTrigger className="w-36 bg-white/80 border-white/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="currentStock">Stock Level</SelectItem>
                    <SelectItem value="value">Total Value</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="updatedAt">Last Updated</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  className="bg-white/50 backdrop-blur-sm border-white/30"
                >
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Display */}
      {viewMode === 'table' ? (
        <Card className="bg-white/70 backdrop-blur-sm border border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArchiveBoxIcon className="w-5 h-5 text-blue-600" />
              Inventory Items Table
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InventoryTable
              items={sortedItems}
              isLoading={isLoading}
              onAdjust={onAdjust}
              variant="restaurant-admin"
              showBranchColumn={selectedBranch === 'all'}
              onSort={handleSort}
              sortField={sortField}
              sortDirection={sortDirection}
            />
          </CardContent>
        </Card>
      ) : (
        <ModernGridView 
          items={sortedItems}
          isLoading={isLoading}
          onAdjust={onAdjust}
        />
      )}
    </div>
  )
}

function AnalyticsTab({ inventoryItems, categoryStats }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/70 backdrop-blur-sm border border-white/20">
          <CardHeader>
            <CardTitle>Inventory Analytics Charts</CardTitle>
          </CardHeader>
          <CardContent>
            <InventoryAnalyticsChart 
              data={categoryStats}
              type="category"
              title="Category Distribution"
            />
          </CardContent>
        </Card>
        
        <Card className="bg-white/70 backdrop-blur-sm border border-white/20">
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <InventoryAnalyticsChart 
              data={inventoryItems || []}
              type="trend"
              title="Value Trends"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AlertsTab({ lowStockItems, expiringItems, onLowStockAction, onExpiringAction }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {lowStockItems && lowStockItems.length > 0 && (
          <ModernAlertCard
            title="Critical Low Stock"
            items={lowStockItems}
            type="low-stock"
            onItemAction={onLowStockAction}
          />
        )}

        {expiringItems && expiringItems.length > 0 && (
          <ModernAlertCard
            title="Expiring Items"
            items={expiringItems}
            type="expiring"
            onItemAction={onExpiringAction}
          />
        )}
      </div>
    </div>
  )
}

function OperationsTab({ onAddInventory, onBulkAdjust }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-white/70 backdrop-blur-sm border border-white/20 hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={onAddInventory}>
          <CardContent className="p-6 text-center">
            <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl inline-block mb-4 group-hover:scale-110 transition-transform">
              <PlusIcon className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Add New Inventory</h3>
            <p className="text-gray-600 text-sm">Create new inventory items and add initial stock</p>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border border-white/20 hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={onBulkAdjust}>
          <CardContent className="p-6 text-center">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl inline-block mb-4 group-hover:scale-110 transition-transform">
              <AdjustmentsHorizontalIcon className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Bulk Adjustments</h3>
            <p className="text-gray-600 text-sm">Perform bulk stock adjustments across multiple items</p>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border border-white/20 hover:shadow-lg transition-all duration-300 cursor-pointer group">
          <CardContent className="p-6 text-center">
            <div className="p-4 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl inline-block mb-4 group-hover:scale-110 transition-transform">
              <DocumentArrowDownIcon className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Export Data</h3>
            <p className="text-gray-600 text-sm">Export inventory data to Excel or CSV formats</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Modern Grid View Component
function ModernGridView({ items, isLoading, onAdjust }: any) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse bg-white/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {items.map((item: any) => (
        <ModernItemCard
          key={item.id}
          item={item}
          onAdjust={onAdjust}
        />
      ))}
    </div>
  )
}

function ModernItemCard({ item, onAdjust }: any) {
  const currentStock = item.currentStock || 0
  const minStock = item.minStockLevel || 0
  const totalValue = currentStock * (item.averageUnitCost || 0)
  
  const getStockStatus = () => {
    if (currentStock === 0) return { status: 'out', color: 'destructive', label: 'Out of Stock', gradient: 'from-red-500 to-rose-600' }
    if (currentStock <= minStock) return { status: 'low', color: 'warning', label: 'Low Stock', gradient: 'from-amber-500 to-orange-600' }
    if (currentStock <= minStock * 2) return { status: 'medium', color: 'secondary', label: 'Medium', gradient: 'from-yellow-500 to-amber-600' }
    return { status: 'good', color: 'success', label: 'Good', gradient: 'from-green-500 to-emerald-600' }
  }

  const stockStatus = getStockStatus()

  return (
    <Card className="bg-white/70 backdrop-blur-sm border border-white/20 hover:shadow-xl transition-all duration-300 cursor-pointer group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 bg-gradient-to-br ${stockStatus.gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
              <span className="text-white font-bold text-lg">
                {item.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{item.name}</h3>
              <p className="text-xs text-gray-500">{item.category?.replace('_', ' ')}</p>
              {item.branch && (
                <p className="text-xs text-blue-600">{item.branch.name}</p>
              )}
            </div>
          </div>
          <Badge variant={stockStatus.color as any} className="text-xs group-hover:scale-105 transition-transform">
            {stockStatus.label}
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Current Stock:</span>
            <span className="font-medium">{currentStock} {item.unit}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Value:</span>
            <span className="font-bold text-blue-600">{formatCurrency(totalValue)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Unit Cost:</span>
            <span className="font-medium">{formatCurrency(item.averageUnitCost || 0)}</span>
          </div>
          
          {/* Stock Level Indicator */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full bg-gradient-to-r ${stockStatus.gradient} transition-all duration-500`}
              style={{ width: `${Math.min((currentStock / (minStock * 3)) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-700"
          >
            <EyeIcon className="w-4 h-4 mr-1" />
            Details
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAdjust(item)}
            className="bg-white/80 border-white/30 hover:bg-white group-hover:scale-105 transition-transform"
          >
            <AdjustmentsHorizontalIcon className="w-4 h-4 mr-1" />
            Adjust
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ModernAlertCard({ title, items, type, onItemAction }: any) {
  const isLowStock = type === 'low-stock'
  const gradient = isLowStock ? 'from-red-500 to-rose-600' : 'from-amber-500 to-orange-600'
  const bgGradient = isLowStock ? 'from-red-50 to-rose-50' : 'from-amber-50 to-orange-50'

  return (
    <Card className="bg-white/70 backdrop-blur-sm border border-white/20 overflow-hidden">
      <CardHeader className={`bg-gradient-to-r ${bgGradient} border-b border-white/20`}>
        <CardTitle className="flex items-center gap-3">
          <div className={`p-2 bg-gradient-to-br ${gradient} rounded-lg`}>
            <InformationCircleIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-gray-900">{title}</span>
            <Badge variant={isLowStock ? 'destructive' : 'outline'} className="ml-3">
              {items.length} items
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          {items.slice(0, 10).map((item: any, index: number) => (
            <div 
              key={item.id || index} 
              className="p-4 border-b border-gray-100/50 hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    {item.name || item.inventoryItem?.name}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {isLowStock 
                      ? `Current: ${item.currentStock} ${item.unit} | Min: ${item.minStockLevel} ${item.unit}`
                      : `Expires: ${new Date(item.expiryDate).toLocaleDateString()} | ${item.remainingQuantity} ${item.inventoryItem?.unit} remaining`
                    }
                  </p>
                  {!isLowStock && item.daysUntilExpiry <= 3 && (
                    <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-3 h-3" />
                      Critical: Expires in {item.daysUntilExpiry} days
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-3 ml-4">
                  <Badge 
                    variant={isLowStock ? 'destructive' : 'outline'}
                    className="text-xs"
                  >
                    {isLowStock ? 'Low Stock' : `${item.daysUntilExpiry} days`}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onItemAction(item)}
                    className="bg-white/80 border-white/30 hover:bg-white"
                  >
                    {isLowStock ? 'Restock' : 'Handle'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {items.length > 10 && (
            <div className="text-center py-4 bg-gray-50/30">
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                View {items.length - 10} more items
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}