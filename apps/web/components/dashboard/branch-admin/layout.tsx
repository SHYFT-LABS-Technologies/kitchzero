// apps/web/components/dashboard/branch-admin/layout.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AuthService } from '@/lib/auth'
import { InventoryManagement } from './inventory-management'
import { WasteLogging } from './waste-logging'
import { 
  CubeIcon,
  TrashIcon,
  ChartBarIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

interface BranchAdminLayoutProps {
  user: any
}

export function BranchAdminLayout({ user }: BranchAdminLayoutProps) {
  const [activeTab, setActiveTab] = useState<string>('dashboard')

  const handleLogout = async () => {
    await AuthService.logout()
    window.location.href = '/login'
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: ChartBarIcon },
    { id: 'inventory', label: 'Inventory', icon: CubeIcon },
    { id: 'waste', label: 'Waste Logging', icon: TrashIcon },
    { id: 'settings', label: 'Settings', icon: Cog6ToothIcon },
  ]

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <div>Branch dashboard overview coming soon...</div>
      case 'inventory':
        return <InventoryManagement />
      case 'waste':
        return <WasteLogging />
      case 'settings':
        return <div>Branch settings coming soon...</div>
      default:
        return <div>Branch dashboard overview coming soon...</div>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">KitchZero</h1>
                <p className="text-sm text-gray-500">Branch Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <p className="font-medium text-gray-900">Welcome, {user.username}</p>
                <p className="text-gray-500">Branch Administrator</p>
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