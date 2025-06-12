// apps/web/components/dashboard/shared/add-inventory-modal.tsx
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  PlusIcon,
  CubeIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  TruckIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface AddInventoryModalProps {
  isOpen: boolean
  onClose: () => void
  selectedItem?: any
  onSuccess?: () => void
}

const categories = [
  'RAW_INGREDIENTS',
  'FINISHED_PRODUCTS', 
  'BEVERAGES',
  'PACKAGING',
  'SUPPLIES',
  'CLEANING',
  'OTHER'
]

const units = [
  'KG', 'GRAMS', 'POUNDS', 'OUNCES',
  'LITERS', 'ML', 'GALLONS', 'QUARTS', 'CUPS',
  'PIECES', 'BOXES', 'PACKAGES', 'DOZEN',
  'PORTION', 'SERVING'
]

export function AddInventoryModal({ isOpen, onClose, selectedItem }: AddInventoryModalProps) {
  const [step, setStep] = useState<'item' | 'batch'>('item')
  const [itemData, setItemData] = useState({
    name: '',
    description: '',
    category: '',
    unit: '',
    minStockLevel: '',
    maxStockLevel: '',
    isPerishable: false,
    defaultShelfLife: '',
    supplierId: ''
  })
  
  const [batchData, setBatchData] = useState({
    batchNumber: '',
    quantity: '',
    unitCost: '',
    expiryDate: '',
    supplierBatchNumber: '',
    qualityGrade: '',
    notes: ''
  })

  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (selectedItem) {
      setStep('batch')
      setItemData({
        name: selectedItem.name || '',
        description: selectedItem.description || '',
        category: selectedItem.category || '',
        unit: selectedItem.unit || '',
        minStockLevel: selectedItem.minStockLevel?.toString() || '',
        maxStockLevel: selectedItem.maxStockLevel?.toString() || '',
        isPerishable: selectedItem.isPerishable || false,
        defaultShelfLife: selectedItem.defaultShelfLife?.toString() || '',
        supplierId: selectedItem.supplierId || ''
      })
    } else {
      setStep('item')
      resetForm()
    }
  }, [selectedItem])

  const resetForm = () => {
    setItemData({
      name: '',
      description: '',
      category: '',
      unit: '',
      minStockLevel: '',
      maxStockLevel: '',
      isPerishable: false,
      defaultShelfLife: '',
      supplierId: ''
    })
    setBatchData({
      batchNumber: '',
      quantity: '',
      unitCost: '',
      expiryDate: '',
      supplierBatchNumber: '',
      qualityGrade: '',
      notes: ''
    })
    setErrors({})
  }

  const validateItemForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!itemData.name.trim()) newErrors.name = 'Item name is required'
    if (!itemData.category) newErrors.category = 'Category is required'
    if (!itemData.unit) newErrors.unit = 'Unit is required'
    if (!itemData.minStockLevel || parseFloat(itemData.minStockLevel) < 0) {
      newErrors.minStockLevel = 'Valid minimum stock level is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateBatchForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!batchData.batchNumber.trim()) newErrors.batchNumber = 'Batch number is required'
    if (!batchData.quantity || parseFloat(batchData.quantity) <= 0) {
      newErrors.quantity = 'Valid quantity is required'
    }
    if (!batchData.unitCost || parseFloat(batchData.unitCost) < 0) {
      newErrors.unitCost = 'Valid unit cost is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleItemSubmit = () => {
    if (validateItemForm()) {
      setStep('batch')
      // Generate a suggested batch number
      setBatchData(prev => ({
        ...prev,
        batchNumber: `${itemData.name.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`
      }))
    }
  }

  const handleFinalSubmit = async () => {
    if (!validateBatchForm()) return

    setIsLoading(true)
    try {
      // Here you would make the API calls to create the item and batch
      console.log('Creating item:', itemData)
      console.log('Adding batch:', batchData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      onClose()
      resetForm()
    } catch (error) {
      console.error('Error creating inventory:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
    resetForm()
    setStep('item')
  }

  const totalValue = parseFloat(batchData.quantity || '0') * parseFloat(batchData.unitCost || '0')

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CubeIcon className="w-5 h-5" />
            {selectedItem ? 'Add Stock to Existing Item' : 'Add New Inventory Item'}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center space-x-4 mb-6">
          <div className={cn(
            'flex items-center space-x-2 px-3 py-2 rounded-lg',
            step === 'item' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
          )}>
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium',
              step === 'item' ? 'bg-blue-600 text-white' : 'bg-gray-400 text-white'
            )}>
              1
            </div>
            <span className="text-sm font-medium">Item Details</span>
          </div>
          <div className="flex-1 h-px bg-gray-300"></div>
          <div className={cn(
            'flex items-center space-x-2 px-3 py-2 rounded-lg',
            step === 'batch' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
          )}>
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium',
              step === 'batch' ? 'bg-blue-600 text-white' : 'bg-gray-400 text-white'
            )}>
              2
            </div>
            <span className="text-sm font-medium">Stock Details</span>
          </div>
        </div>

        {step === 'item' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Item Name *</Label>
                  <Input
                    id="name"
                    value={itemData.name}
                    onChange={(e) => setItemData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Organic Tomatoes"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={itemData.description}
                    onChange={(e) => setItemData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description of the item"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select 
                      value={itemData.category} 
                      onValueChange={(value) => setItemData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category.replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category && <p className="text-sm text-red-600 mt-1">{errors.category}</p>}
                  </div>

                  <div>
                    <Label htmlFor="unit">Unit of Measurement *</Label>
                    <Select 
                      value={itemData.unit} 
                      onValueChange={(value) => setItemData(prev => ({ ...prev, unit: value }))}
                    >
                      <SelectTrigger className={errors.unit ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map(unit => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.unit && <p className="text-sm text-red-600 mt-1">{errors.unit}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Stock Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minStock">Minimum Stock Level *</Label>
                    <Input
                      id="minStock"
                      type="number"
                      min="0"
                      step="0.01"
                      value={itemData.minStockLevel}
                      onChange={(e) => setItemData(prev => ({ ...prev, minStockLevel: e.target.value }))}
                      placeholder="0"
                      className={errors.minStockLevel ? 'border-red-500' : ''}
                    />
                    {errors.minStockLevel && <p className="text-sm text-red-600 mt-1">{errors.minStockLevel}</p>}
                  </div>

                  <div>
                    <Label htmlFor="maxStock">Maximum Stock Level</Label>
                    <Input
                      id="maxStock"
                      type="number"
                      min="0"
                      step="0.01"
                      value={itemData.maxStockLevel}
                      onChange={(e) => setItemData(prev => ({ ...prev, maxStockLevel: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="perishable"
                    checked={itemData.isPerishable}
                    onChange={(e) => setItemData(prev => ({ ...prev, isPerishable: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="perishable">This item is perishable</Label>
                </div>

                {itemData.isPerishable && (
                  <div>
                    <Label htmlFor="shelfLife">Default Shelf Life (days)</Label>
                    <Input
                      id="shelfLife"
                      type="number"
                      min="1"
                      value={itemData.defaultShelfLife}
                      onChange={(e) => setItemData(prev => ({ ...prev, defaultShelfLife: e.target.value }))}
                      placeholder="e.g., 7"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'batch' && (
          <div className="space-y-6">
            {selectedItem && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-blue-900">{selectedItem.name}</h3>
                      <p className="text-sm text-blue-700">
                        Current stock: {selectedItem.currentStock || 0} {selectedItem.unit}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-white">
                      {(selectedItem.category || '').replace('_', ' ')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TruckIcon className="w-5 h-5" />
                  Batch Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="batchNumber">Batch Number *</Label>
                    <Input
                      id="batchNumber"
                      value={batchData.batchNumber}
                      onChange={(e) => setBatchData(prev => ({ ...prev, batchNumber: e.target.value }))}
                      placeholder="e.g., TOM-123456"
                      className={errors.batchNumber ? 'border-red-500' : ''}
                    />
                    {errors.batchNumber && <p className="text-sm text-red-600 mt-1">{errors.batchNumber}</p>}
                  </div>

                  <div>
                    <Label htmlFor="supplierBatch">Supplier Batch Number</Label>
                    <Input
                      id="supplierBatch"
                      value={batchData.supplierBatchNumber}
                      onChange={(e) => setBatchData(prev => ({ ...prev, supplierBatchNumber: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantity *</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="quantity"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={batchData.quantity}
                        onChange={(e) => setBatchData(prev => ({ ...prev, quantity: e.target.value }))}
                        placeholder="0"
                        className={errors.quantity ? 'border-red-500' : ''}
                      />
                      <div className="flex items-center px-3 bg-gray-100 border rounded-md">
                        <span className="text-sm text-gray-600">{itemData.unit || 'Unit'}</span>
                      </div>
                    </div>
                    {errors.quantity && <p className="text-sm text-red-600 mt-1">{errors.quantity}</p>}
                  </div>

                  <div>
                    <Label htmlFor="unitCost">Unit Cost *</Label>
                    <div className="relative">
                      <CurrencyDollarIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="unitCost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={batchData.unitCost}
                        onChange={(e) => setBatchData(prev => ({ ...prev, unitCost: e.target.value }))}
                        placeholder="0.00"
                        className={cn('pl-10', errors.unitCost ? 'border-red-500' : '')}
                      />
                    </div>
                    {errors.unitCost && <p className="text-sm text-red-600 mt-1">{errors.unitCost}</p>}
                  </div>
                </div>

                {(itemData.isPerishable || selectedItem?.isPerishable) && (
                  <div>
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="expiryDate"
                        type="date"
                        value={batchData.expiryDate}
                        onChange={(e) => setBatchData(prev => ({ ...prev, expiryDate: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="qualityGrade">Quality Grade</Label>
                  <Select 
                    value={batchData.qualityGrade} 
                    onValueChange={(value) => setBatchData(prev => ({ ...prev, qualityGrade: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select quality grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Grade A - Premium</SelectItem>
                      <SelectItem value="B">Grade B - Standard</SelectItem>
                      <SelectItem value="C">Grade C - Basic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={batchData.notes}
                    onChange={(e) => setBatchData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any additional notes about this batch"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-lg text-green-900">Batch Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-700">Total Quantity:</span>
                    <p className="font-medium text-green-900">
                      {batchData.quantity || 0} {itemData.unit || selectedItem?.unit}
                    </p>
                  </div>
                  <div>
                    <span className="text-green-700">Total Value:</span>
                    <p className="font-medium text-green-900">
                      ${totalValue.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-green-700">Unit Cost:</span>
                    <p className="font-medium text-green-900">
                      ${batchData.unitCost || 0} per {itemData.unit || selectedItem?.unit}
                    </p>
                  </div>
                  {(batchData.expiryDate) && (
                    <div>
                      <span className="text-green-700">Expires:</span>
                      <p className="font-medium text-green-900">
                        {new Date(batchData.expiryDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          <div>
            {step === 'batch' && !selectedItem && (
              <Button
                variant="outline"
                onClick={() => setStep('item')}
                disabled={isLoading}
              >
                Back to Item Details
              </Button>
            )}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            {step === 'item' ? (
              <Button onClick={handleItemSubmit} disabled={isLoading}>
                Continue to Stock Details
              </Button>
            ) : (
              <Button onClick={handleFinalSubmit} disabled={isLoading}>
                {isLoading ? 'Adding...' : selectedItem ? 'Add Stock' : 'Create Item & Add Stock'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}