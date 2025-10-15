import { PrismaClient } from '@prisma/client';

type GlobalPrisma = {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as unknown as GlobalPrisma;

const defaultSqlitePath = process.env.VERCEL
  ? 'file:/tmp/barcrm.db'
  : 'file:./prisma/barcrm.db';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = defaultSqlitePath;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error']
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
