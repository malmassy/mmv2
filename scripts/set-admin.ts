// Script to set a user as admin
// Usage: npx tsx scripts/set-admin.ts <email>

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setAdmin(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`User with email ${email} not found.`);
      console.log('Creating user and setting as admin...');
      const newUser = await prisma.user.create({
        data: {
          email,
          isAdmin: true,
        },
      });
      console.log(`✅ Created user ${email} and set as admin.`);
      console.log(`User ID: ${newUser.id}`);
      return;
    }

    if (user.isAdmin) {
      console.log(`User ${email} is already an admin.`);
      return;
    }

    await prisma.user.update({
      where: { email },
      data: { isAdmin: true },
    });

    console.log(`✅ User ${email} is now an admin.`);
  } catch (error) {
    console.error('Error setting admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: npx tsx scripts/set-admin.ts <email>');
  process.exit(1);
}

setAdmin(email);
