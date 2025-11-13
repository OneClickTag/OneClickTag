import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MetricData {
  name: string;
  value: number;
  timestamp?: Date;
  tags?: Record<string, string>;
}

export interface ErrorData {
  error: Error;
  context?: string;
  userId?: string;
  tenantId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(private configService: ConfigService) {}

  // Performance metrics
  async recordMetric(data: MetricData): Promise<void> {
    try {
      const timestamp = data.timestamp || new Date();
      
      // Log to console in development
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.debug(`Metric: ${data.name} = ${data.value}`, {
          tags: data.tags,
          timestamp,
        });
      }

      // In production, send to monitoring service (Vercel Analytics, DataDog, etc.)
      if (this.configService.get('NODE_ENV') === 'production') {
        await this.sendToMonitoringService(data);
      }
    } catch (error) {
      this.logger.error('Failed to record metric', error);
    }
  }

  // Error tracking
  async recordError(data: ErrorData): Promise<void> {
    try {
      const errorInfo = {
        message: data.error.message,
        stack: data.error.stack,
        name: data.error.name,
        context: data.context,
        userId: data.userId,
        tenantId: data.tenantId,
        requestId: data.requestId,
        metadata: data.metadata,
        timestamp: new Date(),
        environment: this.configService.get('NODE_ENV'),
      };

      // Log to console
      this.logger.error('Application Error', errorInfo);

      // Send to error tracking service (Sentry, Bugsnag, etc.)
      if (this.configService.get('SENTRY_DSN')) {
        await this.sendToSentry(errorInfo);
      }
    } catch (error) {
      this.logger.error('Failed to record error', error);
    }
  }

  // Database performance tracking
  async recordDatabaseQuery(
    query: string,
    duration: number,
    tenantId?: string
  ): Promise<void> {
    await this.recordMetric({
      name: 'database.query.duration',
      value: duration,
      tags: {
        tenantId: tenantId || 'system',
        queryType: this.extractQueryType(query),
      },
    });

    // Alert on slow queries
    if (duration > 1000) {
      this.logger.warn(`Slow database query detected: ${duration}ms`, {
        query: query.substring(0, 100),
        tenantId,
      });
    }
  }

  // API endpoint performance tracking
  async recordApiCall(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    userId?: string,
    tenantId?: string
  ): Promise<void> {
    await this.recordMetric({
      name: 'api.request.duration',
      value: duration,
      tags: {
        endpoint,
        method,
        statusCode: statusCode.toString(),
        tenantId: tenantId || 'system',
        userId: userId || 'anonymous',
      },
    });

    // Track error rates
    if (statusCode >= 400) {
      await this.recordMetric({
        name: 'api.request.error',
        value: 1,
        tags: {
          endpoint,
          method,
          statusCode: statusCode.toString(),
          tenantId: tenantId || 'system',
        },
      });
    }
  }

  // Business metrics
  async recordBusinessMetric(
    metric: string,
    value: number,
    tenantId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.recordMetric({
      name: `business.${metric}`,
      value,
      tags: {
        tenantId: tenantId || 'system',
        ...metadata,
      },
    });
  }

  // Memory and resource usage
  async recordResourceUsage(): Promise<void> {
    const memoryUsage = process.memoryUsage();
    
    await this.recordMetric({
      name: 'system.memory.used',
      value: memoryUsage.heapUsed,
    });

    await this.recordMetric({
      name: 'system.memory.total',
      value: memoryUsage.heapTotal,
    });

    // Vercel function cold starts
    if (process.env.VERCEL) {
      await this.recordMetric({
        name: 'vercel.function.memory',
        value: memoryUsage.heapUsed,
        tags: {
          region: process.env.VERCEL_REGION || 'unknown',
        },
      });
    }
  }

  private async sendToMonitoringService(data: MetricData): Promise<void> {
    // Implement integration with your monitoring service
    // For example: Vercel Analytics, DataDog, New Relic, etc.
    
    // Example for custom webhook
    const webhookUrl = this.configService.get('MONITORING_WEBHOOK_URL');
    if (webhookUrl) {
      // Send to monitoring webhook
    }
  }

  private async sendToSentry(errorInfo: any): Promise<void> {
    // Implement Sentry integration
    // You would typically use @sentry/node here
    
    const sentryDsn = this.configService.get('SENTRY_DSN');
    if (sentryDsn) {
      // Send to Sentry
    }
  }

  private extractQueryType(query: string): string {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.startsWith('select')) return 'SELECT';
    if (normalizedQuery.startsWith('insert')) return 'INSERT';
    if (normalizedQuery.startsWith('update')) return 'UPDATE';
    if (normalizedQuery.startsWith('delete')) return 'DELETE';
    return 'OTHER';
  }
}