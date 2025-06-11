import { PrismaClient, UserRole } from '@prisma/client';
import { PasswordService } from '../src/services/password.service';
import { AuditLogService } from '../src/services/audit-log.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🧨 Clearing existing data...');
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

  await AuditLogService.logBusinessActivity({
    event: 'INITIAL_USERS_CREATED',
    action: 'CREATE',
    resourceType: 'USER_ACCOUNTS',
    resourceId: tenant.id,
    userId: 'SYSTEM',
    username: 'SYSTEM',
    tenantId: tenant.id,
    details: {
      usersCreated: [
        { username: 'restaurant_admin', role: 'RESTAURANT_ADMIN' },
        { username: 'main_branch_admin', role: 'BRANCH_ADMIN' },
        { username: 'downtown_branch_admin', role: 'BRANCH_ADMIN' }
      ]
    }
  });

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📋 LOGIN CREDENTIALS:');
  console.log('================================');
  console.log('1. System Admin:');
  console.log('   Username: admin');
  console.log('   Password: Admin123!SecureKZ\n');
  console.log('2. Restaurant Admin:');
  console.log('   Username: restaurant_admin');
  console.log('   Password: RestAdmin123!\n');
  console.log('3. Main Branch Admin:');
  console.log('   Username: main_branch_admin');
  console.log('   Password: MainBranch123!\n');
  console.log('4. Downtown Branch Admin:');
  console.log('   Username: downtown_branch_admin');
  console.log('   Password: Downtown123!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
