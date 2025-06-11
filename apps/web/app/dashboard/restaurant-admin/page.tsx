// apps/web/app/dashboard/restaurant-admin/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/lib/auth'
import { RestaurantAdminDashboard } from '@/components/dashboard/restaurant-admin-dashboard'
import { UserRole } from '@kitchzero/types'

export default function RestaurantAdminPage() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await AuthService.getCurrentUser()
      
      if (!currentUser) {
        router.push('/login')
        return
      }

      // CRITICAL: Role-based access control
      if (currentUser.role !== UserRole.RESTAURANT_ADMIN) {
        router.push('/dashboard') // Redirect to appropriate dashboard
        return
      }

      setUser(currentUser)
      setIsLoading(false)
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  }

  if (!user) return null

  return <RestaurantAdminDashboard user={user} />
}