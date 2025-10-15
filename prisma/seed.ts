import { PrismaClient } from '@prisma/client';
import { seedDatabase } from '../lib/seed-data';

const prisma = new PrismaClient();

seedDatabase(prisma)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
