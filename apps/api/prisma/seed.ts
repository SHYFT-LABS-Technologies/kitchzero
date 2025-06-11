// apps/api/prisma/seed.ts (Updated with comprehensive data)
import { PrismaClient, UserRole, InventoryCategory, Unit, RecipeCategory, WasteType, WasteReason } from '@prisma/client';
import { PasswordService } from '../src/services/password.service';
import { AuditLogService } from '../src/services/audit-log.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🧨 Clearing existing data...');
  
  // Clear in correct order due to foreign key constraints
  await prisma.wasteEntry.deleteMany({});
  await prisma.inventoryAdjustment.deleteMany({});
  await prisma.recipeIngredient.deleteMany({});
  await prisma.recipe.deleteMany({});
  await prisma.inventoryBatch.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.approvalRequest.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.branch.deleteMany({});
  await prisma.tenant.deleteMany({});
  await prisma.passwordPolicy.deleteMany({});

  console.log('🌱 Seeding fresh data...');

  // Create KitchZero admin user
  const adminPassword = await PasswordService.hash('Admin123!SecureKZ');

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash: adminPassword,
      role: UserRole.KITCHZERO_ADMIN,
      mustChangePassword: false,
      isActive: true,
      passwordChangedAt: new Date()
    }
  });

  console.log('✅ Created admin user:', admin.username);

  // Create tenant and branches
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Demo Restaurant Group',
      slug: 'demo-restaurant-group',
      isActive: true
    }
  });

  const mainBranch = await prisma.branch.create({
    data: {
      name: 'Main Branch',
      slug: 'main-branch',
      tenantId: tenant.id,
      isActive: true
    }
  });

  const downtownBranch = await prisma.branch.create({
    data: {
      name: 'Downtown Branch',
      slug: 'downtown-branch',
      tenantId: tenant.id,
      isActive: true
    }
  });

  console.log('✅ Created branches:', mainBranch.name, downtownBranch.name);

  // Create suppliers
  const supplier1 = await prisma.supplier.create({
    data: {
      name: 'Fresh Foods Distributor',
      contactName: 'John Smith',
      email: 'john@freshfoods.com',
      phone: '+1-555-0123',
      address: '123 Market Street, City, State 12345',
      rating: 4.5,
      onTimeDelivery: 95.0,
      qualityScore: 92.0,
      tenantId: tenant.id
    }
  });

  const supplier2 = await prisma.supplier.create({
    data: {
      name: 'Premium Meat Co.',
      contactName: 'Sarah Johnson',
      email: 'sarah@premiummeat.com',
      phone: '+1-555-0456',
      address: '456 Industrial Ave, City, State 12345',
      rating: 4.8,
      onTimeDelivery: 98.0,
      qualityScore: 95.0,
      tenantId: tenant.id
    }
  });

  // Restaurant Admin
  const restaurantAdminPassword = await PasswordService.hash('RestAdmin123!');
  const restaurantAdmin = await prisma.user.create({
    data: {
      username: 'restaurant_admin',
      passwordHash: restaurantAdminPassword,
      role: UserRole.RESTAURANT_ADMIN,
      tenantId: tenant.id,
      mustChangePassword: true,
      isActive: true,
      passwordChangedAt: new Date(0)
    }
  });

  // Branch Admins
  const mainBranchPassword = await PasswordService.hash('MainBranch123!');
  const mainBranchAdmin = await prisma.user.create({
    data: {
      username: 'main_branch_admin',
      passwordHash: mainBranchPassword,
      role: UserRole.BRANCH_ADMIN,
      tenantId: tenant.id,
     branchId: mainBranch.id,
     mustChangePassword: true,
     isActive: true,
     passwordChangedAt: new Date(0)
   }
 });

 const downtownBranchPassword = await PasswordService.hash('Downtown123!');
 const downtownBranchAdmin = await prisma.user.create({
   data: {
     username: 'downtown_branch_admin',
     passwordHash: downtownBranchPassword,
     role: UserRole.BRANCH_ADMIN,
     tenantId: tenant.id,
     branchId: downtownBranch.id,
     mustChangePassword: true,
     isActive: true,
     passwordChangedAt: new Date(0)
   }
 });

 // Create password policy
 await prisma.passwordPolicy.create({
   data: {
     tenantId: tenant.id,
     minLength: 12,
     maxLength: 128,
     requireLowercase: true,
     requireUppercase: true,
     requireNumbers: true,
     requireSpecialChars: true,
     preventCommonWords: true,
     preventPersonalInfo: true,
     historyCount: 5,
     maxFailedAttempts: 5,
     lockoutDurationMinutes: 15
   }
 });

 console.log('✅ Created users and policies');

 // Create inventory items
 const inventoryItems = [
   {
     name: 'Tomatoes',
     description: 'Fresh Roma tomatoes',
     category: InventoryCategory.RAW_INGREDIENTS,
     unit: Unit.KG,
     minStockLevel: 20,
     maxStockLevel: 100,
     isPerishable: true,
     defaultShelfLife: 7,
     supplierId: supplier1.id
   },
   {
     name: 'Chicken Breast',
     description: 'Boneless chicken breast',
     category: InventoryCategory.RAW_INGREDIENTS,
     unit: Unit.KG,
     minStockLevel: 15,
     maxStockLevel: 50,
     isPerishable: true,
     defaultShelfLife: 3,
     supplierId: supplier2.id
   },
   {
     name: 'Flour',
     description: 'All-purpose flour',
     category: InventoryCategory.RAW_INGREDIENTS,
     unit: Unit.KG,
     minStockLevel: 10,
     maxStockLevel: 50,
     isPerishable: false,
     defaultShelfLife: 365,
     supplierId: supplier1.id
   },
   {
     name: 'Olive Oil',
     description: 'Extra virgin olive oil',
     category: InventoryCategory.RAW_INGREDIENTS,
     unit: Unit.LITERS,
     minStockLevel: 5,
     maxStockLevel: 20,
     isPerishable: false,
     defaultShelfLife: 730,
     supplierId: supplier1.id
   },
   {
     name: 'Mozzarella Cheese',
     description: 'Fresh mozzarella cheese',
     category: InventoryCategory.RAW_INGREDIENTS,
     unit: Unit.KG,
     minStockLevel: 8,
     maxStockLevel: 25,
     isPerishable: true,
     defaultShelfLife: 14,
     supplierId: supplier1.id
   },
   {
     name: 'Basil',
     description: 'Fresh basil leaves',
     category: InventoryCategory.RAW_INGREDIENTS,
     unit: Unit.GRAMS,
     minStockLevel: 200,
     maxStockLevel: 1000,
     isPerishable: true,
     defaultShelfLife: 5,
     supplierId: supplier1.id
   },
   {
     name: 'Salt',
     description: 'Sea salt',
     category: InventoryCategory.RAW_INGREDIENTS,
     unit: Unit.KG,
     minStockLevel: 2,
     maxStockLevel: 10,
     isPerishable: false,
     supplierId: supplier1.id
   },
   {
     name: 'Black Pepper',
     description: 'Ground black pepper',
     category: InventoryCategory.RAW_INGREDIENTS,
     unit: Unit.GRAMS,
     minStockLevel: 500,
     maxStockLevel: 2000,
     isPerishable: false,
     defaultShelfLife: 1095,
     supplierId: supplier1.id
   }
 ];

 const createdInventoryItems = [];
 for (const item of inventoryItems) {
   const inventoryItem = await prisma.inventoryItem.create({
     data: {
       ...item,
       currentStock: 0,
       averageCost: 0,
       lastCost: 0,
       tenantId: tenant.id,
       branchId: mainBranch.id,
       createdBy: restaurantAdmin.id
     }
   });
   createdInventoryItems.push(inventoryItem);
 }

 console.log('✅ Created inventory items');

 // Add inventory batches with FIFO data
 const batchData = [
   { itemIndex: 0, quantity: 50, unitCost: 3.50, daysToExpiry: 7 },   // Tomatoes
   { itemIndex: 1, quantity: 30, unitCost: 8.75, daysToExpiry: 3 },   // Chicken
   { itemIndex: 2, quantity: 25, unitCost: 1.20, daysToExpiry: 365 }, // Flour
   { itemIndex: 3, quantity: 10, unitCost: 12.50, daysToExpiry: 730 }, // Olive Oil
   { itemIndex: 4, quantity: 15, unitCost: 6.80, daysToExpiry: 14 },  // Mozzarella
   { itemIndex: 5, quantity: 500, unitCost: 0.02, daysToExpiry: 5 },  // Basil (in grams)
   { itemIndex: 6, quantity: 5, unitCost: 2.00, daysToExpiry: null }, // Salt
   { itemIndex: 7, quantity: 1000, unitCost: 0.015, daysToExpiry: 1095 } // Pepper (in grams)
 ];

 for (const batch of batchData) {
   const item = createdInventoryItems[batch.itemIndex];
   const expiryDate = batch.daysToExpiry ? 
     new Date(Date.now() + batch.daysToExpiry * 24 * 60 * 60 * 1000) : null;

   await prisma.inventoryBatch.create({
     data: {
       inventoryItemId: item.id,
       batchNumber: `BATCH-${Date.now()}-${batch.itemIndex}`,
       quantity: batch.quantity,
       remainingQuantity: batch.quantity,
       unitCost: batch.unitCost,
       totalCost: batch.quantity * batch.unitCost,
       expiryDate,
       qualityGrade: 'A'
     }
   });

   // Update inventory item stock and cost
   await prisma.inventoryItem.update({
     where: { id: item.id },
     data: {
       currentStock: batch.quantity,
       averageCost: batch.unitCost,
       lastCost: batch.unitCost
     }
   });
 }

 console.log('✅ Created inventory batches with FIFO data');

 // Create recipes
 const margheritaPizza = await prisma.recipe.create({
   data: {
     name: 'Margherita Pizza',
     description: 'Classic Italian pizza with tomatoes, mozzarella, and basil',
     category: RecipeCategory.MAIN_COURSE,
     servingSize: 1,
     servingUnit: 'pizza',
     yield: 4,
     yieldUnit: 'slices',
     prepTime: 20,
     cookTime: 15,
     instructions: `1. Prepare pizza dough with flour, water, salt, and yeast
2. Roll out dough to desired thickness
3. Spread tomato sauce evenly
4. Add mozzarella cheese
5. Bake at 450°F for 12-15 minutes
6. Garnish with fresh basil leaves
7. Slice and serve hot`,
     notes: 'Best served immediately while cheese is still melted',
     allergens: ['GLUTEN', 'DAIRY'],
     dietaryTags: ['VEGETARIAN'],
     tenantId: tenant.id,
     createdBy: restaurantAdmin.id
   }
 });

 // Add recipe ingredients
 const recipeIngredients = [
   { recipeId: margheritaPizza.id, inventoryItemId: createdInventoryItems[2].id, quantity: 0.3, unit: Unit.KG }, // Flour
   { recipeId: margheritaPizza.id, inventoryItemId: createdInventoryItems[0].id, quantity: 0.2, unit: Unit.KG }, // Tomatoes
   { recipeId: margheritaPizza.id, inventoryItemId: createdInventoryItems[4].id, quantity: 0.15, unit: Unit.KG }, // Mozzarella
   { recipeId: margheritaPizza.id, inventoryItemId: createdInventoryItems[5].id, quantity: 10, unit: Unit.GRAMS }, // Basil
   { recipeId: margheritaPizza.id, inventoryItemId: createdInventoryItems[3].id, quantity: 0.02, unit: Unit.LITERS }, // Olive Oil
   { recipeId: margheritaPizza.id, inventoryItemId: createdInventoryItems[6].id, quantity: 0.005, unit: Unit.KG }, // Salt
   { recipeId: margheritaPizza.id, inventoryItemId: createdInventoryItems[7].id, quantity: 2, unit: Unit.GRAMS } // Pepper
 ];

 for (const ingredient of recipeIngredients) {
   await prisma.recipeIngredient.create({
     data: {
       ...ingredient,
       yieldPercentage: 95 // 5% waste during preparation
     }
   });
 }

 // Grilled Chicken recipe
 const grilledChicken = await prisma.recipe.create({
   data: {
     name: 'Grilled Chicken Breast',
     description: 'Herb-seasoned grilled chicken breast',
     category: RecipeCategory.MAIN_COURSE,
     servingSize: 1,
     servingUnit: 'portion',
     yield: 1,
     yieldUnit: 'portion',
     prepTime: 10,
     cookTime: 25,
     instructions: `1. Season chicken breast with salt, pepper, and herbs
2. Let marinate for 30 minutes
3. Preheat grill to medium-high heat
4. Grill for 12-15 minutes per side
5. Check internal temperature reaches 165°F
6. Let rest for 5 minutes before serving`,
     allergens: [],
     dietaryTags: ['GLUTEN_FREE', 'HIGH_PROTEIN'],
     tenantId: tenant.id,
     createdBy: restaurantAdmin.id
   }
 });

 await prisma.recipeIngredient.create({
   data: {
     recipeId: grilledChicken.id,
     inventoryItemId: createdInventoryItems[1].id, // Chicken
     quantity: 0.25,
     unit: Unit.KG,
     yieldPercentage: 90 // 10% trimming waste
   }
 });

 await prisma.recipeIngredient.create({
   data: {
     recipeId: grilledChicken.id,
     inventoryItemId: createdInventoryItems[6].id, // Salt
     quantity: 0.002,
     unit: Unit.KG,
     yieldPercentage: 100
   }
 });

 await prisma.recipeIngredient.create({
   data: {
     recipeId: grilledChicken.id,
     inventoryItemId: createdInventoryItems[7].id, // Pepper
     quantity: 1,
     unit: Unit.GRAMS,
     yieldPercentage: 100
   }
 });

 console.log('✅ Created recipes with ingredients');

 // Create sample waste entries
 const wasteEntries = [
   {
     wasteType: WasteType.RAW,
     inventoryItemId: createdInventoryItems[0].id, // Tomatoes
     quantity: 2,
     unit: Unit.KG,
     reason: WasteReason.SPOILED,
     reasonDetail: 'Found moldy tomatoes during prep',
     location: 'Kitchen prep area',
     estimatedCost: 7.00,
     branchId: mainBranch.id,
     createdBy: mainBranchAdmin.id
   },
   {
     wasteType: WasteType.PRODUCT,
     recipeId: margheritaPizza.id,
     quantity: 1,
     unit: Unit.PORTION,
     reason: WasteReason.WRONG_ORDER,
     reasonDetail: 'Customer ordered wrong size',
     location: 'Kitchen',
     estimatedCost: 8.50,
     branchId: mainBranch.id,
     createdBy: mainBranchAdmin.id
   },
   {
     wasteType: WasteType.RAW,
     inventoryItemId: createdInventoryItems[1].id, // Chicken
     quantity: 0.5,
     unit: Unit.KG,
     reason: WasteReason.EXPIRED,
     reasonDetail: 'Past expiry date',
     location: 'Cold storage',
     estimatedCost: 4.38,
     branchId: mainBranch.id,
     createdBy: mainBranchAdmin.id
   }
 ];

 for (const waste of wasteEntries) {
   await prisma.wasteEntry.create({
     data: {
       ...waste,
       status: 'APPROVED', // Auto-approve sample data
       tags: ['sample_data']
     }
   });
 }

 console.log('✅ Created sample waste entries');

 // Log comprehensive audit trail
 await AuditLogService.logBusinessActivity({
   event: 'INITIAL_SYSTEM_SETUP',
   action: 'CREATE',
   resourceType: 'SYSTEM',
   resourceId: tenant.id,
   userId: 'SYSTEM',
   username: 'SYSTEM',
   tenantId: tenant.id,
   details: {
     tenantsCreated: 1,
     branchesCreated: 2,
     usersCreated: 4,
     suppliersCreated: 2,
     inventoryItemsCreated: inventoryItems.length,
     recipesCreated: 2,
     wasteEntriesCreated: wasteEntries.length,
     systemVersion: '1.0.0',
     features: [
       'FIFO_INVENTORY_MANAGEMENT',
       'RAW_PRODUCT_WASTE_TRACKING',
       'RECIPE_COST_CALCULATION',
       'APPROVAL_WORKFLOW',
       'COMPREHENSIVE_AUDIT_LOGGING'
     ]
   }
 });

 console.log('\n🎉 Database seeding completed successfully!');
 console.log('\n📋 LOGIN CREDENTIALS:');
 console.log('================================');
 console.log('1. System Admin:');
 console.log('   Username: admin');
 console.log('   Password: Admin123!SecureKZ');
 console.log('   Features: Full system access\n');
 
 console.log('2. Restaurant Admin:');
 console.log('   Username: restaurant_admin');
 console.log('   Password: RestAdmin123!');
 console.log('   Features: Recipe management, approval workflow, analytics\n');
 
 console.log('3. Main Branch Admin:');
 console.log('   Username: main_branch_admin');
 console.log('   Password: MainBranch123!');
 console.log('   Features: Inventory management, waste logging (requires approval)\n');
 
 console.log('4. Downtown Branch Admin:');
 console.log('   Username: downtown_branch_admin');
 console.log('   Password: Downtown123!\n');

 console.log('🏪 SAMPLE DATA CREATED:');
 console.log('================================');
 console.log(`📦 Inventory Items: ${inventoryItems.length} items with FIFO batches`);
 console.log(`👥 Suppliers: 2 suppliers with performance metrics`);
 console.log(`📋 Recipes: 2 recipes with ingredient mapping`);
 console.log(`🗑️  Waste Entries: ${wasteEntries.length} sample waste logs`);
 console.log(`⚡ Features: FIFO inventory, recipe costing, approval workflow`);

 console.log('\n🔗 API ENDPOINTS:');
 console.log('================================');
 console.log('Auth: http://localhost:3001/auth/*');
 console.log('Inventory: http://localhost:3001/inventory/*');
 console.log('Waste: http://localhost:3001/waste/*');
 console.log('Recipes: http://localhost:3001/recipes/*');
 console.log('Approvals: http://localhost:3001/approvals/*');
 console.log('Health Check: http://localhost:3001/health');
}

main()
 .catch((e) => {
   console.error('❌ Seeding failed:', e);
   process.exit(1);
 })
 .finally(async () => {
   await prisma.$disconnect();
 });