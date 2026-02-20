import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prismaClientSingleton = () => {
  const databaseUrl = process.env.DATABASE_URL || '';

  // Ensure PgBouncer compatibility and limit connections for serverless
  // to prevent exhausting PgBouncer's session mode pool (MaxClientsInSessionMode)
  const params: string[] = [];
  if (!databaseUrl.includes('pgbouncer=true')) params.push('pgbouncer=true');
  if (!databaseUrl.includes('connection_limit')) params.push('connection_limit=1');

  const separator = databaseUrl.includes('?') ? '&' : '?';
  const url = params.length > 0
    ? `${databaseUrl}${separator}${params.join('&')}`
    : databaseUrl;

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasourceUrl: url,
  });
};

// Cache the singleton globally in ALL environments (including production)
// to reuse the same client across warm serverless invocations
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();
globalForPrisma.prisma = prisma;

export default prisma;
