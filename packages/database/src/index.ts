import { PrismaClient } from './generated/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrl(): string {
  const url = process.env['DATABASE_URL'];

  if (url && typeof url === 'string') {
    return url;
  }

  // next build collects page data and imports route modules; allow a
  // non-connecting placeholder when env validation is intentionally skipped
  if (process.env['SKIP_ENV_VALIDATION']) {
    return 'postgresql://build:build@127.0.0.1:5432/build';
  }

  throw new Error(
    'DATABASE_URL is not set. Add it to the workspace root .env file.',
  );
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export * from './generated/client';
