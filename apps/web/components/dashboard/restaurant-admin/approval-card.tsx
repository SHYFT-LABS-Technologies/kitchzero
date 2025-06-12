// apps/web/components/dashboard/restaurant-admin/approval-card.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserIcon,
  MapPinIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { formatCurrency } from '@/lib/utils'

interface ApprovalCardProps {
  approval: any
  onDecision: (id: string, decision: 'APPROVED' | 'REJECTED', reason?: string) => void
  isProcessing: boolean
}

export function ApprovalCard({ approval, onDecision, isProcessing }: ApprovalCardProps) {
  const [showReasonInput, setShowReasonInput] = useState(false)
  const [reason, setReason] = useState('')
  const [pendingDecision, setPendingDecision] = useState<'APPROVED' | 'REJECTED' | null>(null)

  const requestData = approval.parsedRequestData || {}

  const handleDecision = (decision: 'APPROVED' | 'REJECTED') => {
    if (decision === 'REJECTED' && !reason.trim()) {
      setShowReasonInput(true)
      setPendingDecision(decision)
      return
    }
    
    onDecision(approval.id, decision, reason.trim() || undefined)
    setReason('')
    setShowReasonInput(false)
    setPendingDecision(null)
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL': return 'text-red-600 bg-red-100'
      case 'HIGH': return 'text-orange-600 bg-orange-100'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'destructive'
      case 'HIGH': return 'warning'
      case 'MEDIUM': return 'secondary'
      default: return 'outline'
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${getUrgencyColor(approval.urgencyLevel)}`}>
                {approval.urgencyLevel === 'CRITICAL' ? (
                  <ExclamationTriangleIcon className="w-5 h-5" />
                ) : (
                  <ClockIcon className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  {approval.title}
                </h3>
                <div className="flex items-center space-x-4 mt-1">
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <UserIcon className="w-4 h-4" />
                    <span>{approval.requester.username}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <MapPinIcon className="w-4 h-4" />
                    <span>{approval.requester.branch?.name}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={getPriorityColor(approval.priority)}>
                {approval.priority}
              </Badge>
              {approval.isOverdue && (
                <Badge variant="destructive">Overdue</Badge>
              )}
            </div>
          </div>

          {/* Description */}
          {approval.description && (
            <p className="text-gray-600">{approval.description}</p>
          )}

          {/* Request Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Request Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approval.type === 'INVENTORY_ADJUSTMENT' && (
                <>
                  <div>
                    <span className="text-sm text-gray-500">Item:</span>
                    <p className="font-medium">{requestData.inventoryItemName || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Adjustment Type:</span>
                    <p className="font-medium">{requestData.adjustmentType}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Quantity:</span>
                    <p className="font-medium">{requestData.quantity} {requestData.unit}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Reason:</span>
                    <p className="font-medium">{requestData.reason}</p>
                  </div>
                </>
              )}
              
              {approval.type === 'WASTE_ENTRY' && (
                <>
                  <div>
                    <span className="text-sm text-gray-500">Waste Type:</span>
                    <p className="font-medium">{requestData.wasteType}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Quantity:</span>
                    <p className="font-medium">{requestData.quantity} {requestData.unit}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Reason:</span>
                    <p className="font-medium">{requestData.reason}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CurrencyDollarIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Estimated Cost:</span>
                    <p className="font-medium text-red-600">
                      {formatCurrency(requestData.estimatedCost || 0)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Additional Notes */}
          {requestData.notes && (
            <div className="border-l-4 border-blue-200 pl-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Notes:</span> {requestData.notes}
              </p>
            </div>
          )}

          {/* Timeline */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Requested {approval.daysWaiting} days ago
            </span>
            {approval.dueDate && (
              <span>
                Due: {new Date(approval.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Reason Input */}
          {showReasonInput && (
            <div className="space-y-3 border-t pt-4">
              <label className="block text-sm font-medium text-gray-700">
                Reason for {pendingDecision?.toLowerCase()}:
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`Please provide a reason for ${pendingDecision?.toLowerCase()} this request...`}
                rows={3}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button
              onClick={() => handleDecision('APPROVED')}
              disabled={isProcessing}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircleIcon className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button
              onClick={() => handleDecision('REJECTED')}
              disabled={isProcessing}
              variant="destructive"
              className="flex-1"
            >
              <XCircleIcon className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>

          {showReasonInput && (
            <div className="flex space-x-3">
              <Button
                onClick={() => {
                  setShowReasonInput(false)
                  setPendingDecision(null)
                  setReason('')
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDecision(pendingDecision!)}
                disabled={!reason.trim() || isProcessing}
                variant={pendingDecision === 'APPROVED' ? 'default' : 'destructive'}
                className="flex-1"
              >
                Confirm {pendingDecision}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}