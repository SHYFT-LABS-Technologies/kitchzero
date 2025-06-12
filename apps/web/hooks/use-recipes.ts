// apps/web/hooks/use-recipes.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'

export function useRecipes(filters?: {
  category?: string
  search?: string
  allergenFree?: string[]
  dietaryTags?: string[]
}) {
  return useQuery({
    queryKey: ['recipes', filters],
    queryFn: () => apiClient.getRecipes(filters),
    select: (data) => data.data,
  })
}

export function useRecipe(id: string) {
  return useQuery({
    queryKey: ['recipes', id],
    queryFn: () => apiClient.getRecipe(id),
    select: (data) => data.data,
    enabled: !!id,
  })
}

export function useCreateRecipe() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: apiClient.createRecipe.bind(apiClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      toast.success('Recipe created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiClient.updateRecipe(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['recipes', variables.id] })
      toast.success('Recipe updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useScaleRecipe() {
  return useMutation({
    mutationFn: ({ id, targetYield, targetUnit }: { 
      id: string 
      targetYield: number 
      targetUnit?: string 
    }) => apiClient.scaleRecipe(id, targetYield, targetUnit),
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useRecipeProfitability() {
  return useQuery({
    queryKey: ['recipes', 'profitability'],
    queryFn: () => apiClient.getRecipeProfitability(),
    select: (data) => data.data,
  })
}

export function useRecalculateRecipeCost() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => apiClient.recalculateRecipeCost(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['recipes', id] })
      queryClient.invalidateQueries({ queryKey: ['recipes', 'profitability'] })
      toast.success('Recipe cost recalculated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}