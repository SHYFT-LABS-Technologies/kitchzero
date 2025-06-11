// apps/web/lib/auth.ts (Update API calls)
import Cookies from 'js-cookie'

export interface User {
  id: string
  username: string
  role: string
  mustChangePassword: boolean
  tenantId: string | null
  branchId: string | null
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginResponse {
  user: User
  tokens: AuthTokens
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export class AuthService {
  private static readonly ACCESS_TOKEN_KEY = 'access_token'
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token'
  private static readonly USER_KEY = 'user'

  static async login(credentials: { username: string; password: string }): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(credentials),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Login failed')
    }

    // Store tokens and user data
    const { user, tokens } = data.data
    Cookies.set(this.ACCESS_TOKEN_KEY, tokens.accessToken, { 
      expires: 7,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    })
    Cookies.set(this.REFRESH_TOKEN_KEY, tokens.refreshToken, { 
      expires: 7,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    })
    Cookies.set(this.USER_KEY, JSON.stringify(user), { 
      expires: 7,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    })

    return data.data
  }

  // NEW: Change password method
  static async changePassword(data: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAccessToken()}`
      },
      credentials: 'include',
      body: JSON.stringify(data)
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Password change failed')
    }

    return result
  }

  // NEW: Check password strength
  static async checkPasswordStrength(password: string, username?: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/auth/check-password-strength`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAccessToken()}`
      },
      credentials: 'include',
      body: JSON.stringify({ password, username })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Password strength check failed')
    }

    return result
  }

  // NEW: Get password requirements
  static async getPasswordRequirements(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/auth/password-requirements`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getAccessToken()}`
      },
      credentials: 'include'
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch password requirements')
    }

    return result
  }

  static async logout(): Promise<void> {
    const refreshToken = Cookies.get(this.REFRESH_TOKEN_KEY)
    
    if (refreshToken) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAccessToken()}`,
          },
          credentials: 'include',
          body: JSON.stringify({ refreshToken }),
        })
      } catch (error) {
        console.error('Logout error:', error)
      }
    }

    // Clear all auth data
    Cookies.remove(this.ACCESS_TOKEN_KEY)
    Cookies.remove(this.REFRESH_TOKEN_KEY)
    Cookies.remove(this.USER_KEY)
  }

  static getAccessToken(): string | undefined {
    return Cookies.get(this.ACCESS_TOKEN_KEY)
  }

  static getUser(): User | null {
    const userStr = Cookies.get(this.USER_KEY)
    if (!userStr) return null
    
    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  }

  static isAuthenticated(): boolean {
    return !!this.getAccessToken() && !!this.getUser()
  }

  static async getCurrentUser(): Promise<User | null> {
    const token = this.getAccessToken()
    if (!token) return null

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      })

      if (!response.ok) {
        this.logout()
        return null
      }

      const data = await response.json()
      return data.data.user
    } catch (error) {
      console.error('Get current user error:', error)
      this.logout()
      return null
    }
  }
}