// apps/web/app/dashboard/branch-admin/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/lib/auth'
import { BranchAdminDashboard } from '@/components/dashboard/branch-admin-dashboard'

export default function BranchAdminPage() {
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

      // Role-based access control
      if (currentUser.role !== 'BRANCH_ADMIN') {
        router.push('/dashboard')
        return
      }

      // Branch context requirement
      if (!currentUser.branchId) {
        router.push('/error?code=NO_BRANCH_ASSIGNED')
        return
      }

      setUser(currentUser)
      setIsLoading(false)
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) return null

  return <BranchAdminDashboard user={user} />
}