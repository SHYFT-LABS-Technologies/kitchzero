import { FastifyInstance } from 'fastify';
import { UserRole } from '@kitchzero/types';
import { 
  authenticateToken, 
  requireRole, 
  requireTenantDataAccess, 
  requirePasswordChange 
} from '../middleware/auth.middleware';
import { BranchAdminService } from '../services/branch-admin.service';
import { AuditLogService } from '../services/audit-log.service';

export async function branchAdminRoutes(fastify: FastifyInstance) {
  // CRITICAL: All routes require authentication and Branch Admin role
  const requireBranchAdmin = [
    authenticateToken,
    requirePasswordChange,
    requireRole([UserRole.BRANCH_ADMIN], { 
      requireTenant: true,
      requireBranch: true 
    })
  ];

  // Get branch-specific dashboard
  fastify.get('/dashboard', {
    preHandler: requireBranchAdmin,
  }, async (request, reply) => {
    const user = request.user!;
    
    try {
      const dashboard = await BranchAdminService.getBranchDashboard(
        user.branchId!,
        user.tenantId!
      );
      
      await AuditLogService.logBusinessActivity({
        event: 'BRANCH_DASHBOARD_ACCESSED',
        action: 'READ',
        resourceType: 'BRANCH_DATA',
        resourceId: user.branchId!,
        userId: user.id,
        username: user.username,
        tenantId: user.tenantId,
        branchId: user.branchId,
        ipAddress: request.auditContext?.ipAddress
      });

      return {
        success: true,
        data: dashboard
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch branch dashboard'
      });
    }
  });

  // Inventory management (branch-specific)
  fastify.get('/inventory', {
    preHandler: requireBranchAdmin,
  }, async (request, reply) => {
    const user = request.user!;
    const { category, lowStock } = request.query as any;
    
    try {
      const inventory = await BranchAdminService.getBranchInventory(
        user.branchId!,
        { category, lowStock: lowStock === 'true' }
      );

      return {
        success: true,
        data: inventory
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch inventory'
      });
    }
  });

  // Update inventory items
  fastify.put('/inventory/:itemId', {
    preHandler: [
      ...requireBranchAdmin,
      requireTenantDataAccess({ allowCrossTenantForRoles: [UserRole.RESTAURANT_ADMIN] })
    ],
  }, async (request, reply) => {
    const user = request.user!;
    const { itemId } = request.params as any;
    const updateData = request.body as any;
    
    try {
      // CRITICAL: Verify item belongs to user's branch
      const item = await BranchAdminService.getInventoryItem(itemId);
      if (!item || item.branchId !== user.branchId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied to this inventory item'
        });
      }

      const oldValues = {
        currentStock: item.currentStock,
        minStockLevel: item.minStockLevel,
        maxStockLevel: item.maxStockLevel
      };

      const updatedItem = await BranchAdminService.updateInventoryItem(
        itemId,
        updateData,
        user.id
      );
      
      await AuditLogService.logBusinessActivity({
        event: 'INVENTORY_UPDATED',
        action: 'UPDATE',
        resourceType: 'INVENTORY_ITEM',
        resourceId: itemId,
        userId: user.id,
        username: user.username,
        tenantId: user.tenantId,
        branchId: user.branchId,
        oldValues,
        newValues: updateData,
        ipAddress: request.auditContext?.ipAddress
      });

      return {
        success: true,
        data: updatedItem
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message
      });
    }
  });

  // Waste tracking and reporting
  fastify.get('/waste-reports', {
    preHandler: requireBranchAdmin,
  }, async (request, reply) => {
    const user = request.user!;
    const { startDate, endDate, category } = request.query as any;
    
    try {
      const wasteReports = await BranchAdminService.getWasteReports(
        user.branchId!,
        { startDate, endDate, category }
      );

      await AuditLogService.logBusinessActivity({
        event: 'WASTE_REPORTS_ACCESSED',
        action: 'READ',
        resourceType: 'WASTE_DATA',
        resourceId: user.branchId!,
        userId: user.id,
        username: user.username,
        tenantId: user.tenantId,
        branchId: user.branchId,
        ipAddress: request.auditContext?.ipAddress
      });

      return {
        success: true,
        data: wasteReports
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch waste reports'
      });
    }
  });

  // Record waste incidents
  fastify.post('/waste-incidents', {
    preHandler: requireBranchAdmin,
  }, async (request, reply) => {
    const user = request.user!;
    const wasteData = request.body as any;
    
    try {
      // CRITICAL: Ensure waste is recorded for user's branch only
      wasteData.branchId = user.branchId;
      wasteData.reportedBy = user.id;

      const wasteIncident = await BranchAdminService.recordWasteIncident(
        wasteData,
        user.id
      );
      
      await AuditLogService.logBusinessActivity({
        event: 'WASTE_INCIDENT_RECORDED',
        action: 'CREATE',
        resourceType: 'WASTE_INCIDENT',
        resourceId: wasteIncident.id,
        userId: user.id,
        username: user.username,
        tenantId: user.tenantId,
        branchId: user.branchId,
        newValues: wasteData,
        ipAddress: request.auditContext?.ipAddress
      });

      return {
        success: true,
        data: wasteIncident
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message
      });
    }
  });

  // Branch settings management
  fastify.get('/settings', {
    preHandler: requireBranchAdmin,
  }, async (request, reply) => {
    const user = request.user!;
    
    try {
      const settings = await BranchAdminService.getBranchSettings(user.branchId!);

      return {
        success: true,
        data: settings
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch branch settings'
      });
    }
  });

  // Update branch settings
  fastify.put('/settings', {
    preHandler: requireBranchAdmin,
  }, async (request, reply) => {
    const user = request.user!;
    const settingsData = request.body as any;
    
    try {
      const oldSettings = await BranchAdminService.getBranchSettings(user.branchId!);
      
      const updatedSettings = await BranchAdminService.updateBranchSettings(
        user.branchId!,
        settingsData,
        user.id
      );
      
      await AuditLogService.logBusinessActivity({
        event: 'BRANCH_SETTINGS_UPDATED',
        action: 'UPDATE',
        resourceType: 'BRANCH_SETTINGS',
        resourceId: user.branchId!,
        userId: user.id,
        username: user.username,
        tenantId: user.tenantId,
        branchId: user.branchId,
        oldValues: oldSettings,
        newValues: settingsData,
        ipAddress: request.auditContext?.ipAddress
      });

      return {
        success: true,
        data: updatedSettings
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message
      });
    }
  });
}