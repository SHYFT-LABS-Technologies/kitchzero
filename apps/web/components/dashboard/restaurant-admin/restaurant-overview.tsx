// apps/web/components/dashboard/restaurant-admin/restaurant-overview.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BuildingStorefrontIcon, 
  UsersIcon, 
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { formatCurrency } from '@/lib/utils'

export function RestaurantOverview() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['restaurant', 'overview'],
    queryFn: () => apiClient.getRestaurantOverview(),
    select: (data) => data.data,
  })

  if (isLoading) {
    return <OverviewSkeleton />
  }

  if (!overview) {
    return <div>Failed to load overview data</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {overview.tenant?.name || 'Restaurant Dashboard'}
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor performance across all branches
          </p>
        </div>
        <Badge variant="success" className="text-sm">
          Active
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Branches"
          value={overview.summary.totalBranches}
          change="+1 this month"
          icon={<BuildingStorefrontIcon className="w-5 h-5" />}
          trend="up"
        />
        <MetricCard
          title="Active Users"
          value={overview.summary.totalUsers}
          change="+2 this week"
          icon={<UsersIcon className="w-5 h-5" />}
          trend="up"
        />
        <MetricCard
          title="Inventory Value"
          value={formatCurrency(overview.summary.totalInventoryValue)}
          change="+8% this month"
          icon={<ChartBarIcon className="w-5 h-5" />}
          trend="up"
        />
        <MetricCard
          title="Waste Percentage"
          value={`${overview.summary.wastePercentage.toFixed(1)}%`}
          change="-2.1% this month"
          icon={<ExclamationTriangleIcon className="w-5 h-5" />}
          trend="down"
          variant={overview.summary.wastePercentage > 5 ? 'warning' : 'success'}
        />
        </div>

     {/* Branch Performance Grid */}
     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center justify-between">
             Branch Performance
             <Button variant="outline" size="sm">
               View All
             </Button>
           </CardTitle>
         </CardHeader>
         <CardContent>
           <div className="space-y-4">
             {overview.branches.map((branch: any) => (
               <BranchCard key={branch.id} branch={branch} />
             ))}
           </div>
         </CardContent>
       </Card>

       <Card>
         <CardHeader>
           <CardTitle>System Health</CardTitle>
         </CardHeader>
         <CardContent>
           <div className="space-y-4">
             <HealthMetric
               label="API Response Time"
               value="< 200ms"
               status="healthy"
             />
             <HealthMetric
               label="Database Connection"
               value="Active"
               status="healthy"
             />
             <HealthMetric
               label="Data Sync"
               value="Real-time"
               status="healthy"
             />
             <HealthMetric
               label="Backup Status"
               value="Last: 2 hours ago"
               status="healthy"
             />
           </div>
         </CardContent>
       </Card>
     </div>
   </div>
 )
}

interface MetricCardProps {
 title: string
 value: string | number
 change: string
 icon: React.ReactNode
 trend: 'up' | 'down'
 variant?: 'default' | 'warning' | 'success'
}

function MetricCard({ title, value, change, icon, trend, variant = 'default' }: MetricCardProps) {
 return (
   <Card>
     <CardContent className="p-6">
       <div className="flex items-center justify-between">
         <div className="flex items-center space-x-2">
           <div className={`p-2 rounded-lg ${
             variant === 'warning' ? 'bg-orange-100 text-orange-600' :
             variant === 'success' ? 'bg-green-100 text-green-600' :
             'bg-blue-100 text-blue-600'
           }`}>
             {icon}
           </div>
           <div>
             <p className="text-sm font-medium text-gray-600">{title}</p>
             <p className="text-2xl font-bold text-gray-900">{value}</p>
           </div>
         </div>
       </div>
       <div className="mt-4 flex items-center">
         <span className={`text-sm font-medium ${
           trend === 'up' ? 'text-green-600' : 'text-red-600'
         }`}>
           {change}
         </span>
       </div>
     </CardContent>
   </Card>
 )
}

function BranchCard({ branch }: { branch: any }) {
 return (
   <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
     <div className="flex items-center space-x-4">
       <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
         <BuildingStorefrontIcon className="w-5 h-5 text-white" />
       </div>
       <div>
         <h3 className="font-medium text-gray-900">{branch.name}</h3>
         <p className="text-sm text-gray-500">
           {branch.metrics.activeUsers} users • {branch.metrics.inventoryItems} items
         </p>
       </div>
     </div>
     <div className="flex items-center space-x-2">
       <Badge variant={branch.isActive ? 'success' : 'secondary'}>
         {branch.isActive ? 'Active' : 'Inactive'}
       </Badge>
       <Button variant="ghost" size="sm">
         Manage
       </Button>
     </div>
   </div>
 )
}

function HealthMetric({ label, value, status }: {
 label: string
 value: string
 status: 'healthy' | 'warning' | 'error'
}) {
 return (
   <div className="flex items-center justify-between">
     <span className="text-sm text-gray-600">{label}</span>
     <div className="flex items-center space-x-2">
       <span className="text-sm font-medium text-gray-900">{value}</span>
       <div className={`w-2 h-2 rounded-full ${
         status === 'healthy' ? 'bg-green-500' :
         status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
       }`} />
     </div>
   </div>
 )
}

function OverviewSkeleton() {
 return (
   <div className="space-y-6">
     <div className="animate-pulse">
       <div className="h-8 bg-gray-200 rounded-md w-64 mb-2"></div>
       <div className="h-4 bg-gray-200 rounded-md w-96"></div>
     </div>
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
       {[...Array(4)].map((_, i) => (
         <Card key={i}>
           <CardContent className="p-6">
             <div className="animate-pulse space-y-4">
               <div className="h-4 bg-gray-200 rounded w-3/4"></div>
               <div className="h-8 bg-gray-200 rounded w-1/2"></div>
               <div className="h-3 bg-gray-200 rounded w-2/3"></div>
             </div>
           </CardContent>
         </Card>
       ))}
     </div>
   </div>
 )
}