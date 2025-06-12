// apps/web/components/dashboard/shared/adjustment-request-modal.tsx
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
  PencilIcon,
  MinusIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface AdjustmentRequestModalProps {
  isOpen: boolean
  onClose: () => void
  selectedItem?: any
}

const adjustmentTypes = [
  { value: 'RECEIVED', label: 'Stock Received', icon: PlusIcon, color: 'text-green-600' },
  { value: 'SOLD', label: 'Stock Sold', icon: MinusIcon, color: 'text-blue-600' },
  { value: 'WASTE', label: 'Waste/Spoilage', icon: ExclamationTriangleIcon, color: 'text-red-600' },
  { value: 'TRANSFER', label: 'Branch Transfer', icon: PlusIcon, color: 'text-purple-600' },
  { value: 'COUNT', label: 'Physical Count', icon: PencilIcon, color: 'text-gray-600' },
  { value: 'DAMAGED', label: 'Damaged Items', icon: ExclamationTriangleIcon, color: 'text-orange-600' },
  { value: 'THEFT', label: 'Theft/Loss', icon: MinusIcon, color: 'text-red-600' },
  { value: 'OTHER', label: 'Other Adjustment', icon: PencilIcon, color: 'text-gray-600' }
]

const predefinedReasons = {
  RECEIVED: [
    'New delivery received',
    'Emergency restock',
    'Supplier adjustment',
    'Return from branch'
  ],
  SOLD: [
    'Regular sales',
    'Bulk order',
    'Catering order',
    'Special event'
  ],
  WASTE: [
    'Expiry date reached',
    'Quality deterioration',
    'Contamination',
    'Overproduction'
  ],
  TRANSFER: [
    'Transfer to main branch',
    'Transfer to north branch',
    'Transfer to east branch',
    'Emergency stock share'
  ],
  COUNT: [
    'Physical count difference',
    'System synchronization',
    'Audit adjustment',
    'Inventory reconciliation'
  ],
  DAMAGED: [
    'Damaged in storage',
    'Damaged during transport',
    'Equipment malfunction',
    'Packaging failure'
  ],
  THEFT: [
    'Reported theft',
    'Unexplained shortage',
    'Security incident',
    'Internal investigation'
  ],
  OTHER: [
    'Customer return',
    'Promotional giveaway',
    'Staff consumption',
    'Training/testing'
  ]
}

export function AdjustmentRequestModal({ isOpen, onClose, selectedItem }: AdjustmentRequestModalProps) {
  const [formData, setFormData] = useState({
    adjustmentType: '',
    quantity: '',
    reason: '',
    customReason: '',
    notes: '',
    targetBranch: '',
    urgency: 'NORMAL'
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [quantityDirection, setQuantityDirection] = useState<'positive' | 'negative'>('positive')

  useEffect(() => {
    if (selectedItem) {
      // Reset form when modal opens with a selected item
      setFormData({
        adjustmentType: '',
        quantity: '',
        reason: '',
        customReason: '',
        notes: '',
        targetBranch: '',
        urgency: 'NORMAL'
      })
      setErrors({})
    }
  }, [selectedItem])

  const resetForm = () => {
    setFormData({
      adjustmentType: '',
      quantity: '',
      reason: '',
      customReason: '',
      notes: '',
      targetBranch: '',
      urgency: 'NORMAL'
    })
    setErrors({})
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.adjustmentType) newErrors.adjustmentType = 'Adjustment type is required'
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = 'Valid quantity is required'
    }
    if (!formData.reason && !formData.customReason) {
      newErrors.reason = 'Reason is required'
    }
    if (formData.adjustmentType === 'TRANSFER' && !formData.targetBranch) {
      newErrors.targetBranch = 'Target branch is required for transfers'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAdjustmentTypeChange = (value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      adjustmentType: value,
      reason: '', // Reset reason when type changes
      customReason: '',
      targetBranch: ''
    }))
    
    // Set quantity direction based on adjustment type
    const type = adjustmentTypes.find(t => t.value === value)
    if (type) {
      const isNegative = ['SOLD', 'WASTE', 'DAMAGED', 'THEFT'].includes(value)
      setQuantityDirection(isNegative ? 'negative' : 'positive')
    }
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const adjustmentData = {
        inventoryItemId: selectedItem?.id,
        adjustmentType: formData.adjustmentType,
        quantity: quantityDirection === 'negative' ? -parseFloat(formData.quantity) : parseFloat(formData.quantity),
        reason: formData.customReason || formData.reason,
        notes: formData.notes,
        targetBranch: formData.targetBranch,
        urgency: formData.urgency
      }
      
      console.log('Submitting adjustment:', adjustmentData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      onClose()
      resetForm()
    } catch (error) {
      console.error('Error submitting adjustment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  const selectedType = adjustmentTypes.find(t => t.value === formData.adjustmentType)
  const availableReasons = formData.adjustmentType ? predefinedReasons[formData.adjustmentType as keyof typeof predefinedReasons] || [] : []
  const currentStock = selectedItem?.currentStock || 0
  const adjustmentQuantity = parseFloat(formData.quantity) || 0
  const newStock = quantityDirection === 'negative' ? currentStock - adjustmentQuantity : currentStock + adjustmentQuantity

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PencilIcon className="w-5 h-5" />
            Request Inventory Adjustment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item Information */}
          {selectedItem && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-blue-900">{selectedItem.name}</h3>
                    <p className="text-sm text-blue-700">
                      Current stock: {currentStock} {selectedItem.unit}
                    </p>
                    {selectedItem.minStockLevel && (
                      <p className="text-xs text-blue-600">
                        Minimum level: {selectedItem.minStockLevel} {selectedItem.unit}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="bg-white">
                      {(selectedItem.category || '').replace('_', ' ')}
                    </Badge>
                    {currentStock <= selectedItem.minStockLevel && (
                      <Badge variant="destructive" className="ml-2">
                        Low Stock
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Adjustment Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Adjustment Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {adjustmentTypes.map(type => {
                  const Icon = type.icon
                  return (
                    <button
                      key={type.value}
                      onClick={() => handleAdjustmentTypeChange(type.value)}
                      className={cn(
                        'p-3 border rounded-lg text-left transition-all hover:bg-gray-50',
                        formData.adjustmentType === type.value
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200'
                      )}
                    >
                      <div className="flex items-center space-x-2">
                        <Icon className={cn('w-4 h-4', type.color)} />
                        <span className="text-sm font-medium">{type.label}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
              {errors.adjustmentType && (
                <p className="text-sm text-red-600 mt-2">{errors.adjustmentType}</p>
              )}
            </CardContent>
          </Card>

          {/* Quantity */}
          {formData.adjustmentType && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quantity Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="quantity">
                    Quantity ({quantityDirection === 'negative' ? 'Decrease' : 'Increase'}) *
                  </Label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <span className={cn(
                        'absolute left-3 top-3 text-sm font-medium',
                        quantityDirection === 'negative' ? 'text-red-600' : 'text-green-600'
                      )}>
                        {quantityDirection === 'negative' ? '-' : '+'}
                      </span>
                      <Input
                        id="quantity"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={formData.quantity}
                        onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                        placeholder="0"
                        className={cn('pl-8', errors.quantity ? 'border-red-500' : '')}
                      />
                    </div>
                    <div className="flex items-center px-3 bg-gray-100 border rounded-md">
                      <span className="text-sm text-gray-600">{selectedItem?.unit || 'Unit'}</span>
                    </div>
                  </div>
                  {errors.quantity && <p className="text-sm text-red-600 mt-1">{errors.quantity}</p>}
                </div>

                {/* Stock Preview */}
                {formData.quantity && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Current Stock:</span>
                      <span className="font-medium">{currentStock} {selectedItem?.unit}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Adjustment:</span>
                      <span className={cn(
                        'font-medium',
                        quantityDirection === 'negative' ? 'text-red-600' : 'text-green-600'
                      )}>
                        {quantityDirection === 'negative' ? '-' : '+'}{adjustmentQuantity} {selectedItem?.unit}
                      </span>
                    </div>
                    <div className="border-t border-gray-200 mt-2 pt-2">
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span>New Stock Level:</span>
                        <span className={cn(
                          newStock < 0 ? 'text-red-600' : 
                          selectedItem?.minStockLevel && newStock <= selectedItem.minStockLevel ? 'text-yellow-600' : 'text-green-600'
                        )}>
                          {newStock} {selectedItem?.unit}
                        </span>
                      </div>
                      {newStock < 0 && (
                        <div className="flex items-center mt-1 text-xs text-red-600">
                          <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                          Warning: This would result in negative stock
                        </div>
                      )}
                      {selectedItem?.minStockLevel && newStock <= selectedItem.minStockLevel && newStock >= 0 && (
                        <div className="flex items-center mt-1 text-xs text-yellow-600">
                          <InformationCircleIcon className="w-3 h-3 mr-1" />
                          Warning: Stock will be below minimum level
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reason and Details */}
          {formData.adjustmentType && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Reason & Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {availableReasons.length > 0 && (
                  <div>
                    <Label htmlFor="reason">Select Reason</Label>
                    <Select 
                      value={formData.reason} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value, customReason: '' }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a reason or enter custom below" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableReasons.map(reason => (
                          <SelectItem key={reason} value={reason}>
                            {reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="customReason">
                    {formData.reason ? 'Additional Details' : 'Custom Reason *'}
                  </Label>
                  <Input
                    id="customReason"
                    value={formData.customReason}
                    onChange={(e) => setFormData(prev => ({ ...prev, customReason: e.target.value }))}
                    placeholder={formData.reason ? 'Optional additional details' : 'Enter reason for adjustment'}
                    className={errors.reason ? 'border-red-500' : ''}
                  />
                </div>

                {formData.adjustmentType === 'TRANSFER' && (
                  <div>
                    <Label htmlFor="targetBranch">Target Branch *</Label>
                    <Select 
                      value={formData.targetBranch} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, targetBranch: value }))}
                    >
                      <SelectTrigger className={errors.targetBranch ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select destination branch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main">Main Branch</SelectItem>
                        <SelectItem value="north">North Branch</SelectItem>
                        <SelectItem value="east">East Branch</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.targetBranch && (
                      <p className="text-sm text-red-600 mt-1">{errors.targetBranch}</p>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="urgency">Priority Level</Label>
                  <Select 
                    value={formData.urgency} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, urgency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low - Routine adjustment</SelectItem>
                      <SelectItem value="NORMAL">Normal - Standard priority</SelectItem>
                      <SelectItem value="HIGH">High - Urgent attention needed</SelectItem>
                      <SelectItem value="CRITICAL">Critical - Immediate action required</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any additional information about this adjustment"
                    rows={3}
                  />
                </div>

                {errors.reason && (
                  <p className="text-sm text-red-600">{errors.reason}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !formData.adjustmentType}
          >
            {isLoading ? 'Submitting...' : 'Submit Adjustment Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}