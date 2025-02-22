import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import seedRoles from '@db/seeds/roles.seed';
import seedUsers from '@db/seeds/users.seed';
import seedTestRuns from '@db/seeds/test-runs.seed';

const prisma = new PrismaClient();
const logger = new Logger('Seed');

async function main() {
  logger.log('🌱 Starting database seeding...');

  await seedRoles(prisma);

  await seedUsers(prisma);

  await seedTestRuns(prisma);

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
