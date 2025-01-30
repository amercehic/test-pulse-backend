import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const logger = new Logger('Seed:Permissions');

export default async function seedPermissions(prisma: PrismaClient) {
  logger.log('🔹 Seeding permissions...');
  await prisma.permission.createMany({
    data: [
      { name: 'view:test-run', description: 'View test runs' },
      { name: 'create:test-run', description: 'Create test runs' },
      { name: 'update:test-run', description: 'Update test runs' },
      { name: 'delete:test-run', description: 'Delete test runs' },
      { name: 'manage:users', description: 'Manage users in the organization' },
    ],
  });
  logger.log('✅ Permissions seeded successfully');
}
