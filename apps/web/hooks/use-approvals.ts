// apps/web/hooks/use-approvals.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'

export function usePendingApprovals() {
  return useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: () => apiClient.getPendingApprovals(),
    select: (data) => data.data,
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  })
}

export function useProcessApprovalDecision() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ approvalId, decision }: { 
      approvalId: string 
      decision: { status: 'APPROVED' | 'REJECTED'; reason?: string }
    }) => apiClient.processApprovalDecision(approvalId, decision),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['waste'] })
      
      const action = variables.decision.status === 'APPROVED' ? 'approved' : 'rejected'
      toast.success(`Request ${action} successfully`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useApprovalAnalytics(params?: {
  startDate?: string
  endDate?: string
  type?: string
  status?: string
}) {
  return useQuery({
    queryKey: ['approvals', 'analytics', params],
    queryFn: () => apiClient.getApprovalAnalytics(params),
    select: (data) => data.data,
  })
}

export function useApprovalHistory(params?: {
  page?: number
  limit?: number
  type?: string
  status?: string
}) {
  return useQuery({
    queryKey: ['approvals', 'history', params],
    queryFn: () => apiClient.getApprovalHistory(params),
    select: (data) => data.data,
  })
}