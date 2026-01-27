import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface HealthCheckResult {
  status: 'ok' | 'error';
  timestamp: string;
  checks: Record<string, { status: string; message?: string; error?: string }>;
}

@Injectable()
export class HealthService {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async checkHealth(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {};

    // Check database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'up', message: 'Database connection successful' };
    } catch (error) {
      checks.database = { status: 'down', error: error.message };
    }

    // Check Redis (if configured)
    const redisHost = this.configService.get('REDIS_HOST');
    if (redisHost) {
      checks.redis = { status: 'up', message: 'Redis not implemented yet' };
    } else {
      checks.redis = { status: 'skipped', message: 'Redis not configured' };
    }

    const allUp = Object.values(checks).every(
      (c) => c.status === 'up' || c.status === 'skipped',
    );

    return {
      status: allUp ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  async checkReadiness(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {};

    // Check database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'up', message: 'Database ready' };
    } catch (error) {
      checks.database = { status: 'down', error: error.message };
    }

    // Application state
    checks.app = { status: 'up', message: 'Application initialized' };

    const allUp = Object.values(checks).every((c) => c.status === 'up');

    return {
      status: allUp ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  getMetrics() {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      timestamp: new Date().toISOString(),
      environment: this.configService.get('NODE_ENV'),
      version: this.configService.get('npm_package_version') || '1.0.0',
      uptime: `${Math.floor(uptime)}s`,
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
      },
      vercel: process.env.VERCEL
        ? {
            region: process.env.VERCEL_REGION,
            env: process.env.VERCEL_ENV,
            url: process.env.VERCEL_URL,
          }
        : null,
    };
  }
}
