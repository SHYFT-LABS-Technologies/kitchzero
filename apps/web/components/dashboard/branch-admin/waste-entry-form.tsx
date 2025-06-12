// apps/web/components/dashboard/branch-admin/waste-entry-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const wasteEntrySchema = z.object({
  wasteType: z.enum(['RAW', 'PRODUCT']),
  inventoryItemId: z.string().optional(),
  recipeId: z.string().optional(),
  quantity: z.number().min(0.01),
  unit: z.string().min(1),
  reason: z.enum(['EXPIRED', 'SPOILED', 'OVERCOOKED', 'DROPPED', 'CONTAMINATED', 'WRONG_ORDER', 'EXCESS_PREP', 'CUSTOMER_RETURN', 'QUALITY_ISSUE', 'EQUIPMENT_FAILURE', 'OTHER']),
  reasonDetail: z.string().optional(),
  location: z.string().optional(),
  tags: z.array(z.string()).optional()
})

interface WasteEntryFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  inventoryItems: any[]
  recipes: any[]
  isLoading: boolean
}

export function WasteEntryForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  inventoryItems, 
  recipes, 
  isLoading 
}: WasteEntryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch
  } = useForm({
    resolver: zodResolver(wasteEntrySchema),
    mode: 'onChange'
  })

  const wasteType = watch('wasteType')

  const handleFormSubmit = (data: any) => {
    onSubmit(data)
    reset()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Waste Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="wasteType">Waste Type</Label>
            <select
              id="wasteType"
              {...register('wasteType')}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select type</option>
              <option value="RAW">Raw Ingredients</option>
              <option value="PRODUCT">Finished Product</option>
            </select>
            {errors.wasteType && (
              <p className="text-sm text-red-600 mt-1">{errors.wasteType.message}</p>
            )}
          </div>

          {wasteType === 'RAW' && (
            <div>
              <Label htmlFor="inventoryItemId">Inventory Item</Label>
              <select
                id="inventoryItemId"
                {...register('inventoryItemId')}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select item</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.currentStock} {item.unit})
                  </option>
                ))}
              </select>
            </div>
          )}

          {wasteType === 'PRODUCT' && (
            <div>
              <Label htmlFor="recipeId">Recipe</Label>
              <select
                id="recipeId"
                {...register('recipeId')}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select recipe</option>
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                placeholder="Amount"
                {...register('quantity', { valueAsNumber: true })}
              />
              {errors.quantity && (
                <p className="text-sm text-red-600 mt-1">{errors.quantity.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                placeholder="kg, pieces, etc."
                {...register('unit')}
              />
              {errors.unit && (
                <p className="text-sm text-red-600 mt-1">{errors.unit.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="reason">Reason</Label>
            <select
              id="reason"
              {...register('reason')}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select reason</option>
              <option value="EXPIRED">Expired</option>
              <option value="SPOILED">Spoiled</option>
              <option value="OVERCOOKED">Overcooked</option>
              <option value="DROPPED">Dropped</option>
              <option value="CONTAMINATED">Contaminated</option>
              <option value="WRONG_ORDER">Wrong Order</option>
              <option value="EXCESS_PREP">Excess Prep</option>
              <option value="CUSTOMER_RETURN">Customer Return</option>
              <option value="QUALITY_ISSUE">Quality Issue</option>
              <option value="EQUIPMENT_FAILURE">Equipment Failure</option>
              <option value="OTHER">Other</option>
            </select>
            {errors.reason && (
              <p className="text-sm text-red-600 mt-1">{errors.reason.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="reasonDetail">Details (Optional)</Label>
            <Textarea
              id="reasonDetail"
              placeholder="Additional details about the waste"
              {...register('reasonDetail')}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="location">Location (Optional)</Label>
            <Input
              id="location"
              placeholder="Kitchen, Storage, etc."
              {...register('location')}
            />
          </div>

          <div className="flex space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isLoading}
              className="flex-1"
            >
              {isLoading ? 'Logging...' : 'Log Waste'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}