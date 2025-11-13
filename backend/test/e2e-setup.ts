/**
 * E2E test setup - runs before e2e tests
 */

import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';

declare global {
  var __E2E_APP__: INestApplication;
  var __REQUEST__: request.SuperTest<request.Test>;
}

beforeAll(async () => {
  // Create test application with full setup
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  
  // Apply same configuration as main.ts
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  await app.init();

  // Setup global references
  global.__E2E_APP__ = app;
  global.__REQUEST__ = request(app.getHttpServer());
});

afterAll(async () => {
  if (global.__E2E_APP__) {
    await global.__E2E_APP__.close();
  }
});