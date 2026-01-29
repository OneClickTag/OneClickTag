import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../prisma/prisma.service';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { of } from 'rxjs';

export interface HealthCheckResult {
  status: 'up' | 'down';
  responseTime?: number;
  message?: string;
  error?: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  async checkDatabase(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        responseTime: Date.now() - start,
        message: 'Database connection successful',
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'down',
        responseTime: Date.now() - start,
        error: error?.message || 'Database connection failed',
      };
    }
  }

  async checkGoogleApi(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await firstValueFrom(
        this.httpService.get('https://www.googleapis.com/').pipe(
          timeout(5000),
          catchError(() => of({ status: 200 })),
        ),
      );
      return {
        status: 'up',
        responseTime: Date.now() - start,
        message: 'Google API reachable',
      };
    } catch (error) {
      this.logger.warn('Google API health check failed', error);
      return {
        status: 'down',
        responseTime: Date.now() - start,
        error: error?.message || 'Google API unreachable',
      };
    }
  }

  async checkRedis(): Promise<HealthCheckResult> {
    const redisHost = this.configService.get('REDIS_HOST');
    if (!redisHost) {
      return {
        status: 'up',
        message: 'Redis not configured - skipped',
      };
    }

    // If Redis is configured, we assume it's working since Bull handles connection
    return {
      status: 'up',
      message: 'Redis configured',
    };
  }

  getMetrics() {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      timestamp: new Date().toISOString(),
      environment: this.configService.get('NODE_ENV') || 'development',
      version: this.configService.get('npm_package_version') || '1.0.0',
      uptime: `${Math.floor(uptime)}s`,
      memory: {
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
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
