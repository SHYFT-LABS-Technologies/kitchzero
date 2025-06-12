// apps/web/components/dashboard/shared/inventory-table.tsx
'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  PencilIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  CubeIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface InventoryTableProps {
  items: any[]
  isLoading: boolean
  onAdjust: (item: any) => void
  variant?: 'branch-admin' | 'restaurant-admin'
  showBranchColumn?: boolean
  onSort?: (field: string) => void
  sortField?: string
  sortDirection?: 'asc' | 'desc'
}

export function InventoryTable({ 
  items, 
  isLoading, 
  onAdjust, 
  variant = 'branch-admin',
  showBranchColumn = false,
  onSort,
  sortField: externalSortField,
  sortDirection: externalSortDirection
}: InventoryTableProps) {
  const [internalSortField, setInternalSortField] = useState<string>('name')
  const [internalSortDirection, setInternalSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // Use external sort if provided, otherwise use internal
  const sortField = externalSortField || internalSortField
  const sortDirection = externalSortDirection || internalSortDirection

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  const getStockStatus = (item: any) => {
    const stockLevel = item.currentStock || 0
    const minLevel = item.minStockLevel || 0
    
    if (stockLevel === 0) return { status: 'out', color: 'destructive', label: 'Out of Stock' }
    if (stockLevel <= minLevel) return { status: 'low', color: 'warning', label: 'Low Stock' }
    if (stockLevel <= minLevel * 2) return { status: 'medium', color: 'secondary', label: 'Medium' }
    return { status: 'good', color: 'success', label: 'Good' }
  }

  const sortedItems = [...items].sort((a, b) => {
    const aValue = a[sortField] || ''
    const bValue = b[sortField] || ''
    
    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const handleSort = (field: string) => {
    if (onSort) {
      // Use external sort handler
      onSort(field)
    } else {
      // Use internal sort
      if (sortField === field) {
        setInternalSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
      } else {
        setInternalSortField(field)
        setInternalSortDirection('asc')
      }
    }
  }

  if (isLoading) {
    return <InventoryTableSkeleton />
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <CubeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Inventory Items</h3>
        <p className="text-gray-600">No inventory items found matching your criteria.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => handleSort('name')}
            >
              Item Name
              {sortField === 'name' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </TableHead>
            <TableHead>Category</TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => handleSort('currentStock')}
            >
              Current Stock
              {sortField === 'currentStock' && (
                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </TableHead>
            <TableHead>Min Level</TableHead>
            <TableHead>Status</TableHead>
            {variant === 'restaurant-admin' && (
              <TableHead>Total Value</TableHead>
            )}
            {showBranchColumn && (
              <TableHead>Branch</TableHead>
            )}
            <TableHead>Last Updated</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedItems.map((item) => {
            const stockStatus = getStockStatus(item)
            const totalValue = (item.currentStock || 0) * (item.averageUnitCost || 0)
            
            return (
              <TableRow key={item.id} className="hover:bg-gray-50/50">
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {item.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.description && (
                        <p className="text-sm text-gray-500 truncate max-w-[200px]">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {(item.category || '').replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {item.currentStock || 0}
                    </span>
                    <span className="text-sm text-gray-500">
                      {item.unit}
                    </span>
                    {stockStatus.status === 'out' && (
                      <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                    )}
                    {stockStatus.status === 'low' && (
                      <ClockIcon className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-600">
                    {item.minStockLevel || 0} {item.unit}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={stockStatus.color as any}
                    className="text-xs"
                  >
                    {stockStatus.label}
                  </Badge>
                </TableCell>
                {variant === 'restaurant-admin' && (
                  <TableCell>
                    <span className="font-medium">
                      {formatCurrency(totalValue)}
                    </span>
                  </TableCell>
                )}
                {showBranchColumn && (
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {item.branch?.name || 'Unknown'}
                    </span>
                  </TableCell>
                )}
                <TableCell>
                  <span className="text-sm text-gray-500">
                    {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAdjust(item)}
                      className="text-xs"
                    >
                      <PencilIcon className="w-3 h-3 mr-1" />
                      {variant === 'restaurant-admin' ? 'Manage' : 'Adjust'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs"
                    >
                      <EyeIcon className="w-3 h-3 mr-1" />
                      View
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function InventoryTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Min Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-48 animate-pulse"></div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                    <div className="h-8 bg-gray-200 rounded w-12 animate-pulse"></div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}