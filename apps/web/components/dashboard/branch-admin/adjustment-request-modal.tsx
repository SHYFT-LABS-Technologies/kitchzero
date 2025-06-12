// apps/web/components/dashboard/branch-admin/adjustment-request-modal.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRequestInventoryAdjustment } from '@/hooks/use-inventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const adjustmentSchema = z.object({
  adjustmentType: z.enum(['RECEIVED', 'SOLD', 'WASTE', 'TRANSFER', 'COUNT', 'DAMAGED', 'THEFT', 'OTHER']),
  quantity: z.number(),
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional()
})

interface AdjustmentRequestModalProps {
  isOpen: boolean
  onClose: () => void
  selectedItem?: any
}

export function AdjustmentRequestModal({ isOpen, onClose, selectedItem }: AdjustmentRequestModalProps) {
  const requestAdjustment = useRequestInventoryAdjustment()
  
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset
  } = useForm({
    resolver: zodResolver(adjustmentSchema),
    mode: 'onChange'
  })

  const onSubmit = async (data: any) => {
    if (!selectedItem) return

    const adjustmentData = {
      ...data,
      inventoryItemId: selectedItem.id
    }

    requestAdjustment.mutate(adjustmentData, {
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
            Request Adjustment - {selectedItem?.name || 'Inventory Item'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="adjustmentType">Adjustment Type</Label>
            <select
              id="adjustmentType"
              {...register('adjustmentType')}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select type</option>
              <option value="RECEIVED">Received</option>
              <option value="SOLD">Sold</option>
              <option value="WASTE">Waste</option>
              <option value="TRANSFER">Transfer</option>
              <option value="COUNT">Count Adjustment</option>
              <option value="DAMAGED">Damaged</option>
              <option value="THEFT">Theft</option>
              <option value="OTHER">Other</option>
            </select>
            {errors.adjustmentType && (
              <p className="text-sm text-red-600 mt-1">{errors.adjustmentType.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              placeholder="Enter quantity (use negative for reductions)"
              {...register('quantity', { valueAsNumber: true })}
            />
            {errors.quantity && (
              <p className="text-sm text-red-600 mt-1">{errors.quantity.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              placeholder="Enter reason for adjustment"
              {...register('reason')}
            />
            {errors.reason && (
              <p className="text-sm text-red-600 mt-1">{errors.reason.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes"
              {...register('notes')}
              rows={3}
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
              disabled={!isValid || requestAdjustment.isPending}
              className="flex-1"
            >
              {requestAdjustment.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}