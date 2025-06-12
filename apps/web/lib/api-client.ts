// apps/web/lib/api-client.ts
import { AuthService } from './auth'

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

class ApiClient {
  private baseURL: string

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = AuthService.getAccessToken()
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      credentials: 'include',
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config)
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try to refresh
          const refreshed = await this.tryRefreshToken()
          if (refreshed) {
            // Retry the original request
            return this.request(endpoint, options)
          } else {
            AuthService.logout()
            window.location.href = '/login'
            throw new Error('Authentication required')
          }
        }
        
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to server')
      }
      throw error
    }
  }

  private async tryRefreshToken(): Promise<boolean> {
    try {
      const refreshToken = AuthService.getRefreshToken()
      if (!refreshToken) return false

      const response = await AuthService.refreshTokens(refreshToken)
      return !!response
    } catch {
      return false
    }
  }

  // Auth endpoints
  async login(credentials: { username: string; password: string }) {
    return this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  }

  async changePassword(data: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }) {
    return this.request<any>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async checkPasswordStrength(password: string, username?: string) {
    return this.request<any>('/auth/check-password-strength', {
      method: 'POST',
      body: JSON.stringify({ password, username }),
    })
  }

  async getPasswordRequirements() {
    return this.request<any>('/auth/password-requirements')
  }

  // Inventory endpoints
  async getInventoryItems(params?: {
    category?: string
    lowStock?: boolean
    expiringSoon?: boolean
  }) {
    const query = new URLSearchParams()
    if (params?.category) query.set('category', params.category)
    if (params?.lowStock) query.set('lowStock', 'true')
    if (params?.expiringSoon) query.set('expiringSoon', 'true')
    
    const queryString = query.toString()
    return this.request<any[]>(`/inventory/items${queryString ? `?${queryString}` : ''}`)
  }

  async createInventoryItem(data: any) {
    return this.request<any>('/inventory/items', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async addInventoryBatch(data: any) {
    return this.request<any>('/inventory/batches', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async requestInventoryAdjustment(data: any) {
    return this.request<any>('/inventory/adjustments', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getLowStockItems() {
    return this.request<any[]>('/inventory/alerts/low-stock')
  }

  async getExpiringItems(days = 7) {
    return this.request<any[]>(`/inventory/alerts/expiring?days=${days}`)
  }

  // Recipe endpoints
  async getRecipes(filters?: {
    category?: string
    search?: string
    allergenFree?: string[]
    dietaryTags?: string[]
  }) {
    const query = new URLSearchParams()
    if (filters?.category) query.set('category', filters.category)
    if (filters?.search) query.set('search', filters.search)
    if (filters?.allergenFree) {
      filters.allergenFree.forEach(allergen => query.append('allergenFree', allergen))
    }
    if (filters?.dietaryTags) {
      filters.dietaryTags.forEach(tag => query.append('dietaryTags', tag))
    }
    
    const queryString = query.toString()
    return this.request<any[]>(`/recipes${queryString ? `?${queryString}` : ''}`)
  }

  async getRecipe(id: string) {
    return this.request<any>(`/recipes/${id}`)
  }

  async createRecipe(data: any) {
    return this.request<any>('/recipes', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateRecipe(id: string, data: any) {
    return this.request<any>(`/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async scaleRecipe(id: string, targetYield: number, targetUnit?: string) {
    return this.request<any>(`/recipes/${id}/scale`, {
      method: 'POST',
      body: JSON.stringify({ targetYield, targetUnit }),
    })
  }

  async getRecipeProfitability() {
    return this.request<any[]>('/recipes/analytics/profitability')
  }

  async recalculateRecipeCost(id: string) {
    return this.request<any>(`/recipes/${id}/recalculate-cost`, {
      method: 'POST',
    })
  }

  // Waste endpoints
  async createWasteEntry(data: any) {
    return this.request<any>('/waste/entries', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getWasteEntries(params?: {
    page?: number
    limit?: number
    wasteType?: string
    reason?: string
    startDate?: string
    endDate?: string
  }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.wasteType) query.set('wasteType', params.wasteType)
    if (params?.reason) query.set('reason', params.reason)
    if (params?.startDate) query.set('startDate', params.startDate)
    if (params?.endDate) query.set('endDate', params.endDate)
    
    const queryString = query.toString()
    return this.request<PaginatedResponse<any>>(`/waste/entries${queryString ? `?${queryString}` : ''}`)
  }

  async getWasteAnalytics(params?: {
    startDate?: string
    endDate?: string
    wasteType?: string
    category?: string
  }) {
    const query = new URLSearchParams()
    if (params?.startDate) query.set('startDate', params.startDate)
    if (params?.endDate) query.set('endDate', params.endDate)
    if (params?.wasteType) query.set('wasteType', params.wasteType)
    if (params?.category) query.set('category', params.category)
    
    const queryString = query.toString()
    return this.request<any>(`/waste/analytics${queryString ? `?${queryString}` : ''}`)
  }

  async getWasteReductionSuggestions() {
    return this.request<any[]>('/waste/suggestions')
  }

  // Approval endpoints
  async getPendingApprovals() {
    return this.request<any[]>('/approvals/pending')
  }

  async processApprovalDecision(approvalId: string, decision: {
    status: 'APPROVED' | 'REJECTED'
    reason?: string
  }) {
    return this.request<any>(`/approvals/${approvalId}/decision`, {
      method: 'POST',
      body: JSON.stringify(decision),
    })
  }

  async getApprovalAnalytics(params?: {
    startDate?: string
    endDate?: string
    type?: string
    status?: string
  }) {
    const query = new URLSearchParams()
    if (params?.startDate) query.set('startDate', params.startDate)
    if (params?.endDate) query.set('endDate', params.endDate)
    if (params?.type) query.set('type', params.type)
    if (params?.status) query.set('status', params.status)
    
    const queryString = query.toString()
    return this.request<any>(`/approvals/analytics${queryString ? `?${queryString}` : ''}`)
  }

  async getApprovalHistory(params?: {
    page?: number
    limit?: number
    type?: string
    status?: string
  }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.type) query.set('type', params.type)
    if (params?.status) query.set('status', params.status)
    
    const queryString = query.toString()
    return this.request<PaginatedResponse<any>>(`/approvals/history${queryString ? `?${queryString}` : ''}`)
  }

  // Restaurant Admin endpoints
  async getRestaurantOverview() {
    return this.request<any>('/restaurant-admin/overview')
  }

  async getBranches() {
    return this.request<any[]>('/restaurant-admin/branches')
  }

  async createBranch(data: { name: string; slug: string }) {
    return this.request<any>('/restaurant-admin/branches', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getTenantUsers() {
    return this.request<any[]>('/restaurant-admin/users')
  }

  async createBranchAdmin(data: any) {
    return this.request<any>('/restaurant-admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getRestaurantAnalytics(params?: {
    startDate?: string
    endDate?: string
    branchId?: string
  }) {
    const query = new URLSearchParams()
    if (params?.startDate) query.set('startDate', params.startDate)
    if (params?.endDate) query.set('endDate', params.endDate)
    if (params?.branchId) query.set('branchId', params.branchId)
    
    const queryString = query.toString()
    return this.request<any>(`/restaurant-admin/analytics${queryString ? `?${queryString}` : ''}`)
  }

  async getAuditLogs(params?: {
    eventType?: string
    severity?: string
    startDate?: string
    endDate?: string
    branchId?: string
    limit?: number
    offset?: number
  }) {
    const query = new URLSearchParams()
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined) query.set(key, value.toString())
    })
    
    const queryString = query.toString()
    return this.request<any>(`/restaurant-admin/audit-logs${queryString ? `?${queryString}` : ''}`)
  }

  // Branch Admin endpoints
  async getBranchDashboard() {
    return this.request<any>('/branch-admin/dashboard')
  }

  async getBranchInventory(params?: {
    category?: string
    lowStock?: boolean
  }) {
    const query = new URLSearchParams()
    if (params?.category) query.set('category', params.category)
    if (params?.lowStock) query.set('lowStock', 'true')
    
    const queryString = query.toString()
    return this.request<any[]>(`/branch-admin/inventory${queryString ? `?${queryString}` : ''}`)
  }

  async updateInventoryItem(itemId: string, data: any) {
    return this.request<any>(`/branch-admin/inventory/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async getBranchWasteReports(params?: {
    startDate?: string
    endDate?: string
    category?: string
  }) {
    const query = new URLSearchParams()
    if (params?.startDate) query.set('startDate', params.startDate)
    if (params?.endDate) query.set('endDate', params.endDate)
    if (params?.category) query.set('category', params.category)
    
    const queryString = query.toString()
    return this.request<any>(`/branch-admin/waste-reports${queryString ? `?${queryString}` : ''}`)
  }

  async recordWasteIncident(data: any) {
    return this.request<any>('/branch-admin/waste-incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getBranchSettings() {
    return this.request<any>('/branch-admin/settings')
  }

  async updateBranchSettings(data: any) {
    return this.request<any>('/branch-admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }
}

export const apiClient = new ApiClient()