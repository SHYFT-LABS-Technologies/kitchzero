// apps/web/components/dashboard/shared/waste-entry-form.tsx
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
  ExclamationTriangleIcon,
  CubeIcon,
  CalendarIcon,
  MapPinIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface WasteEntryFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  inventoryItems: any[]
  recipes: any[]
  isLoading: boolean
}

const wasteReasons = [
  { value: 'EXPIRED', label: 'Expired', description: 'Item reached expiry date' },
  { value: 'SPOILED', label: 'Spoiled', description: 'Item deteriorated in quality' },
  { value: 'OVERCOOKED', label: 'Overcooked', description: 'Food was overcooked/burnt' },
  { value: 'DROPPED', label: 'Dropped', description: 'Item was accidentally dropped' },
  { value: 'CONTAMINATED', label: 'Contaminated', description: 'Cross-contamination occurred' },
  { value: 'WRONG_ORDER', label: 'Wrong Order', description: 'Incorrect order preparation' },
  { value: 'EXCESS_PREP', label: 'Excess Prep', description: 'Over-prepared for demand' },
  { value: 'CUSTOMER_RETURN', label: 'Customer Return', description: 'Customer sent back item' },
  { value: 'QUALITY_ISSUE', label: 'Quality Issue', description: 'Failed quality standards' },
  { value: 'EQUIPMENT_FAILURE', label: 'Equipment Failure', description: 'Equipment malfunction caused waste' },
  { value: 'OTHER', label: 'Other', description: 'Other reason not listed' }
]

const units = [
  'KG', 'GRAMS', 'POUNDS', 'OUNCES',
  'LITERS', 'ML', 'GALLONS', 'QUARTS', 'CUPS',
  'PIECES', 'BOXES', 'PACKAGES', 'DOZEN',
  'PORTION', 'SERVING'
]

const commonLocations = [
  'Kitchen',
  'Storage Room',
  'Walk-in Cooler',
  'Freezer',
  'Prep Area',
  'Serving Area',
  'Dining Room',
  'Drive-through',
  'Delivery Area'
]

const commonTags = [
  'high-value',
  'recurring-issue',
  'staff-training-needed',
  'equipment-related',
  'supplier-issue',
  'process-improvement',
  'peak-hours',
  'seasonal-item'
]

export function WasteEntryForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  inventoryItems, 
  recipes, 
  isLoading 
}: WasteEntryFormProps) {
  const [formData, setFormData] = useState({
    wasteType: '',
    inventoryItemId: '',
    recipeId: '',
    batchId: '',
    quantity: '',
    unit: '',
    reason: '',
    reasonDetail: '',
    location: '',
    tags: [] as string[],
    customLocation: '',
    customTag: ''
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [estimatedCost, setEstimatedCost] = useState(0)

  useEffect(() => {
    if (formData.wasteType === 'RAW' && formData.inventoryItemId) {
      const item = inventoryItems.find(i => i.id === formData.inventoryItemId)
      setSelectedItem(item)
      if (item?.unit) {
        setFormData(prev => ({ ...prev, unit: item.unit }))
      }
    } else if (formData.wasteType === 'PRODUCT' && formData.recipeId) {
      const recipe = recipes.find(r => r.id === formData.recipeId)
      setSelectedItem(recipe)
      if (recipe?.unit) {
        setFormData(prev => ({ ...prev, unit: recipe.unit || 'PORTION' }))
      }
    } else {
      setSelectedItem(null)
    }
  }, [formData.wasteType, formData.inventoryItemId, formData.recipeId, inventoryItems, recipes])

  useEffect(() => {
    // Calculate estimated cost
    if (selectedItem && formData.quantity) {
      const quantity = parseFloat(formData.quantity)
      const unitCost = selectedItem.averageUnitCost || selectedItem.costPerUnit || 0
      setEstimatedCost(quantity * unitCost)
    } else {
      setEstimatedCost(0)
    }
  }, [selectedItem, formData.quantity])

  const resetForm = () => {
    setFormData({
      wasteType: '',
      inventoryItemId: '',
      recipeId: '',
      batchId: '',
      quantity: '',
      unit: '',
      reason: '',
      reasonDetail: '',
      location: '',
      tags: [],
      customLocation: '',
      customTag: ''
    })
    setErrors({})
    setSelectedItem(null)
    setEstimatedCost(0)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.wasteType) newErrors.wasteType = 'Waste type is required'
    
    if (formData.wasteType === 'RAW' && !formData.inventoryItemId) {
      newErrors.inventoryItemId = 'Inventory item is required for raw waste'
    }
    
    if (formData.wasteType === 'PRODUCT' && !formData.recipeId) {
      newErrors.recipeId = 'Recipe is required for product waste'
    }
    
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = 'Valid quantity is required'
    }
    
    if (!formData.unit) newErrors.unit = 'Unit is required'
    if (!formData.reason) newErrors.reason = 'Reason is required'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    const submitData = {
      wasteType: formData.wasteType,
      inventoryItemId: formData.wasteType === 'RAW' ? formData.inventoryItemId : undefined,
      recipeId: formData.wasteType === 'PRODUCT' ? formData.recipeId : undefined,
      batchId: formData.batchId || undefined,
      quantity: parseFloat(formData.quantity),
      unit: formData.unit,
      reason: formData.reason,
      reasonDetail: formData.reasonDetail || undefined,
      location: formData.customLocation || formData.location || undefined,
      tags: [...formData.tags, ...(formData.customTag ? [formData.customTag] : [])]
    }
    
    onSubmit(submitData)
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  const handleTagToggle = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }))
  }

  const addCustomTag = () => {
    if (formData.customTag && !formData.tags.includes(formData.customTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, prev.customTag],
        customTag: ''
      }))
    }
  }

  const selectedReason = wasteReasons.find(r => r.value === formData.reason)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
            Log Waste Entry
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Waste Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Waste Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    wasteType: 'RAW',
                    inventoryItemId: '',
                    recipeId: '',
                    unit: ''
                  }))}
                  className={cn(
                    'p-4 border rounded-lg text-left transition-all hover:bg-gray-50',
                    formData.wasteType === 'RAW'
                      ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                      : 'border-gray-200'
                  )}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <CubeIcon className="w-5 h-5 text-red-600" />
                    <span className="font-medium">Raw Ingredients</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Unused ingredients, supplies, or raw materials
                  </p>
                </button>

                <button
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    wasteType: 'PRODUCT',
                    inventoryItemId: '',
                    recipeId: '',
                    unit: ''
                  }))}
                  className={cn(
                    'p-4 border rounded-lg text-left transition-all hover:bg-gray-50',
                    formData.wasteType === 'PRODUCT'
                      ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                      : 'border-gray-200'
                  )}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <CalendarIcon className="w-5 h-5 text-red-600" />
                    <span className="font-medium">Finished Products</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Prepared food items, cooked meals, or finished products
                  </p>
                </button>
              </div>
              {errors.wasteType && (
                <p className="text-sm text-red-600 mt-2">{errors.wasteType}</p>
              )}
            </CardContent>
          </Card>

          {/* Item Selection */}
          {formData.wasteType && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {formData.wasteType === 'RAW' ? 'Select Inventory Item' : 'Select Recipe/Product'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.wasteType === 'RAW' ? (
                  <div>
                    <Label htmlFor="inventoryItem">Inventory Item *</Label>
                    <Select 
                      value={formData.inventoryItemId} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, inventoryItemId: value }))}
                    >
                      <SelectTrigger className={errors.inventoryItemId ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select an inventory item" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryItems.map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{item.name}</span>
                              <div className="flex items-center space-x-2 ml-2">
                                <Badge variant="outline" className="text-xs">
                                  {item.category?.replace('_', ' ')}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {item.currentStock} {item.unit}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.inventoryItemId && (
                      <p className="text-sm text-red-600 mt-1">{errors.inventoryItemId}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="recipe">Recipe/Product *</Label>
                    <Select 
                      value={formData.recipeId} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, recipeId: value }))}
                    >
                      <SelectTrigger className={errors.recipeId ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select a recipe or product" />
                      </SelectTrigger>
                      <SelectContent>
                        {recipes.map(recipe => (
                          <SelectItem key={recipe.id} value={recipe.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{recipe.name}</span>
                              <Badge variant="outline" className="text-xs ml-2">
                                {recipe.category}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.recipeId && (
                      <p className="text-sm text-red-600 mt-1">{errors.recipeId}</p>
                    )}
                  </div>
                )}

                {/* Selected Item Preview */}
                {selectedItem && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-blue-900">{selectedItem.name}</h4>
                        <p className="text-sm text-blue-700">
                          {formData.wasteType === 'RAW' 
                            ? `Current stock: ${selectedItem.currentStock || 0} ${selectedItem.unit}`
                            : `Category: ${selectedItem.category || 'N/A'}`
                          }
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-white">
                        {selectedItem.category?.replace('_', ' ') || 'Product'}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Batch Selection for Raw Items */}
                {formData.wasteType === 'RAW' && selectedItem?.batches?.length > 0 && (
                  <div>
                    <Label htmlFor="batch">Select Batch (Optional)</Label>
                    <Select 
                      value={formData.batchId} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, batchId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select specific batch or leave empty" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedItem.batches.map((batch: any) => (
                          <SelectItem key={batch.id} value={batch.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>Batch: {batch.batchNumber}</span>
                              <div className="text-xs text-gray-500 ml-2">
                                {batch.remainingQuantity} {selectedItem.unit}
                                {batch.expiryDate && (
                                  <span className="ml-1">
                                    • Exp: {new Date(batch.expiryDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quantity and Details */}
          {selectedItem && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Waste Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantity Wasted *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                      placeholder="0"
                      className={errors.quantity ? 'border-red-500' : ''}
                    />
                    {errors.quantity && <p className="text-sm text-red-600 mt-1">{errors.quantity}</p>}
                  </div>

                  <div>
                    <Label htmlFor="unit">Unit *</Label>
                    <Select 
                      value={formData.unit} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
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

                {/* Estimated Cost Preview */}
                {estimatedCost > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-red-800">Estimated Cost Impact:</span>
                      <span className="text-lg font-bold text-red-900">
                        ${estimatedCost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="reason">Reason for Waste *</Label>
                  <Select 
                    value={formData.reason} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
                  >
                    <SelectTrigger className={errors.reason ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select reason for waste" />
                    </SelectTrigger>
                    <SelectContent>
                      {wasteReasons.map(reason => (
                        <SelectItem key={reason.value} value={reason.value}>
                          <div>
                            <div className="font-medium">{reason.label}</div>
                            <div className="text-xs text-gray-500">{reason.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.reason && <p className="text-sm text-red-600 mt-1">{errors.reason}</p>}
                </div>

                {selectedReason && (
                  <div>
                    <Label htmlFor="reasonDetail">Additional Details</Label>
                    <Textarea
                      id="reasonDetail"
                      value={formData.reasonDetail}
                      onChange={(e) => setFormData(prev => ({ ...prev, reasonDetail: e.target.value }))}
                      placeholder={`Provide more details about ${selectedReason.label.toLowerCase()}...`}
                      rows={3}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Location and Tags */}
          {selectedItem && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Location & Classification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Select 
                    value={formData.location} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, location: value, customLocation: '' }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location or enter custom below" />
                    </SelectTrigger>
                    <SelectContent>
                      {commonLocations.map(location => (
                        <SelectItem key={location} value={location}>
                          <div className="flex items-center">
                            <MapPinIcon className="w-4 h-4 mr-2 text-gray-400" />
                            {location}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="customLocation">Custom Location</Label>
                  <Input
                    id="customLocation"
                    value={formData.customLocation}
                    onChange={(e) => setFormData(prev => ({ ...prev, customLocation: e.target.value, location: '' }))}
                    placeholder="Enter specific location if not listed above"
                  />
                </div>

                <div>
                  <Label>Tags (Optional)</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {commonTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className={cn(
                          'px-3 py-2 text-sm border rounded-lg text-left transition-all',
                          formData.tags.includes(tag)
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:bg-gray-50'
                        )}
                      >
                        <div className="flex items-center">
                          <TagIcon className="w-3 h-3 mr-2" />
                          {tag}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Input
                    value={formData.customTag}
                    onChange={(e) => setFormData(prev => ({ ...prev, customTag: e.target.value }))}
                    placeholder="Add custom tag"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCustomTag}
                    disabled={!formData.customTag}
                  >
                    Add Tag
                  </Button>
                </div>

                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {formData.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleTagToggle(tag)}
                          className="ml-1 hover:text-red-600"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
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
            disabled={isLoading || !selectedItem}
          >
            {isLoading ? 'Logging...' : 'Log Waste Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}