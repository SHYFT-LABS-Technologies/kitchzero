// apps/web/hooks/use-waste.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'

export function useWasteEntries(params?: {
  page?: number
  limit?: number
  wasteType?: string
  reason?: string
  startDate?: string
  endDate?: string
}) {
  return useQuery({
    queryKey: ['waste', 'entries', params],
    queryFn: () => apiClient.getWasteEntries(params),
    select: (data) => data.data,
  })
}

export function useCreateWasteEntry() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: apiClient.createWasteEntry.bind(apiClient),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['waste'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      
      if (data.data.status === 'PENDING') {
        queryClient.invalidateQueries({ queryKey: ['approvals'] })
        toast.success('Waste entry submitted for approval')
      } else {
        toast.success('Waste logged successfully')
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useWasteAnalytics(params?: {
  startDate?: string
  endDate?: string
  wasteType?: string
  category?: string
}) {
  return useQuery({
    queryKey: ['waste', 'analytics', params],
    queryFn: () => apiClient.getWasteAnalytics(params),
    select: (data) => data.data,
  })
}

export function useWasteReductionSuggestions() {
  return useQuery({
    queryKey: ['waste', 'suggestions'],
    queryFn: () => apiClient.getWasteReductionSuggestions(),
    select: (data) => data.data,
    refetchInterval: 30 * 60 * 1000, // Refetch every 30 minutes
  })
}