// apps/api/src/services/inventory.service.ts
import { PrismaClient, InventoryItem, InventoryBatch, AdjustmentType, Unit, InventoryCategory } from '@prisma/client';
import { AuditLogService } from './audit-log.service';

const prisma = new PrismaClient();

export interface CreateInventoryItemRequest {
  name: string;
  description?: string;
  category: InventoryCategory;
  unit: Unit;
  minStockLevel: number;
  maxStockLevel?: number;
  isPerishable: boolean;
  defaultShelfLife?: number;
  supplierId?: string;
}

export interface InventoryBatchRequest {
  inventoryItemId: string;
  batchNumber: string;
  quantity: number;
  unitCost: number;
  expiryDate?: Date;
  supplierBatchNumber?: string;
  qualityGrade?: string;
  notes?: string;
}

export interface InventoryAdjustmentRequest {
  inventoryItemId: string;
  adjustmentType: AdjustmentType;
  quantity: number;
  reason: string;
  notes?: string;
}

export class InventoryService {
  // CRITICAL: FIFO-based inventory deduction
  static async deductInventoryFIFO(
    inventoryItemId: string,
    quantityToDeduct: number,
    reason: string,
    userId: string,
    branchId: string
  ): Promise<{ success: boolean; deductedBatches: any[]; insufficientStock?: boolean }> {
    const deductedBatches: any[] = [];
    let remainingToDeduct = quantityToDeduct;

    try {
      return await prisma.$transaction(async (tx) => {
        // Get inventory item
        const inventoryItem = await tx.inventoryItem.findUnique({
          where: { id: inventoryItemId },
          include: { batches: true }
        });

        if (!inventoryItem) {
          throw new Error('Inventory item not found');
        }

        // Check if we have enough total stock
        const totalAvailable = inventoryItem.batches.reduce(
          (sum, batch) => sum + Number(batch.remainingQuantity), 0
        );

        if (totalAvailable < quantityToDeduct) {
          return {
            success: false,
            deductedBatches: [],
            insufficientStock: true
          };
        }

        // FIFO: Sort batches by received date (oldest first)
        // For perishables, prioritize by expiry date (closest to expiry first)
        const sortedBatches = inventoryItem.batches
          .filter(batch => Number(batch.remainingQuantity) > 0)
          .sort((a, b) => {
            if (inventoryItem.isPerishable && a.expiryDate && b.expiryDate) {
              return a.expiryDate.getTime() - b.expiryDate.getTime();
            }
            return a.receivedDate.getTime() - b.receivedDate.getTime();
          });

        // Deduct from batches in FIFO order
        for (const batch of sortedBatches) {
          if (remainingToDeduct <= 0) break;

          const batchAvailable = Number(batch.remainingQuantity);
          const deductFromThisBatch = Math.min(remainingToDeduct, batchAvailable);

          // Update batch quantity
          await tx.inventoryBatch.update({
            where: { id: batch.id },
            data: {
              remainingQuantity: batchAvailable - deductFromThisBatch
            }
          });

          deductedBatches.push({
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            quantityDeducted: deductFromThisBatch,
            unitCost: Number(batch.unitCost),
            totalCost: deductFromThisBatch * Number(batch.unitCost)
          });

          remainingToDeduct -= deductFromThisBatch;
        }

        // Update inventory item current stock
        await tx.inventoryItem.update({
          where: { id: inventoryItemId },
          data: {
            currentStock: Number(inventoryItem.currentStock) - quantityToDeduct
          }
        });

        // Create inventory adjustment record
        await tx.inventoryAdjustment.create({
          data: {
            inventoryItemId,
            adjustmentType: AdjustmentType.SOLD,
            quantity: -quantityToDeduct,
            reason,
            branchId,
            createdBy: userId,
            status: 'APPROVED' // Auto-approve deductions
          }
        });

        // Log the transaction
        await AuditLogService.logBusinessActivity({
          event: 'INVENTORY_DEDUCTED_FIFO',
          action: 'UPDATE',
          resourceType: 'INVENTORY_ITEM',
          resourceId: inventoryItemId,
          userId,
          username: 'system',
          branchId,
          details: {
            quantityDeducted: quantityToDeduct,
            reason,
            batchesAffected: deductedBatches.length,
            deductedBatches
          }
        });

        return {
          success: true,
          deductedBatches
        };
      });
    } catch (error) {
      console.error('FIFO deduction failed:', error);
      throw new Error(`Failed to deduct inventory: ${error.message}`);
    }
  }

  // Create new inventory item
  static async createInventoryItem(
    data: CreateInventoryItemRequest,
    userId: string,
    branchId: string,
    tenantId: string
  ): Promise<InventoryItem> {
    try {
      const inventoryItem = await prisma.inventoryItem.create({
        data: {
          ...data,
          currentStock: 0,
          averageCost: 0,
          lastCost: 0,
          tenantId,
          branchId,
          createdBy: userId
        },
        include: {
          supplier: true,
          creator: true
        }
      });

      await AuditLogService.logBusinessActivity({
        event: 'INVENTORY_ITEM_CREATED',
        action: 'CREATE',
        resourceType: 'INVENTORY_ITEM',
        resourceId: inventoryItem.id,
        userId,
        username: 'system',
        tenantId,
        branchId,
        newValues: data
      });

      return inventoryItem;
    } catch (error) {
      throw new Error(`Failed to create inventory item: ${error.message}`);
    }
  }

  // Add inventory batch (receiving stock)
  static async addInventoryBatch(
    data: InventoryBatchRequest,
    userId: string,
    branchId: string
  ): Promise<InventoryBatch> {
    try {
      return await prisma.$transaction(async (tx) => {
        // Create the batch
        const batch = await tx.inventoryBatch.create({
          data: {
            ...data,
            remainingQuantity: data.quantity,
            totalCost: data.quantity * data.unitCost
          }
        });

        // Update inventory item stock and costs
        const inventoryItem = await tx.inventoryItem.findUnique({
          where: { id: data.inventoryItemId },
          include: { batches: true }
        });

        if (!inventoryItem) {
          throw new Error('Inventory item not found');
        }

        const newTotalStock = Number(inventoryItem.currentStock) + data.quantity;
        const totalValue = inventoryItem.batches.reduce(
          (sum, b) => sum + (Number(b.remainingQuantity) * Number(b.unitCost)), 0
        ) + (data.quantity * data.unitCost);
        
        const newAverageCost = newTotalStock > 0 ? totalValue / newTotalStock : 0;

        await tx.inventoryItem.update({
          where: { id: data.inventoryItemId },
          data: {
            currentStock: newTotalStock,
            averageCost: newAverageCost,
            lastCost: data.unitCost
          }
        });

        // Create adjustment record
        await tx.inventoryAdjustment.create({
          data: {
            inventoryItemId: data.inventoryItemId,
            adjustmentType: AdjustmentType.RECEIVED,
            quantity: data.quantity,
            reason: 'Stock received',
            branchId,
            createdBy: userId,
            status: 'APPROVED'
          }
        });

        await AuditLogService.logBusinessActivity({
          event: 'INVENTORY_BATCH_ADDED',
          action: 'CREATE',
          resourceType: 'INVENTORY_BATCH',
          resourceId: batch.id,
          userId,
          username: 'system',
          branchId,
          newValues: data
        });

        return batch;
      });
    } catch (error) {
      throw new Error(`Failed to add inventory batch: ${error.message}`);
    }
  }

  // Get low stock items
  static async getLowStockItems(branchId: string | null, tenantId: string): Promise<any[]> {
    try {
      console.log('🔍 Fetching low stock items for branchId:', branchId, 'tenantId:', tenantId);
      
      // Build where clause based on branchId (null = all branches for restaurant admin)
      const where: any = { tenantId };
      if (branchId) {
        where.branchId = branchId;
      }
      
      // Get all inventory items first, then filter in application
      const allItems = await prisma.inventoryItem.findMany({
        where,
        include: {
          supplier: true,
          branch: true, // Include branch info for restaurant admin
          batches: {
            where: {
              remainingQuantity: { gt: 0 }
            },
            orderBy: { expiryDate: 'asc' }
          }
        },
        orderBy: [
          { currentStock: 'asc' },
          { name: 'asc' }
        ]
      });

      console.log(`📦 Found ${allItems.length} total inventory items`);

      // Filter items where currentStock <= minStockLevel
      const lowStockItems = allItems.filter(item => 
        Number(item.currentStock) <= Number(item.minStockLevel)
      );

      console.log(`⚠️ Found ${lowStockItems.length} low stock items`);

      return lowStockItems.map(item => ({
        ...item,
        stockLevel: Number(item.currentStock) <= 0 ? 'OUT_OF_STOCK' :
                   Number(item.currentStock) <= Number(item.minStockLevel) * 0.5 ? 'CRITICAL' : 'LOW',
        daysUntilEmpty: this.calculateDaysUntilEmpty(item),
        nextExpiryDate: item.batches[0]?.expiryDate || null
      }));
    } catch (error) {
      console.error('❌ Error in getLowStockItems:', error);
      throw new Error(`Failed to get low stock items: ${error.message}`);
    }
  }

 // Get expiring items
 static async getExpiringItems(branchId: string | null, daysAhead: number = 7, tenantId: string): Promise<any[]> {
   try {
     console.log(`🔍 Fetching expiring items for branchId: ${branchId}, daysAhead: ${daysAhead}, tenantId: ${tenantId}`);
     
     const expiryDate = new Date();
     expiryDate.setDate(expiryDate.getDate() + daysAhead);

     // Build where clause - if branchId is null, get from all branches in tenant
     const inventoryItemWhere: any = { tenantId };
     if (branchId) {
       inventoryItemWhere.branchId = branchId;
     }

     const expiringBatches = await prisma.inventoryBatch.findMany({
       where: {
         inventoryItem: inventoryItemWhere,
         expiryDate: {
           lte: expiryDate,
           gte: new Date()
         },
         remainingQuantity: { gt: 0 }
       },
       include: {
         inventoryItem: {
           include: {
             branch: true // Include branch info for restaurant admin
           }
         }
       },
       orderBy: { expiryDate: 'asc' }
     });

     console.log(`⏰ Found ${expiringBatches.length} expiring batches`);

     return expiringBatches.map(batch => ({
       ...batch,
       daysUntilExpiry: Math.ceil(
         (batch.expiryDate!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
       ),
       urgency: this.getExpiryUrgency(batch.expiryDate!)
     }));
   } catch (error) {
     console.error('❌ Error in getExpiringItems:', error);
     throw new Error(`Failed to get expiring items: ${error.message}`);
   }
 }

 // Calculate days until empty based on usage patterns
 private static calculateDaysUntilEmpty(item: any): number | null {
   // This would typically analyze usage patterns over the last 30 days
   // For now, return a simple estimate
   const avgDailyUsage = 1; // Placeholder - should be calculated from actual usage
   return avgDailyUsage > 0 ? Math.ceil(Number(item.currentStock) / avgDailyUsage) : null;
 }

 // Get expiry urgency level
 private static getExpiryUrgency(expiryDate: Date): string {
   const daysUntilExpiry = Math.ceil(
     (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
   );
   
   if (daysUntilExpiry <= 1) return 'CRITICAL';
   if (daysUntilExpiry <= 3) return 'HIGH';
   if (daysUntilExpiry <= 7) return 'MEDIUM';
   return 'LOW';
 }

 // Get inventory with FIFO batch details
 static async getInventoryWithBatches(branchId: string | null, filters?: {
   category?: InventoryCategory;
   lowStock?: boolean;
   expiringSoon?: boolean;
   tenantId?: string;
 }): Promise<any[]> {
   try {
     console.log(`🔍 Fetching inventory with batches for branchId: ${branchId}`, filters);
     
     // Build where clause - tenant is required, branchId is optional for restaurant admin
     const where: any = { tenantId: filters?.tenantId };
     if (branchId) {
       where.branchId = branchId;
     }
     
     if (filters?.category) {
       where.category = filters.category;
     }

     const items = await prisma.inventoryItem.findMany({
       where,
       include: {
         batches: {
           where: { remainingQuantity: { gt: 0 } },
           orderBy: [
             { expiryDate: 'asc' },
             { receivedDate: 'asc' }
           ]
         },
         supplier: true,
         branch: true // Include branch info for restaurant admin
       },
       orderBy: { name: 'asc' }
     });

     console.log(`📦 Found ${items.length} inventory items with batches`);

     let filteredItems = items;

     // Apply low stock filter after fetching
     if (filters?.lowStock) {
       filteredItems = items.filter(item => 
         Number(item.currentStock) <= Number(item.minStockLevel)
       );
       console.log(`⚠️ Filtered to ${filteredItems.length} low stock items`);
     }

     const result = filteredItems.map(item => ({
       ...item,
       averageUnitCost: item.batches.length > 0 ? 
         item.batches.reduce((sum, batch) => sum + Number(batch.unitCost), 0) / item.batches.length : 0,
       fifoOrder: item.batches.map((batch, index) => ({
         ...batch,
         fifoPosition: index + 1,
         daysUntilExpiry: batch.expiryDate ? 
           Math.ceil((batch.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
       })),
       stockStatus: this.getStockStatus(item),
       totalValue: item.batches.reduce(
         (sum, batch) => sum + (Number(batch.remainingQuantity) * Number(batch.unitCost)), 0
       )
     }));

     console.log(`✅ Returning ${result.length} processed inventory items`);
     return result;
   } catch (error) {
     console.error('❌ Error in getInventoryWithBatches:', error);
     throw new Error(`Failed to get inventory with batches: ${error.message}`);
   }
 }

 private static getStockStatus(item: any): string {
   const current = Number(item.currentStock);
   const min = Number(item.minStockLevel);
   const max = Number(item.maxStockLevel) || min * 3;

   if (current <= 0) return 'OUT_OF_STOCK';
   if (current <= min * 0.5) return 'CRITICAL';
   if (current <= min) return 'LOW';
   if (current >= max) return 'OVERSTOCK';
   return 'NORMAL';
 }

 // Request inventory adjustment (requires approval for branch admins)
 static async requestInventoryAdjustment(
   data: InventoryAdjustmentRequest,
   userId: string,
   userRole: string,
   branchId: string,
   tenantId: string
 ): Promise<any> {
   try {
     // Restaurant admins can directly adjust, branch admins need approval
     const needsApproval = userRole === 'BRANCH_ADMIN';
     
     if (!needsApproval) {
       // Direct adjustment for restaurant admins
       return await this.executeInventoryAdjustment(data, userId, branchId);
     }

     // Create approval request for branch admins
     const approvalRequest = await prisma.approvalRequest.create({
       data: {
         type: 'INVENTORY_ADJUSTMENT',
         title: `Inventory Adjustment: ${data.adjustmentType}`,
         description: `${data.reason} - Quantity: ${data.quantity}`,
         requestData: JSON.stringify(data),
         requestedBy: userId,
         approverIds: [], // Will be populated by workflow
         priority: Math.abs(data.quantity) > 100 ? 'HIGH' : 'MEDIUM'
       }
     });

     // Create pending adjustment
     const adjustment = await prisma.inventoryAdjustment.create({
       data: {
         ...data,
         branchId,
         createdBy: userId,
         status: 'PENDING',
         approvalId: approvalRequest.id
       },
       include: {
         inventoryItem: true,
         creator: true
       }
     });

     await AuditLogService.logBusinessActivity({
       event: 'INVENTORY_ADJUSTMENT_REQUESTED',
       action: 'CREATE',
       resourceType: 'INVENTORY_ADJUSTMENT',
       resourceId: adjustment.id,
       userId,
       username: 'system',
       tenantId,
       branchId,
       newValues: data
     });

     return adjustment;
   } catch (error) {
     throw new Error(`Failed to request inventory adjustment: ${error.message}`);
   }
 }

 // Execute inventory adjustment (for approved requests)
 private static async executeInventoryAdjustment(
   data: InventoryAdjustmentRequest,
   userId: string,
   branchId: string
 ): Promise<any> {
   return await prisma.$transaction(async (tx) => {
     const inventoryItem = await tx.inventoryItem.findUnique({
       where: { id: data.inventoryItemId }
     });

     if (!inventoryItem) {
       throw new Error('Inventory item not found');
     }

     // Calculate new stock level
     const currentStock = Number(inventoryItem.currentStock);
     const adjustmentQuantity = data.adjustmentType === AdjustmentType.RECEIVED ? 
       Math.abs(data.quantity) : -Math.abs(data.quantity);
     const newStock = currentStock + adjustmentQuantity;

     if (newStock < 0) {
       throw new Error('Insufficient stock for adjustment');
     }

     // Update inventory
     await tx.inventoryItem.update({
       where: { id: data.inventoryItemId },
       data: { currentStock: newStock }
     });

     // Create adjustment record
     const adjustment = await tx.inventoryAdjustment.create({
       data: {
         ...data,
         quantity: adjustmentQuantity,
         branchId,
         createdBy: userId,
         status: 'APPROVED'
       }
     });

     return adjustment;
   });
 }
}