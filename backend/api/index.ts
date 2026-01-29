import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import express, { Express } from 'express';
import { AppModule } from '../src/app.module';

let cachedApp: Express | null = null;

async function createApp(): Promise<Express> {
  if (cachedApp) {
    return cachedApp;
  }

  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    adapter,
    { logger: ['error', 'warn', 'log'] },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS Configuration
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const allowedOrigins = corsOrigin.split(',').map((origin) => origin.trim());

  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'X-Client-Version',
      'X-Request-ID',
      'X-User-Agent',
    ],
  });

  // Set global API prefix
  app.setGlobalPrefix('api');

  await app.init();

  cachedApp = expressApp;
  return expressApp;
}

export default async function handler(req: any, res: any) {
  const app = await createApp();
  app(req, res);
}
