// apps/web/components/dashboard/restaurant-admin/approval-dashboard.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  usePendingApprovals, 
  useProcessApprovalDecision,
  useApprovalAnalytics,
  useApprovalHistory 
} from '@/hooks/use-approvals'
import { ApprovalCard } from './approval-card'
import { ApprovalAnalytics } from './approval-analytics'
import { 
  ClockIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export function ApprovalDashboard() {
  const [selectedTab, setSelectedTab] = useState<'pending' | 'analytics' | 'history'>('pending')
  
  const { data: pendingApprovals, isLoading: loadingPending } = usePendingApprovals()
  const { data: analytics } = useApprovalAnalytics()
  const processDecision = useProcessApprovalDecision()

  const urgentApprovals = pendingApprovals?.filter((approval: any) => 
    approval.urgencyLevel === 'CRITICAL' || approval.urgencyLevel === 'HIGH'
  ) || []

  const overdueApprovals = pendingApprovals?.filter((approval: any) => 
    approval.isOverdue
  ) || []

  const handleApprovalDecision = (
    approvalId: string, 
    decision: 'APPROVED' | 'REJECTED',
    reason?: string
  ) => {
    processDecision.mutate({
      approvalId,
      decision: { status: decision, reason }
    })
  }

  const tabs = [
    { id: 'pending', label: 'Pending Approvals', count: pendingApprovals?.length || 0 },
    { id: 'analytics', label: 'Analytics', count: null },
    { id: 'history', label: 'History', count: null }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Approval Workflow</h2>
          <p className="text-gray-600">Review and approve branch requests</p>
        </div>
        <div className="flex items-center space-x-2">
          {urgentApprovals.length > 0 && (
            <Badge variant="destructive" className="flex items-center space-x-1">
              <ExclamationTriangleIcon className="w-3 h-3" />
              <span>{urgentApprovals.length} Urgent</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ClockIcon className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {pendingApprovals?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overdueApprovals.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Approved Today</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.approvedCount || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ChartBarIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.averageResponseTime?.toFixed(1) || 0}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                selectedTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  selectedTab === tab.id
                    ? 'bg-primary-100 text-primary-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {selectedTab === 'pending' && (
          <PendingApprovalsTab
            approvals={pendingApprovals || []}
            isLoading={loadingPending}
            onDecision={handleApprovalDecision}
            isProcessing={processDecision.isPending}
          />
        )}
        
        {selectedTab === 'analytics' && (
          <ApprovalAnalytics />
        )}
        
        {selectedTab === 'history' && (
          <ApprovalHistoryTab />
        )}
      </div>
    </div>
  )
}

interface PendingApprovalsTabProps {
  approvals: any[]
  isLoading: boolean
  onDecision: (id: string, decision: 'APPROVED' | 'REJECTED', reason?: string) => void
  isProcessing: boolean
}

function PendingApprovalsTab({ 
  approvals, 
  isLoading, 
  onDecision, 
  isProcessing 
}: PendingApprovalsTabProps) {
  if (isLoading) {
    return <ApprovalsSkeleton />
  }

  if (approvals.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Pending Approvals
          </h3>
          <p className="text-gray-600">
            All requests have been processed. Great work!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {approvals.map((approval) => (
        <ApprovalCard
          key={approval.id}
          approval={approval}
          onDecision={onDecision}
          isProcessing={isProcessing}
        />
      ))}
    </div>
  )
}

function ApprovalHistoryTab() {
  const { data: history } = useApprovalHistory({ limit: 20 })
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Approval History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history?.approvals.map((approval: any) => (
           <div key={approval.id} className="flex items-center justify-between p-4 border rounded-lg">
             <div className="flex items-center space-x-4">
               <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                 approval.status === 'APPROVED' ? 'bg-green-100 text-green-600' :
                 approval.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                 'bg-gray-100 text-gray-600'
               }`}>
                 {approval.status === 'APPROVED' ? (
                   <CheckCircleIcon className="w-5 h-5" />
                 ) : approval.status === 'REJECTED' ? (
                   <XCircleIcon className="w-5 h-5" />
                 ) : (
                   <ClockIcon className="w-5 h-5" />
                 )}
               </div>
               <div>
                 <h4 className="font-medium text-gray-900">{approval.title}</h4>
                 <p className="text-sm text-gray-500">
                   By {approval.requester.username} • {approval.requester.branch?.name}
                 </p>
                 <p className="text-xs text-gray-400">
                   {new Date(approval.requestedAt).toLocaleDateString()}
                 </p>
               </div>
             </div>
             <div className="text-right">
               <Badge variant={
                 approval.status === 'APPROVED' ? 'success' :
                 approval.status === 'REJECTED' ? 'destructive' : 'secondary'
               }>
                 {approval.status}
               </Badge>
               {approval.respondedAt && (
                 <p className="text-xs text-gray-500 mt-1">
                   Processed in {Math.round(
                     (new Date(approval.respondedAt).getTime() - new Date(approval.requestedAt).getTime()) / (1000 * 60 * 60)
                   )}h
                 </p>
               )}
             </div>
           </div>
         ))}
       </div>
     </CardContent>
   </Card>
 )
}

function ApprovalsSkeleton() {
 return (
   <div className="space-y-4">
     {[...Array(3)].map((_, i) => (
       <Card key={i}>
         <CardContent className="p-6">
           <div className="animate-pulse space-y-4">
             <div className="flex items-center space-x-4">
               <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
               <div className="flex-1 space-y-2">
                 <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                 <div className="h-3 bg-gray-200 rounded w-1/2"></div>
               </div>
             </div>
             <div className="h-20 bg-gray-200 rounded"></div>
             <div className="flex space-x-2">
               <div className="h-8 bg-gray-200 rounded w-20"></div>
               <div className="h-8 bg-gray-200 rounded w-20"></div>
             </div>
           </div>
         </CardContent>
       </Card>
     ))}
   </div>
 )
}