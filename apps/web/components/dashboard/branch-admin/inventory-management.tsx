// apps/web/components/dashboard/branch-admin/inventory-management.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useInventoryItems, useLowStockItems, useExpiringItems } from '@/hooks/use-inventory'
import { InventoryTable } from '../shared/inventory-table'
import { AddInventoryModal } from '../shared/add-inventory-modal'
import { AdjustmentRequestModal } from '../shared/adjustment-request-modal'
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CubeIcon
} from '@heroicons/react/24/outline'

export function InventoryManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)

  const { data: inventoryItems, isLoading } = useInventoryItems({
    category: selectedCategory || undefined
  })
  
  const { data: lowStockItems } = useLowStockItems()
  const { data: expiringItems } = useExpiringItems(7)

  const categories = [
    'RAW_INGREDIENTS', 'FINISHED_PRODUCTS', 'BEVERAGES', 
    'PACKAGING', 'SUPPLIES', 'CLEANING', 'OTHER'
  ]

  const filteredItems = inventoryItems?.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
          <p className="text-gray-600">Track stock levels and manage inventory with FIFO</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowAdjustmentModal(true)}
          >
            Request Adjustment
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Stock
          </Button>
        </div>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-red-600">
                  {lowStockItems?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ClockIcon className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-orange-600">
                  {expiringItems?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CubeIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-blue-600">
                  {inventoryItems?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search inventory items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
        </CardHeader>
        <CardContent>
          <InventoryTable
            items={filteredItems}
            isLoading={isLoading}
            onAdjust={(item) => {
              setSelectedItem(item)
              setShowAdjustmentModal(true)
            }}
          />
        </CardContent>
      </Card>

      {/* Low Stock Alerts */}
      {lowStockItems && lowStockItems.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-800">Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockItems.map((item: any) => (
                <div key={item.id} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-red-900">{item.name}</h4>
                    <Badge variant="destructive" className="text-xs">
                      {item.stockLevel}
                    </Badge>
                  </div>
                  <p className="text-sm text-red-700 mb-3">
                    Current: {item.currentStock} {item.unit} | Min: {item.minStockLevel} {item.unit}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-red-300 text-red-700 hover:bg-red-100"
                    onClick={() => {
                      setSelectedItem(item)
                      setShowAddModal(true)
                    }}
                  >
                    Restock Now
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expiring Items */}
      {expiringItems && expiringItems.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-800">Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expiringItems.map((batch: any) => (
                <div key={batch.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-orange-900">
                      {batch.inventoryItem.name}
                    </h4>
                    <p className="text-sm text-orange-700">
                      Batch: {batch.batchNumber} • {batch.remainingQuantity} {batch.inventoryItem.unit} remaining
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={batch.urgency === 'CRITICAL' ? 'destructive' : 'warning'}>
                      {batch.daysUntilExpiry} days left
                    </Badge>
                    <p className="text-xs text-orange-600 mt-1">
                      Expires: {new Date(batch.expiryDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <AddInventoryModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setSelectedItem(null)
        }}
        selectedItem={selectedItem}
      />

      <AdjustmentRequestModal
        isOpen={showAdjustmentModal}
        onClose={() => {
          setShowAdjustmentModal(false)
          setSelectedItem(null)
        }}
        selectedItem={selectedItem}
      />
    </div>
  )
}