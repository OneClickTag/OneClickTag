import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestAdmin() {
  const password = 'TestAdmin123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  const testAdmin = await prisma.user.upsert({
    where: { email: 'test-admin@oneclicktag.com' },
    update: {
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    },
    create: {
      email: 'test-admin@oneclicktag.com',
      name: 'Test Admin',
      role: 'SUPER_ADMIN',
      password: hashedPassword,
    },
  });

  console.log('✅ Created test admin user:');
  console.log('   Email:', testAdmin.email);
  console.log('   Password: TestAdmin123!');
  console.log('   Role:', testAdmin.role);
}

createTestAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
