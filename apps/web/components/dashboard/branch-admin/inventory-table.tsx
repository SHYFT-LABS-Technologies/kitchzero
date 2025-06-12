// apps/web/components/dashboard/branch-admin/inventory-table.tsx
'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  AdjustmentsHorizontalIcon,
  EyeIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { formatCurrency } from '@/lib/utils'

interface InventoryTableProps {
  items: any[]
  isLoading: boolean
  onAdjust: (item: any) => void
}

export function InventoryTable({ items, isLoading, onAdjust }: InventoryTableProps) {
  if (isLoading) {
    return <TableSkeleton />
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No inventory items found</p>
      </div>
    )
  }

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case 'OUT_OF_STOCK':
        return <Badge variant="destructive">Out of Stock</Badge>
      case 'CRITICAL':
        return <Badge variant="destructive">Critical</Badge>
      case 'LOW':
        return <Badge variant="warning">Low</Badge>
      case 'OVERSTOCK':
        return <Badge variant="secondary">Overstock</Badge>
      default:
        return <Badge variant="success">Normal</Badge>
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Item</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Category</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-900">Current Stock</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-900">Min/Max</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-900">Status</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-900">Value</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-900">FIFO Batches</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-900">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-4 px-4">
                <div>
                  <div className="font-medium text-gray-900">{item.name}</div>
                  {item.description && (
                    <div className="text-sm text-gray-500">{item.description}</div>
                  )}
                  {item.supplier && (
                    <div className="text-xs text-gray-400">
                      Supplier: {item.supplier.name}
                    </div>
                  )}
                </div>
              </td>
              <td className="py-4 px-4">
                <Badge variant="outline">
                  {item.category.replace('_', ' ')}
                </Badge>
              </td>
              <td className="py-4 px-4 text-right">
                <div className="font-medium">
                  {item.currentStock} {item.unit}
                </div>
                {item.daysOfStock && (
                  <div className="text-xs text-gray-500">
                    ~{item.daysOfStock} days left
                  </div>
                )}
              </td>
              <td className="py-4 px-4 text-right text-sm text-gray-600">
                <div>Min: {item.minStockLevel}</div>
                {item.maxStockLevel && (
                  <div>Max: {item.maxStockLevel}</div>
                )}
              </td>
              <td className="py-4 px-4 text-center">
                {getStockStatusBadge(item.stockStatus)}
              </td>
              <td className="py-4 px-4 text-right">
                <div className="font-medium">
                  {formatCurrency(item.totalValue || 0)}
                </div>
                <div className="text-xs text-gray-500">
                  Avg: {formatCurrency(item.averageCost)}
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="space-y-1">
                  {item.fifoOrder?.slice(0, 3).map((batch: any, index: number) => (
                    <div key={batch.id} className="text-xs p-2 bg-gray-50 rounded border">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">#{batch.fifoPosition}</span>
                        <span>{batch.remainingQuantity} {item.unit}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-gray-500">
                          {formatCurrency(batch.unitCost)}
                        </span>
                        {batch.expiryDate && (
                          <div className="flex items-center space-x-1">
                            <ClockIcon className="w-3 h-3 text-gray-400" />
                            <span className={`text-xs ${
                              batch.daysUntilExpiry <= 3 ? 'text-red-600' :
                              batch.daysUntilExpiry <= 7 ? 'text-orange-600' :
                              'text-gray-500'
                            }`}>
                              {batch.daysUntilExpiry}d
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {item.fifoOrder?.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{item.fifoOrder.length - 3} more batches
                    </div>
                  )}
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAdjust(item)}
                  >
                    <AdjustmentsHorizontalIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/6"></div>
            <div className="h-4 bg-gray-200 rounded w-1/6"></div>
           <div className="h-4 bg-gray-200 rounded w-1/8"></div>
           <div className="h-4 bg-gray-200 rounded w-1/8"></div>
           <div className="h-4 bg-gray-200 rounded w-1/6"></div>
           <div className="h-4 bg-gray-200 rounded w-1/4"></div>
           <div className="h-4 bg-gray-200 rounded w-1/8"></div>
         </div>
       </div>
     ))}
   </div>
 )
}