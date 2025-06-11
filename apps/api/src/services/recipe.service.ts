// apps/api/src/services/recipe.service.ts
import { PrismaClient, Recipe, RecipeCategory, Unit } from '@prisma/client';
import { AuditLogService } from './audit-log.service';

const prisma = new PrismaClient();

export interface CreateRecipeRequest {
  name: string;
  description?: string;
  category: RecipeCategory;
  servingSize: number;
  servingUnit: string;
  yield: number;
  yieldUnit: string;
  prepTime?: number;
  cookTime?: number;
  instructions?: string;
  notes?: string;
  imageUrl?: string;
  videoUrl?: string;
  allergens?: string[];
  dietaryTags?: string[];
  ingredients: RecipeIngredientRequest[];
}

export interface RecipeIngredientRequest {
  inventoryItemId: string;
  quantity: number;
  unit: Unit;
  preparation?: string;
  yieldPercentage?: number;
  isOptional?: boolean;
  substitutes?: string[];
}

export interface UpdateRecipeRequest extends Partial<CreateRecipeRequest> {
  version?: number;
}

export class RecipeService {
  // Create new recipe (Restaurant Admin only)
  static async createRecipe(
    data: CreateRecipeRequest,
    userId: string,
    tenantId: string
  ): Promise<Recipe> {
    try {
      return await prisma.$transaction(async (tx) => {
        // Create the recipe
        const recipe = await tx.recipe.create({
          data: {
            name: data.name,
            description: data.description,
            category: data.category,
            servingSize: data.servingSize,
            servingUnit: data.servingUnit,
            yield: data.yield,
            yieldUnit: data.yieldUnit,
            prepTime: data.prepTime,
            cookTime: data.cookTime,
            instructions: data.instructions,
            notes: data.notes,
            imageUrl: data.imageUrl,
            videoUrl: data.videoUrl,
            allergens: data.allergens || [],
            dietaryTags: data.dietaryTags || [],
            tenantId,
            createdBy: userId
          }
        });

        // Add ingredients
        for (const ingredient of data.ingredients) {
          await tx.recipeIngredient.create({
            data: {
              recipeId: recipe.id,
              inventoryItemId: ingredient.inventoryItemId,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              preparation: ingredient.preparation,
              yieldPercentage: ingredient.yieldPercentage || 100,
              isOptional: ingredient.isOptional || false,
              substitutes: ingredient.substitutes || []
            }
          });
        }

        // Calculate and update recipe cost
        await this.calculateRecipeCost(recipe.id, tx);

        await AuditLogService.logBusinessActivity({
          event: 'RECIPE_CREATED',
          action: 'CREATE',
          resourceType: 'RECIPE',
          resourceId: recipe.id,
          userId,
          username: 'system',
          tenantId,
          newValues: data
        });

        return recipe;
      });
    } catch (error) {
      throw new Error(`Failed to create recipe: ${error.message}`);
    }
  }

  // Update recipe (Restaurant Admin only, creates new version)
  static async updateRecipe(
    recipeId: string,
    data: UpdateRecipeRequest,
    userId: string,
    tenantId: string
  ): Promise<Recipe> {
    try {
      return await prisma.$transaction(async (tx) => {
        const existingRecipe = await tx.recipe.findUnique({
          where: { id: recipeId },
          include: { ingredients: true }
        });

        if (!existingRecipe) {
          throw new Error('Recipe not found');
        }

        // Archive the current version
        await tx.recipe.update({
          where: { id: recipeId },
          data: { isActive: false }
        });

        // Create new version
        const newRecipe = await tx.recipe.create({
          data: {
            name: data.name || existingRecipe.name,
            description: data.description || existingRecipe.description,
            category: data.category || existingRecipe.category,
            servingSize: data.servingSize || existingRecipe.servingSize,
            servingUnit: data.servingUnit || existingRecipe.servingUnit,
            yield: data.yield || existingRecipe.yield,
            yieldUnit: data.yieldUnit || existingRecipe.yieldUnit,
            prepTime: data.prepTime || existingRecipe.prepTime,
            cookTime: data.cookTime || existingRecipe.cookTime,
            instructions: data.instructions || existingRecipe.instructions,
            notes: data.notes || existingRecipe.notes,
            imageUrl: data.imageUrl || existingRecipe.imageUrl,
            videoUrl: data.videoUrl || existingRecipe.videoUrl,
            allergens: data.allergens || existingRecipe.allergens,
            dietaryTags: data.dietaryTags || existingRecipe.dietaryTags,
            version: existingRecipe.version + 1,
            tenantId,
            createdBy: userId
          }
        });

        // Add ingredients (updated or existing)
        const ingredients = data.ingredients || existingRecipe.ingredients.map(ing => ({
          inventoryItemId: ing.inventoryItemId,
          quantity: Number(ing.quantity),
          unit: ing.unit,
          preparation: ing.preparation,
          yieldPercentage: Number(ing.yieldPercentage),
          isOptional: ing.isOptional,
          substitutes: ing.substitutes
        }));

        for (const ingredient of ingredients) {
          await tx.recipeIngredient.create({
            data: {
              recipeId: newRecipe.id,
              inventoryItemId: ingredient.inventoryItemId,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              preparation: ingredient.preparation,
              yieldPercentage: ingredient.yieldPercentage || 100,
              isOptional: ingredient.isOptional || false,
              substitutes: ingredient.substitutes || []
            }
          });
        }

        await this.calculateRecipeCost(newRecipe.id, tx);

        await AuditLogService.logBusinessActivity({
          event: 'RECIPE_UPDATED',
          action: 'UPDATE',
          resourceType: 'RECIPE',
          resourceId: newRecipe.id,
          userId,
          username: 'system',
          tenantId,
          oldValues: { version: existingRecipe.version },
          newValues: { ...data, version: newRecipe.version }
        });

        return newRecipe;
      });
    } catch (error) {
      throw new Error(`Failed to update recipe: ${error.message}`);
    }
  }

  // Calculate recipe cost based on current ingredient prices
  static async calculateRecipeCost(recipeId: string, tx?: any): Promise<number> {
    const client = tx || prisma;
    
    try {
      const recipe = await client.recipe.findUnique({
        where: { id: recipeId },
        include: {
          ingredients: {
            include: {
              inventoryItem: true
            }
          }
        }
      });

      if (!recipe) {
        throw new Error('Recipe not found');
      }

      let totalCost = 0;
      
      for (const ingredient of recipe.ingredients) {
        const adjustedQuantity = Number(ingredient.quantity) * (Number(ingredient.yieldPercentage) / 100);
        const ingredientCost = adjustedQuantity * Number(ingredient.inventoryItem.averageCost);
        totalCost += ingredientCost;

        // Update ingredient cost tracking
        await client.recipeIngredient.update({
          where: { id: ingredient.id },
          data: { costPer: Number(ingredient.inventoryItem.averageCost) }
        });
      }

      const costPerServing = totalCost / Number(recipe.yield);

      // Update recipe with calculated cost
      await client.recipe.update({
        where: { id: recipeId },
        data: { costPerServing }
      });

      return costPerServing;
    } catch (error) {
      throw new Error(`Failed to calculate recipe cost: ${error.message}`);
    }
  }

  // Get recipes for branch viewing (Branch Admins can see all tenant recipes)
  static async getRecipesForBranch(tenantId: string, filters?: {
    category?: RecipeCategory;
    search?: string;
    allergenFree?: string[];
    dietaryTags?: string[];
  }): Promise<any[]> {
    try {
      const where: any = { 
        tenantId,
        isActive: true
      };

      if (filters?.category) {
        where.category = filters.category;
      }

      if (filters?.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      if (filters?.allergenFree?.length) {
        where.allergens = {
          notHasAny: filters.allergenFree
        };
      }

      if (filters?.dietaryTags?.length) {
        where.dietaryTags = {
          hasAny: filters.dietaryTags
        };
      }

      const recipes = await prisma.recipe.findMany({
        where,
        include: {
          ingredients: {
            include: {
              inventoryItem: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                  averageCost: true,
                  currentStock: true
                }
              }
            }
          },
          creator: {
            select: {
              id: true,
              username: true
            }
          }
        },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' }
        ]
        });

     return recipes.map(recipe => ({
       ...recipe,
       canPrepare: this.checkIfCanPrepare(recipe),
       missingIngredients: this.getMissingIngredients(recipe),
       totalCost: Number(recipe.costPerServing) * Number(recipe.yield),
       profitMargin: this.calculateProfitMargin(recipe),
       nutritionalInfo: {
         calories: recipe.calories,
         protein: recipe.protein,
         carbs: recipe.carbs,
         fat: recipe.fat
       }
     }));
   } catch (error) {
     throw new Error(`Failed to get recipes for branch: ${error.message}`);
   }
 }

 // Scale recipe for different yields
 static async scaleRecipe(
   recipeId: string,
   targetYield: number,
   targetUnit?: string
 ): Promise<any> {
   try {
     const recipe = await prisma.recipe.findUnique({
       where: { id: recipeId },
       include: {
         ingredients: {
           include: {
             inventoryItem: true
           }
         }
       }
     });

     if (!recipe) {
       throw new Error('Recipe not found');
     }

     const scalingFactor = targetYield / Number(recipe.yield);

     const scaledIngredients = recipe.ingredients.map(ingredient => ({
       ...ingredient,
       scaledQuantity: Number(ingredient.quantity) * scalingFactor,
       scaledCost: Number(ingredient.quantity) * scalingFactor * Number(ingredient.inventoryItem.averageCost)
     }));

     return {
       ...recipe,
       originalYield: recipe.yield,
       targetYield,
       scalingFactor,
       scaledIngredients,
       scaledCostPerServing: Number(recipe.costPerServing) * scalingFactor,
       scaledTotalCost: Number(recipe.costPerServing) * targetYield
     };
   } catch (error) {
     throw new Error(`Failed to scale recipe: ${error.message}`);
   }
 }

 // Get recipe profitability analysis
 static async getRecipeProfitability(tenantId: string): Promise<any[]> {
   try {
     const recipes = await prisma.recipe.findMany({
       where: { tenantId, isActive: true },
       include: {
         ingredients: {
           include: {
             inventoryItem: true
           }
         }
       }
     });

     return recipes.map(recipe => ({
       id: recipe.id,
       name: recipe.name,
       category: recipe.category,
       costPerServing: Number(recipe.costPerServing),
       // These would come from POS integration or manual entry
       averageSellingPrice: this.getAverageSellingPrice(recipe.id),
       profitMargin: this.calculateProfitMargin(recipe),
       popularityScore: this.getPopularityScore(recipe.id),
       recommendation: this.getRecipeRecommendation(recipe)
     })).sort((a, b) => b.profitMargin - a.profitMargin);
   } catch (error) {
     throw new Error(`Failed to get recipe profitability: ${error.message}`);
   }
 }

 // Check recipe availability based on current inventory
 private static checkIfCanPrepare(recipe: any): boolean {
   return recipe.ingredients.every((ingredient: any) => {
     const requiredQuantity = Number(ingredient.quantity) * (Number(ingredient.yieldPercentage) / 100);
     return Number(ingredient.inventoryItem.currentStock) >= requiredQuantity;
   });
 }

 // Get missing ingredients for recipe
 private static getMissingIngredients(recipe: any): any[] {
   return recipe.ingredients.filter((ingredient: any) => {
     const requiredQuantity = Number(ingredient.quantity) * (Number(ingredient.yieldPercentage) / 100);
     return Number(ingredient.inventoryItem.currentStock) < requiredQuantity;
   }).map((ingredient: any) => ({
     name: ingredient.inventoryItem.name,
     required: Number(ingredient.quantity),
     available: Number(ingredient.inventoryItem.currentStock),
     shortage: Number(ingredient.quantity) - Number(ingredient.inventoryItem.currentStock)
   }));
 }

 // Calculate profit margin (placeholder - would integrate with POS data)
 private static calculateProfitMargin(recipe: any): number {
   const costPerServing = Number(recipe.costPerServing) || 0;
   const sellingPrice = this.getAverageSellingPrice(recipe.id);
   
   if (sellingPrice <= 0) return 0;
   return ((sellingPrice - costPerServing) / sellingPrice) * 100;
 }

 // Get average selling price (placeholder - would integrate with POS)
 private static getAverageSellingPrice(recipeId: string): number {
   // This would integrate with POS system or menu pricing data
   // For now, return a placeholder based on cost plus typical markup
   return 0; // Placeholder
 }

 // Get popularity score (placeholder - would integrate with sales data)
 private static getPopularityScore(recipeId: string): number {
   // This would analyze sales frequency, customer ratings, etc.
   return 0; // Placeholder
 }

 // Get recipe recommendation based on profitability and popularity
 private static getRecipeRecommendation(recipe: any): string {
   const profitMargin = this.calculateProfitMargin(recipe);
   const popularity = this.getPopularityScore(recipe.id);

   if (profitMargin > 70 && popularity > 80) return 'STAR'; // High profit, high popularity
   if (profitMargin > 70 && popularity < 50) return 'PUZZLE'; // High profit, low popularity
   if (profitMargin < 30 && popularity > 80) return 'PLOW_HORSE'; // Low profit, high popularity
   if (profitMargin < 30 && popularity < 50) return 'DOG'; // Low profit, low popularity
   return 'POTENTIAL'; // Everything else
 }
}