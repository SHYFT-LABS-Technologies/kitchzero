// apps/api/test-setup.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected successfully. Found ${userCount} users.`);
    
    const inventoryCount = await prisma.inventoryItem.count();
    console.log(`📦 Inventory items: ${inventoryCount}`);
    
    const recipeCount = await prisma.recipe.count();
    console.log(`📋 Recipes: ${recipeCount}`);
    
    const wasteCount = await prisma.wasteEntry.count();
    console.log(`🗑️ Waste entries: ${wasteCount}`);
    
    const supplierCount = await prisma.supplier.count();
    console.log(`🏪 Suppliers: ${supplierCount}`);
    
    console.log('\n🎉 All systems operational!');
    
    // Test some relationships
    const inventoryWithBatches = await prisma.inventoryItem.findFirst({
      include: {
        batches: true,
        supplier: true
      }
    });
    
    if (inventoryWithBatches) {
      console.log(`\n📊 Sample inventory item: ${inventoryWithBatches.name}`);
      console.log(`   Current stock: ${inventoryWithBatches.currentStock} ${inventoryWithBatches.unit}`);
      console.log(`   Batches: ${inventoryWithBatches.batches.length}`);
      console.log(`   Supplier: ${inventoryWithBatches.supplier?.name || 'None'}`);
    }
    
    const recipeWithIngredients = await prisma.recipe.findFirst({
      include: {
        ingredients: {
          include: {
            inventoryItem: true
          }
        }
      }
    });
    
    if (recipeWithIngredients) {
      console.log(`\n🍕 Sample recipe: ${recipeWithIngredients.name}`);
      console.log(`   Ingredients: ${recipeWithIngredients.ingredients.length}`);
      console.log(`   Cost per serving: $${recipeWithIngredients.costPerServing || 'Not calculated'}`);
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();