import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const logger = new Logger('Seed:Roles');

export default async function seedRoles(prisma: PrismaClient) {
  logger.log('🔹 Seeding roles...');
  await prisma.role.createMany({
    data: [
      { name: 'viewer', description: 'Can view all resources' },
      {
        name: 'member',
        description: 'Can update test runs but cannot delete them',
      },
      { name: 'admin', description: 'Can manage test runs and users' },
      { name: 'super', description: 'Full access to everything' },
    ],
  });
  logger.log('✅ Roles seeded successfully');
}
