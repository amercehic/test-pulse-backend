import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import seedRoles from '@db/seeds/roles.seed';

const prisma = new PrismaClient();
const logger = new Logger('Seed');

async function main() {
  logger.log('🌱 Starting database seeding...');
  await seedRoles(prisma);
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
