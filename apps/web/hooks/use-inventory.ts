// apps/web/hooks/use-inventory.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'

export function useInventoryItems(params?: {
  category?: string
  lowStock?: boolean
  expiringSoon?: boolean
}) {
  return useQuery({
    queryKey: ['inventory', 'items', params],
    queryFn: () => apiClient.getInventoryItems(params),
    select: (data) => data.data,
  })
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: apiClient.createInventoryItem.bind(apiClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Inventory item created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useAddInventoryBatch() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: apiClient.addInventoryBatch.bind(apiClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Inventory batch added successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useRequestInventoryAdjustment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: apiClient.requestInventoryAdjustment.bind(apiClient),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
      
      if (data.data.status === 'PENDING') {
        toast.success('Adjustment request submitted for approval')
      } else {
        toast.success('Inventory adjusted successfully')
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useLowStockItems() {
  return useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: () => apiClient.getLowStockItems(),
    select: (data) => data.data,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}

export function useExpiringItems(days = 7) {
  return useQuery({
    queryKey: ['inventory', 'expiring', days],
    queryFn: () => apiClient.getExpiringItems(days),
    select: (data) => data.data,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}