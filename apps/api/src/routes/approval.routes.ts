import { FastifyInstance } from 'fastify';
import { UserRole } from '@kitchzero/types';
import { PrismaClient } from '@prisma/client'; // Add this import
import { 
  authenticateToken, 
  requireRole, 
  requirePasswordChange 
} from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { ApprovalService } from '../services/approval.service';
import { z } from 'zod';

const prisma = new PrismaClient();

const approvalDecisionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().optional()
});

export async function approvalRoutes(fastify: FastifyInstance) {
  // Only Restaurant Admins can approve requests
  const requireApprovalAccess = [
    authenticateToken,
    requirePasswordChange,
    requireRole([UserRole.RESTAURANT_ADMIN], { requireTenant: true })
  ];

  // Get pending approvals
  fastify.get('/pending', {
    preHandler: requireApprovalAccess,
  }, async (request, reply) => {
    const user = request.user!;
    
    try {
      const pendingApprovals = await ApprovalService.getPendingApprovals(
        user.id,
        user.tenantId!,
        user.role as UserRole
      );

      return {
        success: true,
        data: pendingApprovals
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // Process approval decision
  fastify.post('/:approvalId/decision', {
    preHandler: [
      ...requireApprovalAccess,
      validateBody(approvalDecisionSchema)
    ],
  }, async (request, reply) => {
    const user = request.user!;
    const { approvalId } = request.params as any;
    const decision = request.body as any;
    
    try {
      const result = await ApprovalService.processApprovalDecision(
        approvalId,
        decision,
        user.id,
        user.tenantId!
      );

      return {
        success: true,
        data: result,
        message: `Request ${decision.status.toLowerCase()} successfully`
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message
      });
    }
  });

  // Get approval analytics
  fastify.get('/analytics', {
    preHandler: requireApprovalAccess,
  }, async (request, reply) => {
    const user = request.user!;
    const { startDate, endDate, type, status } = request.query as any;
    
    try {
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (type) filters.type = type;
      if (status) filters.status = status;

      const analytics = await ApprovalService.getApprovalAnalytics(
        user.tenantId!,
        filters
      );

      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // Get approval history
  fastify.get('/history', {
    preHandler: requireApprovalAccess,
  }, async (request, reply) => {
    const user = request.user!;
    const { page = 1, limit = 20, type, status } = request.query as any;
    
    try {
      const where: any = {};
      if (type) where.type = type;
      if (status) where.status = status;

      const [approvals, total] = await Promise.all([
        prisma.approvalRequest.findMany({
          where,
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
            approver: {
              select: {
                id: true,
                username: true
              }
            }
          },
          orderBy: { requestedAt: 'desc' },
          take: parseInt(limit),
          skip: (parseInt(page) - 1) * parseInt(limit)
        }),
        prisma.approvalRequest.count({ where })
      ]);

      return {
        success: true,
        data: {
          approvals: approvals.map(approval => ({
            ...approval,
            parsedRequestData: JSON.parse(approval.requestData)
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
          }
        }
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });
}