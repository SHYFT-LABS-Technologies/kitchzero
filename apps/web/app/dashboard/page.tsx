// apps/web/app/dashboard/page.tsx (Updated)
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/lib/auth'

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const currentUser = await AuthService.getCurrentUser()
      
      if (!currentUser) {
        router.push('/login')
        return
      }

      // Redirect based on role
      switch (currentUser.role) {
        case 'RESTAURANT_ADMIN':
          router.push('/dashboard/restaurant-admin')
          break
        case 'BRANCH_ADMIN':
          router.push('/dashboard/branch-admin')
          break
        case 'KITCHZERO_ADMIN':
          router.push('/dashboard/admin')
          break
        default:
          // Generic dashboard for other roles
          setIsLoading(false)
      }
    }

    checkAuthAndRedirect()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-text mb-4">
          Welcome to KitchZero
        </h1>
        <p className="text-lg text-text/80 mb-8">
          Your role-based dashboard is loading...
        </p>
      </div>
    </div>
  )
}