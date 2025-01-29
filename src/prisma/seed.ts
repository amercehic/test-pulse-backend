import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import seedPermissions from './seeds/permissions.seed';
import seedRoles from './seeds/roles.seed';
import seedOrganizations from './seeds/organizations.seed';
import seedUsers from './seeds/users.seed';

const prisma = new PrismaClient();
const logger = new Logger('Seed');

async function main() {
  logger.log('🌱 Starting database seeding...');
  await seedPermissions(prisma);
  await seedRoles(prisma);
  await seedOrganizations(prisma);
  await seedUsers(prisma);
  logger.log('✅ Seeding complete!');
}

main()
  .catch((error) => {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
