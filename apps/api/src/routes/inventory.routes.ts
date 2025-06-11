import { FastifyInstance } from 'fastify';
import { UserRole } from '@kitchzero/types';
import { PrismaClient } from '@prisma/client'; // Add this import
import { 
  authenticateToken, 
  requireRole, 
  requireTenantDataAccess, 
  requirePasswordChange 
} from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { InventoryService } from '../services/inventory.service';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const createInventoryItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.enum(['RAW_INGREDIENTS', 'FINISHED_PRODUCTS', 'BEVERAGES', 'PACKAGING', 'SUPPLIES', 'CLEANING', 'OTHER']),
  unit: z.enum(['KG', 'GRAMS', 'POUNDS', 'OUNCES', 'LITERS', 'ML', 'GALLONS', 'QUARTS', 'CUPS', 'PIECES', 'BOXES', 'PACKAGES', 'DOZEN', 'PORTION', 'SERVING']),
  minStockLevel: z.number().min(0),
  maxStockLevel: z.number().min(0).optional(),
  isPerishable: z.boolean(),
  defaultShelfLife: z.number().min(1).optional(),
  supplierId: z.string().optional()
});

const addBatchSchema = z.object({
  inventoryItemId: z.string(),
  batchNumber: z.string(),
  quantity: z.number().min(0.01),
  unitCost: z.number().min(0),
  expiryDate: z.string().datetime().optional(),
  supplierBatchNumber: z.string().optional(),
  qualityGrade: z.string().optional(),
  notes: z.string().optional()
});

const adjustmentSchema = z.object({
  inventoryItemId: z.string(),
  adjustmentType: z.enum(['RECEIVED', 'SOLD', 'WASTE', 'TRANSFER', 'COUNT', 'DAMAGED', 'THEFT', 'OTHER']),
  quantity: z.number(),
  reason: z.string().min(1),
  notes: z.string().optional()
});

export async function inventoryRoutes(fastify: FastifyInstance) {
  // Common middleware for all inventory routes
  const requireInventoryAccess = [
    authenticateToken,
    requirePasswordChange,
    requireRole([UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_ADMIN], { 
      requireTenant: true 
    })
  ];

  // Get inventory items with FIFO batch details
  fastify.get('/items', {
    preHandler: requireInventoryAccess,
  }, async (request, reply) => {
    const user = request.user!;
    const { category, lowStock, expiringSoon } = request.query as any;
    
    try {
      const inventory = await InventoryService.getInventoryWithBatches(
        user.branchId!,
        { category, lowStock: lowStock === 'true', expiringSoon: expiringSoon === 'true' }
      );

      return {
        success: true,
        data: inventory
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // Create inventory item (Restaurant Admin only)
  fastify.post('/items', {
    preHandler: [
      ...requireInventoryAccess,
      requireRole([UserRole.RESTAURANT_ADMIN]),
      validateBody(createInventoryItemSchema)
    ],
  }, async (request, reply) => {
    const user = request.user!;
    const itemData = request.body as any;
    
    try {
      const inventoryItem = await InventoryService.createInventoryItem(
        itemData,
        user.id,
        user.branchId!,
        user.tenantId!
      );

      return {
        success: true,
        data: inventoryItem
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message
      });
    }
  });

  // Add inventory batch (receiving stock)
  fastify.post('/batches', {
    preHandler: [
      ...requireInventoryAccess,
      validateBody(addBatchSchema)
    ],
  }, async (request, reply) => {
    const user = request.user!;
    const batchData = request.body as any;
    
    try {
      // Convert date string to Date object if provided
      if (batchData.expiryDate) {
        batchData.expiryDate = new Date(batchData.expiryDate);
      }

      const batch = await InventoryService.addInventoryBatch(
        batchData,
        user.id,
        user.branchId!
      );

      return {
        success: true,
        data: batch
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message
      });
    }
  });

  // Request inventory adjustment
  fastify.post('/adjustments', {
    preHandler: [
      ...requireInventoryAccess,
      validateBody(adjustmentSchema)
    ],
  }, async (request, reply) => {
    const user = request.user!;
    const adjustmentData = request.body as any;
    
    try {
      const adjustment = await InventoryService.requestInventoryAdjustment(
        adjustmentData,
        user.id,
        user.role,
        user.branchId!,
        user.tenantId!
      );

      const statusCode = user.role === 'RESTAURANT_ADMIN' ? 200 : 202; // 202 for pending approval

      return reply.status(statusCode).send({
        success: true,
        data: adjustment,
        message: user.role === 'RESTAURANT_ADMIN' ? 
          'Adjustment applied successfully' : 
          'Adjustment request submitted for approval'
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message
      });
    }
  });

  // Get low stock alerts
  fastify.get('/alerts/low-stock', {
    preHandler: requireInventoryAccess,
  }, async (request, reply) => {
    const user = request.user!;
    
    try {
      const lowStockItems = await InventoryService.getLowStockItems(user.branchId!);

      return {
        success: true,
        data: lowStockItems
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // Get expiring items
  fastify.get('/alerts/expiring', {
    preHandler: requireInventoryAccess,
  }, async (request, reply) => {
    const user = request.user!;
    const { days = 7 } = request.query as any;
    
    try {
      const expiringItems = await InventoryService.getExpiringItems(
        user.branchId!,
        parseInt(days)
      );

      return {
        success: true,
        data: expiringItems
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