import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const logger = new Logger('Seed:Organizations');

export default async function seedOrganizations(prisma: PrismaClient) {
  logger.log('🔹 Seeding organizations...');
  await prisma.organization.create({
    data: {
      name: 'Default Organization',
    },
  });
  logger.log('✅ Organizations seeded successfully');
}
