import { FastifyInstance } from 'fastify';
import { UserRole } from '@kitchzero/types';
import { PrismaClient } from '@prisma/client'; // Add this import
import { 
  authenticateToken, 
  requireRole, 
  requirePasswordChange 
} from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { RecipeService } from '../services/recipe.service';
import { z } from 'zod';

const prisma = new PrismaClient();

const recipeIngredientSchema = z.object({
  inventoryItemId: z.string(),
  quantity: z.number().min(0.001),
  unit: z.enum(['KG', 'GRAMS', 'POUNDS', 'OUNCES', 'LITERS', 'ML', 'GALLONS', 'QUARTS', 'CUPS', 'PIECES', 'BOXES', 'PACKAGES', 'DOZEN', 'PORTION', 'SERVING']),
  preparation: z.string().optional(),
  yieldPercentage: z.number().min(1).max(100).optional(),
  isOptional: z.boolean().optional(),
  substitutes: z.array(z.string()).optional()
});

const createRecipeSchema = z.object({
  name: z.string().min(1, 'Recipe name is required'),
  description: z.string().optional(),
  category: z.enum(['APPETIZER', 'MAIN_COURSE', 'DESSERT', 'BEVERAGE', 'SIDE_DISH', 'SAUCE', 'MARINADE', 'DRESSING', 'BREAD', 'SOUP', 'SALAD', 'PREPARATION', 'OTHER']),
  servingSize: z.number().min(0.01),
  servingUnit: z.string().min(1),
  yield: z.number().min(0.01),
  yieldUnit: z.string().min(1),
  prepTime: z.number().min(0).optional(),
  cookTime: z.number().min(0).optional(),
  instructions: z.string().optional(),
  notes: z.string().optional(),
  imageUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  allergens: z.array(z.string()).optional(),
  dietaryTags: z.array(z.string()).optional(),
  ingredients: z.array(recipeIngredientSchema).min(1, 'At least one ingredient is required')
});

const updateRecipeSchema = createRecipeSchema.partial().extend({
  version: z.number().optional()
});

const scaleRecipeSchema = z.object({
  targetYield: z.number().min(0.01),
  targetUnit: z.string().optional()
});

export async function recipeRoutes(fastify: FastifyInstance) {
  // Recipe creation/editing requires Restaurant Admin
  const requireRecipeManagement = [
    authenticateToken,
    requirePasswordChange,
    requireRole([UserRole.RESTAURANT_ADMIN], { requireTenant: true })
  ];

  // Recipe viewing allows both Restaurant and Branch Admins
  const requireRecipeAccess = [
    authenticateToken,
    requirePasswordChange,
    requireRole([UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_ADMIN], { 
      requireTenant: true 
    })
  ];

  // Create recipe (Restaurant Admin only)
  fastify.post('/', {
    preHandler: [
      ...requireRecipeManagement,
      validateBody(createRecipeSchema)
    ],
  }, async (request, reply) => {
    const user = request.user!;
    const recipeData = request.body as any;
    
    try {
      const recipe = await RecipeService.createRecipe(
        recipeData,
        user.id,
        user.tenantId!
      );

      return {
        success: true,
        data: recipe,
        message: 'Recipe created successfully'
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message
      });
    }
  });

  // Update recipe (Restaurant Admin only)
  fastify.put('/:recipeId', {
    preHandler: [
      ...requireRecipeManagement,
      validateBody(updateRecipeSchema)
    ],
  }, async (request, reply) => {
    const user = request.user!;
    const { recipeId } = request.params as any;
    const updateData = request.body as any;
    
    try {
      const recipe = await RecipeService.updateRecipe(
        recipeId,
        updateData,
        user.id,
        user.tenantId!
      );

      return {
        success: true,
        data: recipe,
        message: `Recipe updated to version ${recipe.version}`
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message
      });
    }
  });

  // Get recipes (Both Restaurant and Branch Admins can view)
  fastify.get('/', {
    preHandler: requireRecipeAccess,
  }, async (request, reply) => {
    const user = request.user!;
    const { category, search, allergenFree, dietaryTags } = request.query as any;
    
    try {
      const filters: any = {};
      if (category) filters.category = category;
      if (search) filters.search = search;
      if (allergenFree) {
        filters.allergenFree = Array.isArray(allergenFree) ? allergenFree : [allergenFree];
      }
      if (dietaryTags) {
        filters.dietaryTags = Array.isArray(dietaryTags) ? dietaryTags : [dietaryTags];
      }

      const recipes = await RecipeService.getRecipesForBranch(user.tenantId!, filters);

      return {
        success: true,
        data: recipes
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // Get single recipe with full details
  fastify.get('/:recipeId', {
    preHandler: requireRecipeAccess,
  }, async (request, reply) => {
    const user = request.user!;
    const { recipeId } = request.params as any;
    
    try {
      const recipe = await prisma.recipe.findFirst({
        where: {
          id: recipeId,
          tenantId: user.tenantId!,
          isActive: true
        },
        include: {
          ingredients: {
            include: {
              inventoryItem: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                  averageCost: true,
                  currentStock: true,
                  category: true
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
        }
      });

      if (!recipe) {
        return reply.status(404).send({
          success: false,
          error: 'Recipe not found'
        });
      }

      return {
        success: true,
        data: recipe
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // Scale recipe
  fastify.post('/:recipeId/scale', {
    preHandler: [
      ...requireRecipeAccess,
      validateBody(scaleRecipeSchema)
    ],
  }, async (request, reply) => {
    const { recipeId } = request.params as any;
    const { targetYield, targetUnit } = request.body as any;
    
    try {
      const scaledRecipe = await RecipeService.scaleRecipe(
        recipeId,
        targetYield,
        targetUnit
      );

      return {
        success: true,
        data: scaledRecipe
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message
      });
    }
  });

  // Get recipe profitability analysis (Restaurant Admin only)
  fastify.get('/analytics/profitability', {
    preHandler: requireRecipeManagement,
  }, async (request, reply) => {
    const user = request.user!;
    
    try {
      const profitability = await RecipeService.getRecipeProfitability(user.tenantId!);

      return {
        success: true,
        data: profitability
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // Recalculate recipe costs (Restaurant Admin only)
  fastify.post('/:recipeId/recalculate-cost', {
    preHandler: requireRecipeManagement,
  }, async (request, reply) => {
    const { recipeId } = request.params as any;
    
    try {
      const costPerServing = await RecipeService.calculateRecipeCost(recipeId);

      return {
        success: true,
        data: {
          recipeId,
          costPerServing
        },
        message: 'Recipe cost recalculated successfully'
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