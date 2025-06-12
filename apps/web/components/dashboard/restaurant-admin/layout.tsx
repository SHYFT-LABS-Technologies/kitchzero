// apps/web/components/dashboard/restaurant-admin/layout.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AuthService } from '@/lib/auth'
import { RestaurantOverview } from './restaurant-overview'
import { ApprovalDashboard } from './approval-dashboard'
import { RecipeManagement } from './recipe-management'
import { 
  BuildingStorefrontIcon,
  ClipboardDocumentListIcon,
  BeakerIcon,
  ChartBarIcon,
  UserGroupIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

interface RestaurantAdminLayoutProps {
  user: any
}

export function RestaurantAdminLayout({ user }: RestaurantAdminLayoutProps) {
  const [activeTab, setActiveTab] = useState<string>('overview')

  const handleLogout = async () => {
    await AuthService.logout()
    window.location.href = '/login'
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'approvals', label: 'Approvals', icon: ClipboardDocumentListIcon },
    { id: 'recipes', label: 'Recipes', icon: BeakerIcon },
    { id: 'branches', label: 'Branches', icon: BuildingStorefrontIcon },
    { id: 'users', label: 'Users', icon: UserGroupIcon },
    { id: 'settings', label: 'Settings', icon: Cog6ToothIcon },
  ]

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':
        return <RestaurantOverview />
      case 'approvals':
        return <ApprovalDashboard />
      case 'recipes':
        return <RecipeManagement />
      case 'branches':
        return (
          <div className="text-center py-12">
            <BuildingStorefrontIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Branch Management</h3>
            <p className="text-gray-600">Branch management features coming soon...</p>
          </div>
        )
      case 'users':
        return (
          <div className="text-center py-12">
            <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">User Management</h3>
            <p className="text-gray-600">User management features coming soon...</p>
          </div>
        )
      case 'settings':
        return (
          <div className="text-center py-12">
            <Cog6ToothIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Settings</h3>
            <p className="text-gray-600">Settings panel coming soon...</p>
          </div>
        )
      default:
        return <RestaurantOverview />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">KitchZero</h1>
                <p className="text-sm text-gray-500">Restaurant Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <p className="font-medium text-gray-900">Welcome, {user.username}</p>
                <p className="text-gray-500">Restaurant Administrator</p>
              </div>
              <Badge variant="success">Active</Badge>
              <Button variant="outline" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {renderActiveTab()}
      </main>
    </div>
  )
}