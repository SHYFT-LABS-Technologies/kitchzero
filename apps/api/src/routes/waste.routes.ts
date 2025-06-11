import { FastifyInstance } from 'fastify';
import { UserRole } from '@kitchzero/types';
import { PrismaClient } from '@prisma/client'; // Add this import
import { 
  authenticateToken, 
  requireRole, 
  requirePasswordChange 
} from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { WasteService } from '../services/waste.service';
import { z } from 'zod';

const prisma = new PrismaClient();

const wasteEntrySchema = z.object({
  wasteType: z.enum(['RAW', 'PRODUCT']),
  inventoryItemId: z.string().optional(),
  recipeId: z.string().optional(),
  batchId: z.string().optional(),
  quantity: z.number().min(0.01),
  unit: z.enum(['KG', 'GRAMS', 'POUNDS', 'OUNCES', 'LITERS', 'ML', 'GALLONS', 'QUARTS', 'CUPS', 'PIECES', 'BOXES', 'PACKAGES', 'DOZEN', 'PORTION', 'SERVING']),
  reason: z.enum(['EXPIRED', 'SPOILED', 'OVERCOOKED', 'DROPPED', 'CONTAMINATED', 'WRONG_ORDER', 'EXCESS_PREP', 'CUSTOMER_RETURN', 'QUALITY_ISSUE', 'EQUIPMENT_FAILURE', 'OTHER']),
  reasonDetail: z.string().optional(),
  location: z.string().optional(),
  tags: z.array(z.string()).optional()
}).refine((data) => {
  if (data.wasteType === 'RAW' && !data.inventoryItemId) {
    return false;
  }
  if (data.wasteType === 'PRODUCT' && !data.recipeId) {
    return false;
  }
  return true;
}, {
  message: "RAW waste requires inventoryItemId, PRODUCT waste requires recipeId"
});

export async function wasteRoutes(fastify: FastifyInstance) {
  const requireWasteAccess = [
    authenticateToken,
    requirePasswordChange,
    requireRole([UserRole.RESTAURANT_ADMIN, UserRole.BRANCH_ADMIN], { 
      requireTenant: true 
    })
  ];

  // Log waste entry
  fastify.post('/entries', {
    preHandler: [
      ...requireWasteAccess,
      validateBody(wasteEntrySchema)
    ],
  }, async (request, reply) => {
    const user = request.user!;
    const wasteData = request.body as any;
    
    try {
      const wasteEntry = await WasteService.logWasteEntry(
        wasteData,
        user.id,
        user.role,
        user.branchId!,
        user.tenantId!
      );

      const statusCode = wasteEntry.status === 'PENDING' ? 202 : 200;

      return reply.status(statusCode).send({
        success: true,
        data: wasteEntry,
        message: wasteEntry.status === 'PENDING' ? 
          'Waste entry submitted for approval' : 
          'Waste logged successfully'
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message
      });
    }
  });

  // Get waste analytics
  fastify.get('/analytics', { preHandler: requireWasteAccess,
 }, async (request, reply) => {
   const user = request.user!;
   const { startDate, endDate, wasteType, category } = request.query as any;
   
   try {
     const filters: any = {};
     if (startDate) filters.startDate = new Date(startDate);
     if (endDate) filters.endDate = new Date(endDate);
     if (wasteType) filters.wasteType = wasteType;
     if (category) filters.category = category;

     const analytics = await WasteService.getWasteAnalytics(
       user.branchId!,
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

 // Get waste reduction suggestions
 fastify.get('/suggestions', {
   preHandler: requireWasteAccess,
 }, async (request, reply) => {
   const user = request.user!;
   
   try {
     const suggestions = await WasteService.getWasteReductionSuggestions(user.branchId!);

     return {
       success: true,
       data: suggestions
     };
   } catch (error) {
     fastify.log.error(error);
     return reply.status(500).send({
       success: false,
       error: error.message
     });
   }
 });

 // Get waste entries (with pagination)
 fastify.get('/entries', {
   preHandler: requireWasteAccess,
 }, async (request, reply) => {
   const user = request.user!;
   const { page = 1, limit = 20, wasteType, reason, startDate, endDate } = request.query as any;
   
   try {
     const where: any = { branchId: user.branchId! };
     
     if (wasteType) where.wasteType = wasteType;
     if (reason) where.reason = reason;
     if (startDate || endDate) {
       where.wastedAt = {};
       if (startDate) where.wastedAt.gte = new Date(startDate);
       if (endDate) where.wastedAt.lte = new Date(endDate);
     }

     const [entries, total] = await Promise.all([
       prisma.wasteEntry.findMany({
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
         orderBy: { wastedAt: 'desc' },
         take: parseInt(limit),
         skip: (parseInt(page) - 1) * parseInt(limit)
       }),
       prisma.wasteEntry.count({ where })
     ]);

     return {
       success: true,
       data: {
         entries,
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