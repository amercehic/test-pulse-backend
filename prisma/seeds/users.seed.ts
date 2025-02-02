import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const logger = new Logger('Seed:Users');

export default async function seedUsers(prisma: PrismaClient) {
  logger.log('🔹 Seeding users...');
  const organization = await prisma.organization.findFirst();

  if (!organization) {
    throw new Error('No organization found. Please seed organizations first.');
  }

  await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: 'hashedpassword', // Replace with hashed password
      organizationId: organization.id,
    },
  });
  logger.log('✅ Users seeded successfully');
}
