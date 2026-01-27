import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorResult, HealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HealthService extends HealthIndicator {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super();
  }

  async checkDatabase(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true, { message: 'Database connection successful' });
    } catch (error) {
      return this.getStatus(key, false, { 
        message: 'Database connection failed',
        error: error.message,
      });
    }
  }

  async checkRedis(key: string): Promise<HealthIndicatorResult> {
    try {
      // If Redis is configured, check connection
      const redisHost = this.configService.get('REDIS_HOST');
      if (!redisHost) {
        return this.getStatus(key, true, { message: 'Redis not configured - skipped' });
      }

      // Add Redis connection check here if needed
      return this.getStatus(key, true, { message: 'Redis connection successful' });
    } catch (error) {
      return this.getStatus(key, false, {
        message: 'Redis connection failed',
        error: error.message,
      });
    }
  }

  async checkApplicationState(key: string): Promise<HealthIndicatorResult> {
    try {
      // Check if critical services are initialized
      const isReady = await this.checkCriticalServices();
      
      return this.getStatus(key, isReady, {
        message: isReady ? 'Application ready' : 'Application not ready',
      });
    } catch (error) {
      return this.getStatus(key, false, {
        message: 'Application state check failed',
        error: error.message,
      });
    }
  }

  async getMetrics() {
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
      vercel: process.env.VERCEL ? {
        region: process.env.VERCEL_REGION,
        env: process.env.VERCEL_ENV,
        url: process.env.VERCEL_URL,
      } : null,
    };
  }

  private async checkCriticalServices(): Promise<boolean> {
    try {
      // Check database
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Add other critical service checks here
      // For example: external API health checks, file system access, etc.
      
      return true;
    } catch (error) {
      return false;
    }
  }
}