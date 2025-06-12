// apps/web/components/dashboard/branch-admin/add-inventory-modal.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAddInventoryBatch } from '@/hooks/use-inventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const addBatchSchema = z.object({
  batchNumber: z.string().min(1, 'Batch number is required'),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  unitCost: z.number().min(0, 'Unit cost must be greater than or equal to 0'),
  expiryDate: z.string().optional(),
  qualityGrade: z.string().optional(),
  notes: z.string().optional()
})

interface AddInventoryModalProps {
  isOpen: boolean
  onClose: () => void
  selectedItem?: any
}

export function AddInventoryModal({ isOpen, onClose, selectedItem }: AddInventoryModalProps) {
  const addBatch = useAddInventoryBatch()
  
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset
  } = useForm({
    resolver: zodResolver(addBatchSchema),
    mode: 'onChange'
  })

  const onSubmit = async (data: any) => {
    if (!selectedItem) return

    const batchData = {
      ...data,
      inventoryItemId: selectedItem.id,
      expiryDate: data.expiryDate ? new Date(data.expiryDate).toISOString() : undefined
    }

    addBatch.mutate(batchData, {
      onSuccess: () => {
        reset()
        onClose()
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Add Stock - {selectedItem?.name || 'Inventory Item'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="batchNumber">Batch Number</Label>
            <Input
              id="batchNumber"
              placeholder="Enter batch number"
              {...register('batchNumber')}
            />
            {errors.batchNumber && (
              <p className="text-sm text-red-600 mt-1">{errors.batchNumber.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              placeholder="Enter quantity"
              {...register('quantity', { valueAsNumber: true })}
            />
            {errors.quantity && (
              <p className="text-sm text-red-600 mt-1">{errors.quantity.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="unitCost">Unit Cost</Label>
            <Input
              id="unitCost"
              type="number"
              step="0.01"
              placeholder="Enter unit cost"
              {...register('unitCost', { valueAsNumber: true })}
            />
            {errors.unitCost && (
              <p className="text-sm text-red-600 mt-1">{errors.unitCost.message}</p>
            )}
          </div>

          {selectedItem?.isPerishable && (
            <div>
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                id="expiryDate"
                type="date"
                {...register('expiryDate')}
              />
            </div>
          )}

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
              disabled={!isValid || addBatch.isPending}
              className="flex-1"
            >
              {addBatch.isPending ? 'Adding...' : 'Add Stock'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}