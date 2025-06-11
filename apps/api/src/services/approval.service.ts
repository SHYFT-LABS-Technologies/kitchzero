// apps/api/src/services/approval.service.ts
import { PrismaClient, ApprovalStatus, ApprovalType, Priority, UserRole } from '@prisma/client';
import { AuditLogService } from './audit-log.service';

const prisma = new PrismaClient();

export interface CreateApprovalRequest {
  type: ApprovalType;
  title: string;
  description?: string;
  requestData: any;
  priority?: Priority;
  dueDate?: Date;
}

export interface ApprovalDecision {
  status: ApprovalStatus;
  reason?: string;
}

export class ApprovalService {
  // Create approval request
  static async createApprovalRequest(
    data: CreateApprovalRequest,
    requestedBy: string,
    tenantId: string
  ): Promise<any> {
    try {
      // Determine approvers based on request type and tenant
      const approverIds = await this.getApproversForRequest(data.type, tenantId);

      const approvalRequest = await prisma.approvalRequest.create({
        data: {
          type: data.type,
          title: data.title,
          description: data.description,
          requestData: JSON.stringify(data.requestData),
          requestedBy,
          approverIds,
          priority: data.priority || Priority.MEDIUM,
          dueDate: data.dueDate
        },
        include: {
          requester: {
            select: {
              id: true,
              username: true,
              role: true
            }
          }
        }
      });

      await AuditLogService.logBusinessActivity({
        event: 'APPROVAL_REQUEST_CREATED',
        action: 'CREATE',
        resourceType: 'APPROVAL_REQUEST',
        resourceId: approvalRequest.id,
        userId: requestedBy,
        username: 'system',
        tenantId,
        newValues: data
      });

      // Send notifications to approvers
      await this.notifyApprovers(approvalRequest);

      return approvalRequest;
    } catch (error) {
      throw new Error(`Failed to create approval request: ${error.message}`);
    }
  }

  // Process approval decision
  static async processApprovalDecision(
    approvalId: string,
    decision: ApprovalDecision,
    approverUserId: string,
    tenantId: string
  ): Promise<any> {
    try {
      return await prisma.$transaction(async (tx) => {
        const approvalRequest = await tx.approvalRequest.findUnique({
          where: { id: approvalId },
          include: {
            requester: true,
            inventoryAdjustments: true,
            wasteEntries: true
          }
        });

        if (!approvalRequest) {
          throw new Error('Approval request not found');
        }

        if (approvalRequest.status !== ApprovalStatus.PENDING) {
          throw new Error('Approval request is not pending');
        }

        // Verify approver has permission
        if (!approvalRequest.approverIds.includes(approverUserId)) {
          throw new Error('User not authorized to approve this request');
        }

        // Update approval request
        const updatedRequest = await tx.approvalRequest.update({
          where: { id: approvalId },
          data: {
            status: decision.status,
            approvedBy: decision.status === ApprovalStatus.APPROVED ? approverUserId : undefined,
            rejectedBy: decision.status === ApprovalStatus.REJECTED ? approverUserId : undefined,
            approvalReason: decision.status === ApprovalStatus.APPROVED ? decision.reason : undefined,
            rejectionReason: decision.status === ApprovalStatus.REJECTED ? decision.reason : undefined,
            respondedAt: new Date()
          }
        });

        // Process the approved/rejected items
        if (decision.status === ApprovalStatus.APPROVED) {
          await this.executeApprovedRequest(approvalRequest, tx);
        } else if (decision.status === ApprovalStatus.REJECTED) {
          await this.rejectPendingItems(approvalRequest, tx);
        }

        await AuditLogService.logBusinessActivity({
          event: `APPROVAL_${decision.status}`,
          action: 'UPDATE',
          resourceType: 'APPROVAL_REQUEST',
          resourceId: approvalId,
          userId: approverUserId,
          username: 'system',
          tenantId,
          oldValues: { status: 'PENDING' },
          newValues: { status: decision.status, reason: decision.reason }
        });

        return updatedRequest;
      });
    } catch (error) {
      throw new Error(`Failed to process approval decision: ${error.message}`);
    }
  }

  // Get pending approvals for a user
  static async getPendingApprovals(
    userId: string,
    tenantId: string,
    userRole: UserRole
  ): Promise<any[]> {
    try {
      // Only Restaurant Admins can approve requests
      if (userRole !== UserRole.RESTAURANT_ADMIN) {
        return [];
      }

      const pendingApprovals = await prisma.approvalRequest.findMany({
        where: {
          status: ApprovalStatus.PENDING,
          approverIds: {
            hasSome: [userId]
          }
        },
        include: {
          requester: {
            select: {
              id: true,
              username: true,
              role: true,
              branch: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          inventoryAdjustments: {
            include: {
              inventoryItem: {
                select: {
                  id: true,
                  name: true,
                  currentStock: true,
                  unit: true
                }
              }
            }
          },
          wasteEntries: {
            include: {
              inventoryItem: {
                select: {
                  id: true,
                  name: true
                }
              },
              recipe: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { requestedAt: 'asc' }
        ]
      });

      return pendingApprovals.map(approval => ({
        ...approval,
        isOverdue: approval.dueDate && approval.dueDate < new Date(),
        daysWaiting: Math.ceil(
          (new Date().getTime() - approval.requestedAt.getTime()) / (1000 * 60 * 60 * 24)
        ),
        parsedRequestData: JSON.parse(approval.requestData),
        urgencyLevel: this.calculateUrgencyLevel(approval)
      }));
    } catch (error) {
      throw new Error(`Failed to get pending approvals: ${error.message}`);
    }
  }

  // Get approval history for analytics
  static async getApprovalAnalytics(
    tenantId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      type?: ApprovalType;
      status?: ApprovalStatus;
    } = {}
  ): Promise<any> {
    try {
      const where: any = {};
      
      if (filters.startDate || filters.endDate) {
        where.requestedAt = {};
        if (filters.startDate) where.requestedAt.gte = filters.startDate;
        if (filters.endDate) where.requestedAt.lte = filters.endDate;
      }
      
      if (filters.type) where.type = filters.type;
      if (filters.status) where.status = filters.status;

      const approvals = await prisma.approvalRequest.findMany({
        where,
        include: {
          requester: {
            select: {
              id: true,
              username: true,
              role: true,
              branch: { select: { name: true } }
            }
          }
        }
      });

      const analytics = {
        totalRequests: approvals.length,
        approvedCount: approvals.filter(a => a.status === ApprovalStatus.APPROVED).length,
        rejectedCount: approvals.filter(a => a.status === ApprovalStatus.REJECTED).length,
        pendingCount: approvals.filter(a => a.status === ApprovalStatus.PENDING).length,
        averageResponseTime: this.calculateAverageResponseTime(approvals),
        byType: this.groupApprovalsByType(approvals),
        byPriority: this.groupApprovalsByPriority(approvals),
        byBranch: this.groupApprovalsByBranch(approvals),
        monthlyTrend: this.getMonthlyApprovalTrend(approvals)
      };

      return analytics;
    } catch (error) {
      throw new Error(`Failed to get approval analytics: ${error.message}`);
    }
  }

  // Helper methods
  private static async getApproversForRequest(
    type: ApprovalType,
    tenantId: string
  ): Promise<string[]> {
    // Get all Restaurant Admins for the tenant
    const restaurantAdmins = await prisma.user.findMany({
      where: {
        tenantId,
        role: UserRole.RESTAURANT_ADMIN,
        isActive: true
      },
      select: { id: true }
    });

    return restaurantAdmins.map(admin => admin.id);
  }

  private static async notifyApprovers(approvalRequest: any): Promise<void> {
    // Implementation for sending notifications (email, in-app, etc.)
    console.log(`Notification sent for approval request: ${approvalRequest.id}`);
    // TODO: Implement actual notification system
  }

  private static async executeApprovedRequest(
    approvalRequest: any,
    tx: any
  ): Promise<void> {
    // Update related records to approved status
    if (approvalRequest.inventoryAdjustments.length > 0) {
      await tx.inventoryAdjustment.updateMany({
        where: { approvalId: approvalRequest.id },
        data: { status: ApprovalStatus.APPROVED }
      });
    }

    if (approvalRequest.wasteEntries.length > 0) {
      await tx.wasteEntry.updateMany({
        where: { approvalId: approvalRequest.id },
        data: { status: ApprovalStatus.APPROVED }
      });
    }
  }

  private static async rejectPendingItems(
    approvalRequest: any,
    tx: any
  ): Promise<void> {
    // Update related records to rejected status
    if (approvalRequest.inventoryAdjustments.length > 0) {
      await tx.inventoryAdjustment.updateMany({
        where: { approvalId: approvalRequest.id },
        data: { status: ApprovalStatus.REJECTED }
      });
    }

    if (approvalRequest.wasteEntries.length > 0) {
      await tx.wasteEntry.updateMany({
        where: { approvalId: approvalRequest.id },
        data: { status: ApprovalStatus.REJECTED }
      });
    }
  }

  private static calculateUrgencyLevel(approval: any): string {
    const hoursWaiting = (new Date().getTime() - approval.requestedAt.getTime()) / (1000 * 60 * 60);
    
    if (approval.priority === Priority.CRITICAL) return 'CRITICAL';
    if (approval.priority === Priority.HIGH && hoursWaiting > 4) return 'HIGH';
    if (hoursWaiting > 24) return 'HIGH';
    if (hoursWaiting > 8) return 'MEDIUM';
    return 'LOW';
  }

  private static calculateAverageResponseTime(approvals: any[]): number {
    const completedApprovals = approvals.filter(a => a.respondedAt);
    if (completedApprovals.length === 0) return 0;

    const totalHours = completedApprovals.reduce((sum, approval) => {
      const responseTime = approval.respondedAt.getTime() - approval.requestedAt.getTime();
      return sum + (responseTime / (1000 * 60 * 60));
    }, 0);

    return totalHours / completedApprovals.length;
  }

  private static groupApprovalsByType(approvals: any[]): any {
    return approvals.reduce((acc, approval) => {
      if (!acc[approval.type]) {
        acc[approval.type] = { total: 0, approved: 0, rejected: 0, pending: 0 };
      }
      acc[approval.type].total++;
      acc[approval.type][approval.status.toLowerCase()]++;
      return acc;
    }, {});
  }

  private static groupApprovalsByPriority(approvals: any[]): any {
    return approvals.reduce((acc, approval) => {
      if (!acc[approval.priority]) {
        acc[approval.priority] = { total: 0, approved: 0, rejected: 0, pending: 0 };
      }
      acc[approval.priority].total++;
      acc[approval.priority][approval.status.toLowerCase()]++;
      return acc;
    }, {});
  }

  private static groupApprovalsByBranch(approvals: any[]): any {
    return approvals.reduce((acc, approval) => {
      const branchName = approval.requester.branch?.name || 'Unknown';
      if (!acc[branchName]) {
        acc[branchName] = { total: 0, approved: 0, rejected: 0, pending: 0 };
      }
      acc[branchName].total++;
      acc[branchName][approval.status.toLowerCase()]++;
      return acc;
    }, {});
  }

  private static getMonthlyApprovalTrend(approvals: any[]): any[] {
    const monthlyData = approvals.reduce((acc, approval) => {
      const month = approval.requestedAt.toISOString().slice(0, 7); // YYYY-MM
      if (!acc[month]) {
        acc[month] = { month, total: 0, approved: 0, rejected: 0, pending: 0 };
      }
      acc[month].total++;
      acc[month][approval.status.toLowerCase()]++;
      return acc;
    }, {});

    return Object.values(monthlyData).sort((a: any, b: any) => a.month.localeCompare(b.month));
  }
}