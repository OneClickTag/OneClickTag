/**
 * Integration test setup - runs before integration tests
 */

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

declare global {
  var __APP__: INestApplication;
  var __PRISMA__: PrismaService;
}

beforeAll(async () => {
  // Create test application
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();

  // Setup global references
  global.__APP__ = app;
  global.__PRISMA__ = app.get(PrismaService);

  // Clean database before integration tests
  await cleanDatabase();
});

afterAll(async () => {
  // Clean database after integration tests
  await cleanDatabase();

  // Close application
  if (global.__APP__) {
    await global.__APP__.close();
  }
});

beforeEach(async () => {
  // Clean database before each test
  await cleanDatabase();
});

async function cleanDatabase() {
  if (!global.__PRISMA__) return;

  try {
    // Get all table names
    const tablenames = await global.__PRISMA__.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;

    // Delete all data from tables
    for (const { tablename } of tablenames) {
      if (tablename !== '_prisma_migrations') {
        await global.__PRISMA__.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
      }
    }
  } catch (error) {
    console.error('Failed to clean database:', error);
  }
}