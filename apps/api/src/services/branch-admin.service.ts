// apps/api/src/services/branch-admin.service.ts
import { PrismaClient } from '@prisma/client';
import { AuditLogService } from './audit-log.service';

const prisma = new PrismaClient();

export interface BranchDashboardData {
  summary: {
    totalInventoryItems: number;
    lowStockItems: number;
    expiringItems: number;
    todayWaste: number;
    monthlyWasteCost: number;
  };
  recentActivity: any[];
  alerts: any[];
}

export interface BranchInventoryFilters {
  category?: string;
  lowStock?: boolean;
}

export interface WasteReportFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
}

export interface WasteIncidentData {
  wasteType: string;
  inventoryItemId?: string;
  recipeId?: string;
  quantity: number;
  unit: string;
  reason: string;
  reasonDetail?: string;
  location?: string;
  branchId: string;
  reportedBy: string;
}

export class BranchAdminService {
  // Get branch-specific dashboard data
  static async getBranchDashboard(branchId: string, tenantId: string): Promise<BranchDashboardData> {
    try {
      const [inventoryStats, wasteStats, recentActivity] = await Promise.all([
        this.getInventoryStats(branchId),
        this.getWasteStats(branchId),
        this.getRecentActivity(branchId)
      ]);

      const alerts = await this.generateAlerts(branchId);

      return {
        summary: {
          totalInventoryItems: inventoryStats.total,
          lowStockItems: inventoryStats.lowStock,
          expiringItems: inventoryStats.expiring,
          todayWaste: wasteStats.todayEntries,
          monthlyWasteCost: wasteStats.monthlyCost
        },
        recentActivity,
        alerts
      };
    } catch (error) {
      throw new Error(`Failed to get branch dashboard: ${error.message}`);
    }
  }

  // Get branch inventory with filters
  static async getBranchInventory(branchId: string, filters: BranchInventoryFilters): Promise<any[]> {
    try {
      const where: any = { branchId };

      if (filters.category) {
        where.category = filters.category;
      }

      if (filters.lowStock) {
        where.currentStock = {
          lte: prisma.inventoryItem.fields.minStockLevel
        };
      }

      const inventory = await prisma.inventoryItem.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              name: true
            }
          },
          batches: {
            where: {
              remainingQuantity: { gt: 0 }
            },
            orderBy: [
              { expiryDate: 'asc' },
              { receivedDate: 'asc' }
            ]
          }
        },
        orderBy: { name: 'asc' }
      });

      return inventory.map(item => ({
        ...item,
        stockStatus: this.getStockStatus(item),
        nextExpiry: item.batches[0]?.expiryDate || null,
        totalValue: Number(item.currentStock) * Number(item.averageCost),
        daysOfStock: this.calculateDaysOfStock(item)
      }));
    } catch (error) {
      throw new Error(`Failed to get branch inventory: ${error.message}`);
    }
  }

  // Get a specific inventory item
  static async getInventoryItem(itemId: string): Promise<any> {
    try {
      const item = await prisma.inventoryItem.findUnique({
        where: { id: itemId },
        include: {
          batches: {
            orderBy: [
              { expiryDate: 'asc' },
              { receivedDate: 'asc' }
            ]
          },
          supplier: true
        }
      });

      return item;
    } catch (error) {
      throw new Error(`Failed to get inventory item: ${error.message}`);
    }
  }

  // Update inventory item (basic info only, not stock levels)
  static async updateInventoryItem(
    itemId: string,
    updateData: any,
    userId: string
  ): Promise<any> {
    try {
      const allowedFields = [
        'name',
        'description',
        'minStockLevel',
        'maxStockLevel',
        'supplierId'
      ];

      const filteredData = Object.keys(updateData)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updateData[key];
          return obj;
        }, {} as any);

      const updatedItem = await prisma.inventoryItem.update({
        where: { id: itemId },
        data: {
          ...filteredData,
          updatedAt: new Date()
        }
      });

      await AuditLogService.logBusinessActivity({
        event: 'INVENTORY_ITEM_UPDATED',
        action: 'UPDATE',
        resourceType: 'INVENTORY_ITEM',
        resourceId: itemId,
        userId,
        username: 'system',
        newValues: filteredData
      });

      return updatedItem;
    } catch (error) {
      throw new Error(`Failed to update inventory item: ${error.message}`);
    }
  }

  // Get waste reports for branch
  static async getWasteReports(branchId: string, filters: WasteReportFilters): Promise<any> {
    try {
      const where: any = { branchId };

      if (filters.startDate || filters.endDate) {
        where.wastedAt = {};
        if (filters.startDate) where.wastedAt.gte = new Date(filters.startDate);
        if (filters.endDate) where.wastedAt.lte = new Date(filters.endDate);
      }

      if (filters.category) {
        where.OR = [
          {
            inventoryItem: {
              category: filters.category
            }
          },
          {
            recipe: {
              category: filters.category
            }
          }
        ];
      }

      const wasteEntries = await prisma.wasteEntry.findMany({
        where,
        include: {
          inventoryItem: {
            select: {
              id: true,
              name: true,
              category: true,
              unit: true
            }
          },
          recipe: {
            select: {
              id: true,
              name: true,
              category: true
            }
          },
          creator: {
            select: {
              id: true,
              username: true
            }
          }
        },
        orderBy: { wastedAt: 'desc' }
      });

      const summary = this.calculateWasteSummary(wasteEntries);

      return {
        entries: wasteEntries,
        summary
      };
    } catch (error) {
      throw new Error(`Failed to get waste reports: ${error.message}`);
    }
  }

  // Record waste incident
  static async recordWasteIncident(wasteData: WasteIncidentData, userId: string): Promise<any> {
    try {
      // Calculate estimated cost
      let estimatedCost = 0;

      if (wasteData.wasteType === 'RAW' && wasteData.inventoryItemId) {
        const item = await prisma.inventoryItem.findUnique({
          where: { id: wasteData.inventoryItemId }
        });
        if (item) {
          estimatedCost = wasteData.quantity * Number(item.averageCost);
        }
      } else if (wasteData.wasteType === 'PRODUCT' && wasteData.recipeId) {
        const recipe = await prisma.recipe.findUnique({
          where: { id: wasteData.recipeId }
        });
        if (recipe) {
          estimatedCost = wasteData.quantity * Number(recipe.costPerServing || 0);
        }
      }

      const wasteEntry = await prisma.wasteEntry.create({
        data: {
          wasteType: wasteData.wasteType as any,
          inventoryItemId: wasteData.inventoryItemId,
          recipeId: wasteData.recipeId,
          quantity: wasteData.quantity,
          unit: wasteData.unit as any,
          reason: wasteData.reason as any,
          reasonDetail: wasteData.reasonDetail,
          location: wasteData.location,
          estimatedCost,
          branchId: wasteData.branchId,
          createdBy: userId,
          status: 'PENDING' // Will need approval if over threshold
        }
      });

      await AuditLogService.logBusinessActivity({
        event: 'WASTE_INCIDENT_RECORDED',
        action: 'CREATE',
        resourceType: 'WASTE_ENTRY',
        resourceId: wasteEntry.id,
        userId,
        username: 'system',
        branchId: wasteData.branchId,
        newValues: {
          ...wasteData,
          estimatedCost
        }
      });

      return wasteEntry;
    } catch (error) {
      throw new Error(`Failed to record waste incident: ${error.message}`);
    }
  }

  // Get branch settings
  static async getBranchSettings(branchId: string): Promise<any> {
    try {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId }
      });

      if (!branch) {
        throw new Error('Branch not found');
      }

      // Return current settings (could be expanded with actual settings table)
      return {
        branchId: branch.id,
        name: branch.name,
        slug: branch.slug,
        isActive: branch.isActive,
        // Default settings - in a real app, these would come from a settings table
        notifications: {
          lowStockAlerts: true,
          expiryAlerts: true,
          wasteThresholdAlerts: true
        },
        thresholds: {
          lowStockPercentage: 20,
          expiryWarningDays: 3,
          wasteApprovalThreshold: 50.00
        }
      };
    } catch (error) {
      throw new Error(`Failed to get branch settings: ${error.message}`);
    }
  }

  // Update branch settings
  static async updateBranchSettings(
    branchId: string,
    settingsData: any,
    userId: string
  ): Promise<any> {
    try {
      // For now, just update basic branch info
      // In a real app, you'd have a separate settings table
      const allowedFields = ['name'];
      const filteredData = Object.keys(settingsData)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = settingsData[key];
          return obj;
        }, {} as any);

      if (Object.keys(filteredData).length > 0) {
        await prisma.branch.update({
          where: { id: branchId },
          data: filteredData
        });
      }

      await AuditLogService.logBusinessActivity({
        event: 'BRANCH_SETTINGS_UPDATED',
        action: 'UPDATE',
        resourceType: 'BRANCH_SETTINGS',
        resourceId: branchId,
        userId,
        username: 'system',
        branchId,
        newValues: settingsData
      });

      return await this.getBranchSettings(branchId);
    } catch (error) {
      throw new Error(`Failed to update branch settings: ${error.message}`);
    }
  }

  // Helper methods
  private static async getInventoryStats(branchId: string): Promise<any> {
    const [total, lowStock, expiring] = await Promise.all([
      prisma.inventoryItem.count({
        where: { branchId }
      }),
      prisma.inventoryItem.count({
        where: {
          branchId,
          currentStock: {
            lte: prisma.inventoryItem.fields.minStockLevel
          }
        }
      }),
      prisma.inventoryBatch.count({
        where: {
          inventoryItem: { branchId },
          expiryDate: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
          },
          remainingQuantity: { gt: 0 }
        }
      })
    ]);

    return { total, lowStock, expiring };
  }

  private static async getWasteStats(branchId: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [todayEntries, monthlyCost] = await Promise.all([
      prisma.wasteEntry.count({
        where: {
          branchId,
          wastedAt: { gte: today }
        }
      }),
      prisma.wasteEntry.aggregate({
        where: {
          branchId,
          wastedAt: { gte: monthStart }
        },
        _sum: {
          estimatedCost: true
        }
      })
    ]);

    return {
      todayEntries,
      monthlyCost: Number(monthlyCost._sum.estimatedCost || 0)
    };
  }

  private static async getRecentActivity(branchId: string): Promise<any[]> {
    const activities = await prisma.auditLog.findMany({
      where: {
        branchId,
        eventType: {
          in: ['INVENTORY', 'WASTE', 'BUSINESS_ACTIVITY']
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    });

    return activities.map(activity => ({
      id: activity.id,
      event: activity.event,
      timestamp: activity.timestamp,
      username: activity.username,
      details: activity.details ? JSON.parse(activity.details) : null
    }));
  }

  private static async generateAlerts(branchId: string): Promise<any[]> {
    const alerts = [];

    // Low stock alerts
    const lowStockItems = await prisma.inventoryItem.findMany({
      where: {
        branchId,
        currentStock: {
          lte: prisma.inventoryItem.fields.minStockLevel
        }
      },
      select: { id: true, name: true, currentStock: true, minStockLevel: true }
    });

    if (lowStockItems.length > 0) {
      alerts.push({
        type: 'LOW_STOCK',
        severity: 'HIGH',
        message: `${lowStockItems.length} items are below minimum stock level`,
        items: lowStockItems
      });
    }

    // Expiry alerts
    const expiringItems = await prisma.inventoryBatch.findMany({
      where: {
        inventoryItem: { branchId },
        expiryDate: {
          lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // Next 3 days
        },
        remainingQuantity: { gt: 0 }
      },
      include: {
        inventoryItem: {
          select: { name: true }
        }
      }
    });

    if (expiringItems.length > 0) {
      alerts.push({
        type: 'EXPIRING_ITEMS',
        severity: 'MEDIUM',
        message: `${expiringItems.length} batches expiring in next 3 days`,
        items: expiringItems
      });
    }

    return alerts;
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

  private static calculateDaysOfStock(item: any): number | null {
    // This would typically analyze usage patterns
    // For now, return a simple estimate
    const avgDailyUsage = 1; // Placeholder
    return avgDailyUsage > 0 ? Math.ceil(Number(item.currentStock) / avgDailyUsage) : null;
  }

  private static calculateWasteSummary(wasteEntries: any[]): any {
    const totalCost = wasteEntries.reduce((sum, entry) => sum + Number(entry.estimatedCost), 0);
   const totalEntries = wasteEntries.length;

   const byType = wasteEntries.reduce((acc, entry) => {
     acc[entry.wasteType] = (acc[entry.wasteType] || 0) + Number(entry.estimatedCost);
     return acc;
   }, {} as Record<string, number>);

   const byReason = wasteEntries.reduce((acc, entry) => {
     acc[entry.reason] = (acc[entry.reason] || 0) + Number(entry.estimatedCost);
     return acc;
   }, {} as Record<string, number>);

   const byCategory = wasteEntries.reduce((acc, entry) => {
     const category = entry.inventoryItem?.category || entry.recipe?.category || 'UNKNOWN';
     acc[category] = (acc[category] || 0) + Number(entry.estimatedCost);
     return acc;
   }, {} as Record<string, number>);

   return {
     totalCost,
     totalEntries,
     averageCostPerEntry: totalEntries > 0 ? totalCost / totalEntries : 0,
     byType,
     byReason,
     byCategory
   };
 }
}