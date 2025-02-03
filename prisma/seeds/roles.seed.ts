import { PrismaClient } from '@prisma/client';

export default async function seedRoles(prisma: PrismaClient) {
  try {
    const roles = [
      { name: 'viewer', description: 'Can view all resources' },
      {
        name: 'member',
        description: 'Can update test runs but cannot delete them',
      },
      { name: 'admin', description: 'Can manage test runs and users' },
      { name: 'super', description: 'Full access to everything' },
    ];

    for (const role of roles) {
      await prisma.role.upsert({
        where: { name: role.name },
        update: {}, // Do nothing if it exists
        create: role,
      });
    }

    console.log('✅ Default roles seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding roles:', error);
    process.exit(1); // Exit with failure code
  }
}
