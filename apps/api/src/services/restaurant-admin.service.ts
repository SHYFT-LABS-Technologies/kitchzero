// apps/api/src/services/restaurant-admin.service.ts
import { PrismaClient, UserRole } from '@prisma/client';
import { AuditLogService } from './audit-log.service';
import { PasswordService } from './password.service';

const prisma = new PrismaClient();

export interface CreateBranchRequest {
  name: string;
  slug: string;
  isActive?: boolean;
}

export interface CreateBranchAdminRequest {
  username: string;
  password: string;
  role: UserRole;
  tenantId: string;
  branchId: string;
}

export class RestaurantAdminService {
  // Get restaurant overview with all branches
  static async getRestaurantOverview(tenantId: string): Promise<any> {
    try {
      const [tenant, branches, users, totalInventoryValue, totalWaste] = await Promise.all([
        prisma.tenant.findUnique({
          where: { id: tenantId }
        }),
        prisma.branch.count({
          where: { tenantId, isActive: true }
        }),
        prisma.user.count({
          where: { tenantId, isActive: true }
        }),
        this.calculateTotalInventoryValue(tenantId),
        this.calculateTotalWaste(tenantId)
      ]);

      return {
        tenant,
        summary: {
          totalBranches: branches,
          totalUsers: users,
          totalInventoryValue,
          totalWaste,
          wastePercentage: totalInventoryValue > 0 ? (totalWaste / totalInventoryValue) * 100 : 0
        },
        branches: await this.getBranchSummaries(tenantId)
      };
    } catch (error) {
      throw new Error(`Failed to get restaurant overview: ${error.message}`);
    }
  }

  // Get all branches for tenant
  static async getBranches(tenantId: string): Promise<any[]> {
    try {
      const branches = await prisma.branch.findMany({
        where: { tenantId },
        include: {
          users: {
            select: {
              id: true,
              username: true,
              role: true,
              isActive: true
            }
          },
          _count: {
            select: {
              users: true,
              inventoryItems: true,
              wasteEntries: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      return branches.map(branch => ({
        ...branch,
        metrics: {
          totalUsers: branch._count.users,
          totalInventoryItems: branch._count.inventoryItems,
          totalWasteEntries: branch._count.wasteEntries
        }
      }));
    } catch (error) {
      throw new Error(`Failed to get branches: ${error.message}`);
    }
  }

  // Create new branch
  static async createBranch(
    tenantId: string,
    branchData: CreateBranchRequest,
    createdBy: string
  ): Promise<any> {
    try {
      // Check if slug is unique within tenant
      const existingBranch = await prisma.branch.findFirst({
        where: {
          tenantId,
          slug: branchData.slug
        }
      });

      if (existingBranch) {
        throw new Error('Branch slug already exists in this tenant');
      }

      const branch = await prisma.branch.create({
        data: {
          name: branchData.name,
          slug: branchData.slug,
          tenantId,
          isActive: branchData.isActive ?? true
        }
      });

      await AuditLogService.logBusinessActivity({
        event: 'BRANCH_CREATED',
        action: 'CREATE',
        resourceType: 'BRANCH',
        resourceId: branch.id,
        userId: createdBy,
        username: 'system',
        tenantId,
        newValues: branchData
      });

      return branch;
    } catch (error) {
      throw new Error(`Failed to create branch: ${error.message}`);
    }
  }

  // Get all users in tenant
  static async getTenantUsers(tenantId: string): Promise<any[]> {
    try {
      const users = await prisma.user.findMany({
        where: { tenantId },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        orderBy: [
          { role: 'asc' },
          { username: 'asc' }
        ]
      });

      return users.map(user => ({
        id: user.id,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        lastLoginAt: user.lastLoginAt,
        branch: user.branch,
        createdAt: user.createdAt
      }));
    } catch (error) {
      throw new Error(`Failed to get tenant users: ${error.message}`);
    }
  }

  // Create branch admin user
  static async createBranchAdmin(
    userData: CreateBranchAdminRequest,
    createdBy: string
  ): Promise<any> {
    try {
      // Validate role
      if (userData.role !== UserRole.BRANCH_ADMIN) {
        throw new Error('Only BRANCH_ADMIN role can be created by Restaurant Admin');
      }

      // Check if username is unique
      const existingUser = await prisma.user.findUnique({
        where: { username: userData.username }
      });

      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Validate branch exists and belongs to tenant
      const branch = await prisma.branch.findUnique({
        where: { id: userData.branchId }
      });

      if (!branch || branch.tenantId !== userData.tenantId) {
        throw new Error('Invalid branch for this tenant');
      }

      // Hash password
      const passwordHash = await PasswordService.hash(userData.password);

      const user = await prisma.user.create({
        data: {
          username: userData.username,
          passwordHash,
          role: userData.role,
          tenantId: userData.tenantId,
          branchId: userData.branchId,
          mustChangePassword: true,
          isActive: true,
          passwordChangedAt: new Date(0)
        },
        include: {
          branch: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      await AuditLogService.logBusinessActivity({
        event: 'BRANCH_ADMIN_CREATED',
        action: 'CREATE',
        resourceType: 'USER',
        resourceId: user.id,
        userId: createdBy,
        username: 'system',
        tenantId: userData.tenantId,
        branchId: userData.branchId,
        newValues: {
          username: userData.username,
          role: userData.role,
          branchId: userData.branchId
        }
      });

      return user;
    } catch (error) {
      throw new Error(`Failed to create branch admin: ${error.message}`);
    }
  }

  // Get analytics across all branches
  static async getAnalytics(
    tenantId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      branchId?: string;
    } = {}
  ): Promise<any> {
    try {
      const dateFilters: any = {};
      if (filters.startDate) dateFilters.gte = new Date(filters.startDate);
      if (filters.endDate) dateFilters.lte = new Date(filters.endDate);

      const branchFilter = filters.branchId ? { branchId: filters.branchId } : {};

      const [wasteAnalytics, inventoryAnalytics, recipeAnalytics] = await Promise.all([
        this.getWasteAnalytics(tenantId, { ...branchFilter, createdAt: dateFilters }),
        this.getInventoryAnalytics(tenantId, branchFilter),
        this.getRecipeAnalytics(tenantId)
      ]);

      return {
        summary: {
          totalWasteCost: wasteAnalytics.totalCost,
          totalWasteEntries: wasteAnalytics.totalEntries,
          totalInventoryValue: inventoryAnalytics.totalValue,
          totalRecipes: recipeAnalytics.totalRecipes,
          averageRecipeCost: recipeAnalytics.averageCost
        },
        waste: wasteAnalytics,
        inventory: inventoryAnalytics,
        recipes: recipeAnalytics
      };
    } catch (error) {
      throw new Error(`Failed to get analytics: ${error.message}`);
    }
  }

  // Helper methods
  private static async calculateTotalInventoryValue(tenantId: string): Promise<number> {
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { tenantId },
      select: {
        currentStock: true,
        averageCost: true
      }
    });

    return inventoryItems.reduce((total, item) => {
      return total + (Number(item.currentStock) * Number(item.averageCost));
    }, 0);
  }

  private static async calculateTotalWaste(tenantId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const wasteEntries = await prisma.wasteEntry.findMany({
      where: {
        branch: { tenantId },
        wastedAt: { gte: thirtyDaysAgo }
      },
      select: {
        estimatedCost: true
      }
    });

    return wasteEntries.reduce((total, entry) => total + Number(entry.estimatedCost), 0);
  }

  private static async getBranchSummaries(tenantId: string): Promise<any[]> {
    const branches = await prisma.branch.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: {
            users: { where: { isActive: true } },
            inventoryItems: true,
            wasteEntries: {
              where: {
                wastedAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                }
              }
            }
          }
        }
      }
    });

    return branches.map(branch => ({
      id: branch.id,
      name: branch.name,
      slug: branch.slug,
      isActive: branch.isActive,
      metrics: {
        activeUsers: branch._count.users,
        inventoryItems: branch._count.inventoryItems,
        wasteEntriesLast30Days: branch._count.wasteEntries
      }
    }));
  }

  private static async getWasteAnalytics(tenantId: string, filters: any): Promise<any> {
    const wasteEntries = await prisma.wasteEntry.findMany({
      where: {
        branch: { tenantId },
        ...filters
      },
      select: {
        estimatedCost: true,
        wasteType: true,
        reason: true,
        wastedAt: true
      }
    });

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

    return {
      totalCost,
      totalEntries,
      averageCostPerEntry: totalEntries > 0 ? totalCost / totalEntries : 0,
      byType,
      byReason
    };
  }

  private static async getInventoryAnalytics(tenantId: string, filters: any): Promise<any> {
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        tenantId,
        ...filters
      },
      select: {
        currentStock: true,
        averageCost: true,
        minStockLevel: true,
        category: true
      }
    });

    const totalValue = inventoryItems.reduce((sum, item) => {
      return sum + (Number(item.currentStock) * Number(item.averageCost));
    }, 0);

    const lowStockItems = inventoryItems.filter(item => 
      Number(item.currentStock) <= Number(item.minStockLevel)
    ).length;

    const byCategory = inventoryItems.reduce((acc, item) => {
      const value = Number(item.currentStock) * Number(item.averageCost);
      acc[item.category] = (acc[item.category] || 0) + value;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalValue,
      totalItems: inventoryItems.length,
      lowStockItems,
      byCategory
    };
  }

  private static async getRecipeAnalytics(tenantId: string): Promise<any> {
    const recipes = await prisma.recipe.findMany({
      where: {
        tenantId,
        isActive: true
      },
      select: {
        costPerServing: true,
        category: true
      }
    });

    const totalRecipes = recipes.length;
    const totalCost = recipes.reduce((sum, recipe) => sum + (Number(recipe.costPerServing) || 0), 0);
    const averageCost = totalRecipes > 0 ? totalCost / totalRecipes : 0;

    const byCategory = recipes.reduce((acc, recipe) => {
      acc[recipe.category] = (acc[recipe.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRecipes,
      averageCost,
      byCategory
    };
  }
}