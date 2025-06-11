import { FastifyInstance } from 'fastify';
import { UserRole } from '@kitchzero/types';
import { 
  authenticateToken, 
  requireRole, 
  requireTenantDataAccess, 
  requirePasswordChange 
} from '../middleware/auth.middleware';
import { RestaurantAdminService } from '../services/restaurant-admin.service';
import { AuditLogService } from '../services/audit-log.service';

export async function restaurantAdminRoutes(fastify: FastifyInstance) {
  // CRITICAL: All routes require authentication and Restaurant Admin role
  const requireRestaurantAdmin = [
    authenticateToken,
    requirePasswordChange,
    requireRole([UserRole.RESTAURANT_ADMIN], { 
      requireTenant: true 
    })
  ];

  // Get restaurant overview with all branches
  fastify.get('/overview', {
    preHandler: requireRestaurantAdmin,
  }, async (request, reply) => {
    const user = request.user!;
    
    try {
      const overview = await RestaurantAdminService.getRestaurantOverview(user.tenantId!);
      
      await AuditLogService.logBusinessActivity({
        event: 'RESTAURANT_OVERVIEW_ACCESSED',
        action: 'READ',
        resourceType: 'RESTAURANT_DATA',
        resourceId: user.tenantId!,
        userId: user.id,
        username: user.username,
        tenantId: user.tenantId,
        ipAddress: request.auditContext?.ipAddress
      });

      return {
        success: true,
        data: overview
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch restaurant overview'
      });
    }
  });

  // Manage branches within the restaurant
  fastify.get('/branches', {
    preHandler: requireRestaurantAdmin,
  }, async (request, reply) => {
    const user = request.user!;
    
    try {
      const branches = await RestaurantAdminService.getBranches(user.tenantId!);
      
      return {
        success: true,
        data: branches
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch branches'
      });
    }
  });

  // Create new branch (Restaurant Admin privilege)
  fastify.post('/branches', {
    preHandler: [
      ...requireRestaurantAdmin,
      // Additional validation for branch creation
    ],
  }, async (request, reply) => {
    const user = request.user!;
    const branchData = request.body as any;
    
    try {
      const newBranch = await RestaurantAdminService.createBranch(
        user.tenantId!,
        branchData,
        user.id
      );
      
      await AuditLogService.logBusinessActivity({
        event: 'BRANCH_CREATED',
        action: 'CREATE',
        resourceType: 'BRANCH',
        resourceId: newBranch.id,
        userId: user.id,
        username: user.username,
        tenantId: user.tenantId,
        newValues: branchData,
        ipAddress: request.auditContext?.ipAddress
      });

      return {
        success: true,
        data: newBranch
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message
      });
    }
  });

  // Get users across all branches (Restaurant Admin view)
  fastify.get('/users', {
    preHandler: requireRestaurantAdmin,
  }, async (request, reply) => {
    const user = request.user!;
    
    try {
      const users = await RestaurantAdminService.getTenantUsers(user.tenantId!);
      
      await AuditLogService.logBusinessActivity({
        event: 'USER_LIST_ACCESSED',
        action: 'READ',
        resourceType: 'USER_DATA',
        resourceId: user.tenantId!,
        userId: user.id,
        username: user.username,
        tenantId: user.tenantId,
        ipAddress: request.auditContext?.ipAddress
      });

      return {
        success: true,
        data: users
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch users'
      });
    }
  });

  // Create branch admin users
  fastify.post('/users', {
    preHandler: requireRestaurantAdmin,
  }, async (request, reply) => {
    const user = request.user!;
    const userData = request.body as any;
    
    try {
      // CRITICAL: Restaurant Admins can only create Branch Admins within their tenant
      if (userData.role !== UserRole.BRANCH_ADMIN) {
        return reply.status(403).send({
          success: false,
          error: 'Restaurant Admins can only create Branch Admin users'
        });
      }

      if (userData.tenantId !== user.tenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Cannot create users for other tenants'
        });
      }

      const newUser = await RestaurantAdminService.createBranchAdmin(
        userData,
        user.id
      );
      
      await AuditLogService.logBusinessActivity({
        event: 'USER_CREATED',
        action: 'CREATE',
        resourceType: 'USER',
        resourceId: newUser.id,
        userId: user.id,
        username: user.username,
        tenantId: user.tenantId,
        newValues: {
          username: userData.username,
          role: userData.role,
          branchId: userData.branchId
        },
        ipAddress: request.auditContext?.ipAddress
      });

      return {
        success: true,
        data: {
          id: newUser.id,
          username: newUser.username,
          role: newUser.role,
          branchId: newUser.branchId,
          isActive: newUser.isActive
        }
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message
      });
    }
  });

  // Analytics and reporting across all branches
  fastify.get('/analytics', {
    preHandler: requireRestaurantAdmin,
  }, async (request, reply) => {
    const user = request.user!;
    const { startDate, endDate, branchId } = request.query as any;
    
    try {
      const analytics = await RestaurantAdminService.getAnalytics(
        user.tenantId!,
        { startDate, endDate, branchId }
      );
      
      await AuditLogService.logBusinessActivity({
        event: 'ANALYTICS_ACCESSED',
        action: 'READ',
        resourceType: 'ANALYTICS_DATA',
        resourceId: user.tenantId!,
        userId: user.id,
        username: user.username,
        tenantId: user.tenantId,
        details: { startDate, endDate, branchId },
        ipAddress: request.auditContext?.ipAddress
      });

      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch analytics'
      });
    }
  });

  // Audit logs for the restaurant (Restaurant Admin oversight)
  fastify.get('/audit-logs', {
    preHandler: requireRestaurantAdmin,
  }, async (request, reply) => {
    const user = request.user!;
    const { 
      eventType, 
      severity, 
      startDate, 
      endDate, 
      branchId,
      limit = 50,
      offset = 0 
    } = request.query as any;
    
    try {
      const auditLogs = await AuditLogService.getAuditLogs({
        tenantId: user.tenantId!,
        branchId,
        eventType,
        severity,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      await AuditLogService.logBusinessActivity({
        event: 'AUDIT_LOGS_ACCESSED',
        action: 'READ',
        resourceType: 'AUDIT_LOGS',
        resourceId: user.tenantId!,
        userId: user.id,
        username: user.username,
        tenantId: user.tenantId,
        ipAddress: request.auditContext?.ipAddress
      });

      return {
        success: true,
        data: auditLogs
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch audit logs'
      });
    }
  });
}