// apps/api/src/services/waste.service.ts
import { PrismaClient, WasteType, WasteReason, Unit } from '@prisma/client';
import { AuditLogService } from './audit-log.service';
import { InventoryService } from './inventory.service';
import { RecipeService } from './recipe.service';

const prisma = new PrismaClient();

export interface CreateWasteEntryRequest {
  wasteType: WasteType;
  inventoryItemId?: string;
  recipeId?: string;
  batchId?: string;
  quantity: number;
  unit: Unit;
  reason: WasteReason;
  reasonDetail?: string;
  location?: string;
  tags?: string[];
}

export class WasteService {
  // Log waste entry with automatic cost calculation and inventory deduction
  static async logWasteEntry(
    data: CreateWasteEntryRequest,
    userId: string,
    userRole: string,
    branchId: string,
    tenantId: string
  ): Promise<any> {
    try {
      return await prisma.$transaction(async (tx) => {
        let estimatedCost = 0;
        let needsApproval = false;

        if (data.wasteType === WasteType.RAW && data.inventoryItemId) {
          // RAW waste - direct inventory item waste
          const inventoryItem = await tx.inventoryItem.findUnique({
            where: { id: data.inventoryItemId },
            include: { batches: true }
          });

          if (!inventoryItem) {
            throw new Error('Inventory item not found');
          }

          // Calculate cost based on average cost or specific batch
          if (data.batchId) {
            const batch = inventoryItem.batches.find(b => b.id === data.batchId);
            if (batch) {
              estimatedCost = data.quantity * Number(batch.unitCost);
            }
          } else {
            estimatedCost = data.quantity * Number(inventoryItem.averageCost);
          }

          // Deduct from inventory using FIFO
          const deductionResult = await InventoryService.deductInventoryFIFO(
            data.inventoryItemId,
            data.quantity,
            `Waste: ${data.reason}`,
            userId,
            branchId
          );

          if (!deductionResult.success) {
            throw new Error('Insufficient inventory for waste logging');
          }

        } else if (data.wasteType === WasteType.PRODUCT && data.recipeId) {
          // PRODUCT waste - deduct ingredients based on recipe
          const recipe = await tx.recipe.findUnique({
            where: { id: data.recipeId },
            include: { ingredients: { include: { inventoryItem: true } } }
          });

          if (!recipe) {
            throw new Error('Recipe not found');
          }

          // Calculate portion-based ingredient deduction
          const portionRatio = data.quantity / Number(recipe.yield);
          
          for (const ingredient of recipe.ingredients) {
            const ingredientQuantity = Number(ingredient.quantity) * portionRatio;
            
            // Deduct each ingredient using FIFO
            await InventoryService.deductInventoryFIFO(
              ingredient.inventoryItemId,
              ingredientQuantity,
              `Product waste: ${recipe.name}`,
              userId,
              branchId
            );

            // Add to estimated cost
            estimatedCost += ingredientQuantity * Number(ingredient.inventoryItem.averageCost);
          }
        }

        // Determine if approval is needed
        const approvalThreshold = await this.getApprovalThreshold(tenantId);
        needsApproval = userRole === 'BRANCH_ADMIN' && estimatedCost > approvalThreshold;

        let approvalRequest = null;
        if (needsApproval) {
          approvalRequest = await tx.approvalRequest.create({
            data: {
              type: 'WASTE_ENTRY',
              title: `Waste Entry: ${data.wasteType} - $${estimatedCost.toFixed(2)}`,
              description: `${data.reason}: ${data.quantity} ${data.unit}`,
              requestData: JSON.stringify(data),
              requestedBy: userId,
              approverIds: [],
              priority: estimatedCost > approvalThreshold * 2 ? 'HIGH' : 'MEDIUM'
            }
          });
        }

        // Create waste entry
        const wasteEntry = await tx.wasteEntry.create({
          data: {
            ...data,
            estimatedCost,
            branchId,
            createdBy: userId,
            status: needsApproval ? 'PENDING' : 'APPROVED',
            approvalId: approvalRequest?.id
          },
          include: {
            inventoryItem: true,
            recipe: true,
            creator: true
          }
        });

        await AuditLogService.logBusinessActivity({
          event: 'WASTE_ENTRY_LOGGED',
          action: 'CREATE',
          resourceType: 'WASTE_ENTRY',
          resourceId: wasteEntry.id,
          userId,
          username: 'system',
          tenantId,
          branchId,
          newValues: {
            ...data,
            estimatedCost,
            needsApproval
          }
        });

        return wasteEntry;
      });
    } catch (error) {
      throw new Error(`Failed to log waste entry: ${error.message}`);
    }
  }

  // Get waste analytics and reports
  static async getWasteAnalytics(
    branchId: string,
    tenantId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      wasteType?: WasteType;
      category?: string;
    } = {}
  ): Promise<any> {
    try {
      const where: any = { branchId };
      
      if (filters.startDate || filters.endDate) {
        where.wastedAt = {};
        if (filters.startDate) where.wastedAt.gte = filters.startDate;
        if (filters.endDate) where.wastedAt.lte = filters.endDate;
      }
      
      if (filters.wasteType) {
        where.wasteType = filters.wasteType;
      }

      const wasteEntries = await prisma.wasteEntry.findMany({
        where,
        include: {
          inventoryItem: true,
          recipe: true
        },
        orderBy: { wastedAt: 'desc' }
      });

      // Calculate analytics
      const totalWaste = wasteEntries.length;
      const totalCost = wasteEntries.reduce((sum, entry) => sum + Number(entry.estimatedCost), 0);
      
      // Waste by reason
      const wasteByReason = this.groupByField(wasteEntries, 'reason');
      
      // Waste by category
      const wasteByCategory = this.groupWasteByCategory(wasteEntries);
      
      // Daily waste trend
      const dailyWaste = this.groupWasteByDay(wasteEntries);
      
      // Top wasted items
      const topWastedItems = this.getTopWastedItems(wasteEntries);

      return {
        summary: {
          totalEntries: totalWaste,
          totalCost,
          averageCostPerEntry: totalWaste > 0 ? totalCost / totalWaste : 0,
          wasteByType: this.groupByField(wasteEntries, 'wasteType')
        },
        breakdown: {
          byReason: wasteByReason,
          byCategory: wasteByCategory,
          topItems: topWastedItems
        },
        trends: {
          daily: dailyWaste
        }
      };
    } catch (error) {
      throw new Error(`Failed to get waste analytics: ${error.message}`);
    }
  }

  // Get waste reduction suggestions
  static async getWasteReductionSuggestions(branchId: string): Promise<any[]> {
    try {
      const suggestions = [];
      
      // Analyze patterns from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentWaste = await prisma.wasteEntry.findMany({
        where: {
          branchId,
          wastedAt: { gte: thirtyDaysAgo }
        },
        include: {
          inventoryItem: true,
          recipe: true
        }
      });

      // Suggestion 1: Items with high waste frequency
      const frequentWasteItems = this.analyzeFrequentWaste(recentWaste);
      if (frequentWasteItems.length > 0) {
        suggestions.push({
          type: 'FREQUENT_WASTE',
          priority: 'HIGH',
          title: 'High Waste Frequency Items',
          description: 'These items are wasted frequently and may need portion or ordering adjustments',
          items: frequentWasteItems,
          actionItems: [
            'Review portion sizes',
            'Adjust ordering quantities',
            'Improve storage conditions',
            'Train staff on proper handling'
          ]
        });
      }

      // Suggestion 2: Expiry-related waste
      const expiryWaste = recentWaste.filter(w => w.reason === WasteReason.EXPIRED);
      if (expiryWaste.length > 0) {
        suggestions.push({
          type: 'EXPIRY_WASTE',
          priority: 'MEDIUM',
          title: 'Expiry Management',
          description: 'Implement better FIFO practices and expiry monitoring',
          totalCost: expiryWaste.reduce((sum, w) => sum + Number(w.estimatedCost), 0),
          actionItems: [
            'Implement expiry date labeling',
            'Set up expiry alerts',
            'Train staff on FIFO practices',
            'Review ordering frequency'
          ]
        });
      }

      return suggestions;
    } catch (error) {
      throw new Error(`Failed to get waste reduction suggestions: ${error.message}`);
    }
  }

  // Helper methods
  private static async getApprovalThreshold(tenantId: string): Promise<number> {
    // This could be configurable per tenant
    // For now, return a default threshold of $50
    return 50.00;
  }

  private static groupByField(entries: any[], field: string): any {
    return entries.reduce((acc, entry) => {
      const key = entry[field];
      if (!acc[key]) {
        acc[key] = { count: 0, totalCost: 0 };
      }
      acc[key].count++;
      acc[key].totalCost += Number(entry.estimatedCost);
      return acc;
    }, {});
  }

  private static groupWasteByCategory(entries: any[]): any {
    return entries.reduce((acc, entry) => {
      const category = entry.inventoryItem?.category || entry.recipe?.category || 'UNKNOWN';
      if (!acc[category]) {
        acc[category] = { count: 0, totalCost: 0 };
      }
      acc[category].count++;
      acc[category].totalCost += Number(entry.estimatedCost);
      return acc;
    }, {});
  }

  private static groupWasteByDay(entries: any[]): any[] {
    const dailyData = entries.reduce((acc, entry) => {
      const date = entry.wastedAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, count: 0, totalCost: 0 };
      }
      acc[date].count++;
      acc[date].totalCost += Number(entry.estimatedCost);
      return acc;
    }, {});

    return Object.values(dailyData).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }

  private static getTopWastedItems(entries: any[]): any[] {
    const itemWaste = entries.reduce((acc, entry) => {
      const key = entry.inventoryItemId || entry.recipeId;
      const name = entry.inventoryItem?.name || entry.recipe?.name || 'Unknown';
      
      if (!acc[key]) {
        acc[key] = { name, count: 0, totalCost: 0, totalQuantity: 0 };
      }
      acc[key].count++;
      acc[key].totalCost += Number(entry.estimatedCost);
      acc[key].totalQuantity += Number(entry.quantity);
      return acc;
    }, {});

    return Object.values(itemWaste)
      .sort((a: any, b: any) => b.totalCost - a.totalCost)
      .slice(0, 10);
  }

  private static analyzeFrequentWaste(entries: any[]): any[] {
    const itemCounts = this.getTopWastedItems(entries);
    return itemCounts.filter((item: any) => item.count >= 5); // 5+ waste entries in 30 days
  }
}