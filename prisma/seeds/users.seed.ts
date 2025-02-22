import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export default async function seedUsers(prisma: PrismaClient) {
  try {
    // First create the organization
    let organization = await prisma.organization.findFirst({
      where: { name: 'Example Organization' },
    });

    if (!organization) {
      organization = await prisma.organization.create({
        data: { name: 'Example Organization' },
      });
    }

    // Create second organization
    let organization2 = await prisma.organization.findFirst({
      where: { name: 'Second Organization' },
    });

    if (!organization2) {
      organization2 = await prisma.organization.create({
        data: { name: 'Second Organization' },
      });
    }

    // Hash the passwords
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('password123!', saltRounds);
    const hashedPassword2 = await bcrypt.hash('password123!', saltRounds);

    // Create the first user with the organization
    const user = await prisma.user.upsert({
      where: { email: 'user@example.com' },
      update: {},
      create: {
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: hashedPassword,
        organizationId: organization.id,
      },
    });

    // Create the second user with the second organization
    const user2 = await prisma.user.upsert({
      where: { email: 'user2@example.com' },
      update: {},
      create: {
        email: 'user2@example.com',
        firstName: 'Second',
        lastName: 'User',
        password: hashedPassword2,
        organizationId: organization2.id,
      },
    });

    // Assign the 'member' role to both users
    const memberRole = await prisma.role.findUnique({
      where: { name: 'member' },
    });

    if (memberRole) {
      await prisma.userRole.upsert({
        where: {
          id: `${user.id}-${memberRole.id}`,
        },
        update: {},
        create: {
          userId: user.id,
          roleId: memberRole.id,
        },
      });

      await prisma.userRole.upsert({
        where: {
          id: `${user2.id}-${memberRole.id}`,
        },
        update: {},
        create: {
          userId: user2.id,
          roleId: memberRole.id,
        },
      });
    }

    console.log('✅ Default users and organizations seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  }
}
