import { PrismaClient, UserRole } from '@prisma/client';
import { PasswordService } from '../src/services/password.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create KitchZero admin user
  const adminPassword = await PasswordService.hash('Admin123!');
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      role: UserRole.KITCHZERO_ADMIN,
      mustChangePassword: false,
      isActive: true
    }
  });

  console.log('✅ Created admin user:', admin.username);

  // Create a sample tenant
  const tenant = await prisma.tenant.upsert({
    where: { name: 'Demo Restaurant Group' },
    update: {},
    create: {
      name: 'Demo Restaurant Group',
      slug: 'demo-restaurant-group',
      isActive: true
    }
  });

  console.log('✅ Created tenant:', tenant.name);

  // Create a sample branch
  const branch = await prisma.branch.upsert({
    where: { 
      tenantId_slug: {
        tenantId: tenant.id,
        slug: 'main-branch'
      }
    },
    update: {},
    create: {
      name: 'Main Branch',
      slug: 'main-branch',
      tenantId: tenant.id,
      isActive: true
    }
  });

  console.log('✅ Created branch:', branch.name);

  // Create restaurant admin
  const restaurantAdminPassword = await PasswordService.hash('RestaurantAdmin123!');
  
  const restaurantAdmin = await prisma.user.upsert({
    where: { username: 'restaurant_admin' },
    update: {},
    create: {
      username: 'restaurant_admin',
      passwordHash: restaurantAdminPassword,
      role: UserRole.RESTAURANT_ADMIN,
      tenantId: tenant.id,
      mustChangePassword: true, // Force password change on first login
      isActive: true
    }
  });

  console.log('✅ Created restaurant admin:', restaurantAdmin.username);

  // Create branch admin
  const branchAdminPassword = await PasswordService.hash('BranchAdmin123!');
  
  const branchAdmin = await prisma.user.upsert({
    where: { username: 'branch_admin' },
    update: {},
    create: {
      username: 'branch_admin',
      passwordHash: branchAdminPassword,
      role: UserRole.BRANCH_ADMIN,
      tenantId: tenant.id,
      branchId: branch.id,
      mustChangePassword: true, // Force password change on first login
      isActive: true
    }
  });

  console.log('✅ Created branch admin:', branchAdmin.username);

  console.log('\n🎉 Seeding completed!');
  console.log('\nTest users created:');
  console.log('1. admin / Admin123! (KITCHZERO_ADMIN)');
  console.log('2. restaurant_admin / RestaurantAdmin123! (RESTAURANT_ADMIN) - must change password');
  console.log('3. branch_admin / BranchAdmin123! (BRANCH_ADMIN) - must change password');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });