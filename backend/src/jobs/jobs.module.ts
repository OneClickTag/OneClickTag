import { Module, DynamicModule, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

// Processors
import { GTMSyncProcessor } from './processors/gtm-sync.processor';
import { BulkCustomerImportProcessor } from './processors/bulk-customer-import.processor';
import { ApiRetryProcessor } from './processors/api-retry.processor';
import { AnalyticsAggregationProcessor } from './processors/analytics-aggregation.processor';

// Services
import { JobMonitoringService } from './services/job-monitoring.service';
import { JobSchedulerService } from './services/job-scheduler.service';

// Controllers
import { JobMonitoringController } from './controllers/job-monitoring.controller';

// Other modules
import { PrismaModule } from '../common/prisma/prisma.module';
import { TenantModule } from '../modules/tenant/tenant.module';
import { AuthModule } from '../modules/auth/auth.module';
import { CustomerModule } from '../modules/customer/customer.module';
import { GoogleIntegrationModule } from '../modules/google-integration/google-integration.module';

import { JobQueues } from './interfaces/job.interface';

// Check if Redis is available at module load time
const REDIS_AVAILABLE = Boolean(process.env.REDIS_HOST);

@Module({})
export class JobsModule {
  private static readonly logger = new Logger(JobsModule.name);

  static forRoot(): DynamicModule {
    if (!REDIS_AVAILABLE) {
      this.logger.warn('REDIS_HOST not configured - JobsModule disabled (serverless mode)');
      return {
        module: JobsModule,
        imports: [],
        controllers: [],
        providers: [],
        exports: [],
      };
    }

    this.logger.log('REDIS_HOST configured - JobsModule enabled');
    return {
      module: JobsModule,
      imports: [
        // Configure Bull with Redis
        BullModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            redis: {
              host: configService.get('REDIS_HOST') || 'localhost',
              port: configService.get('REDIS_PORT') || 6379,
              password: configService.get('REDIS_PASSWORD'),
              db: configService.get('REDIS_DB') || 0,
              maxRetriesPerRequest: 3,
              retryDelayOnFailover: 100,
              lazyConnect: true,
            },
            defaultJobOptions: {
              removeOnComplete: 100, // Keep last 100 completed jobs
              removeOnFail: 50, // Keep last 50 failed jobs
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2000,
              },
            },
            settings: {
              stalledInterval: 30 * 1000, // 30 seconds
              maxStalledCount: 1,
            },
          }),
          inject: [ConfigService],
        }),

        // Register queues
        BullModule.registerQueue(
          {
            name: JobQueues.GTM_SYNC,
            defaultJobOptions: {
              attempts: 5,
              backoff: {
                type: 'exponential',
                delay: 3000,
              },
              removeOnComplete: 50,
              removeOnFail: 25,
            },
          },
          {
            name: JobQueues.BULK_IMPORT,
            defaultJobOptions: {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 5000,
              },
              removeOnComplete: 25,
              removeOnFail: 10,
            },
          },
          {
            name: JobQueues.API_RETRY,
            defaultJobOptions: {
              attempts: 1, // Retry jobs handle their own retry logic
              removeOnComplete: 100,
              removeOnFail: 50,
            },
          },
          {
            name: JobQueues.ANALYTICS,
            defaultJobOptions: {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 10000,
              },
              removeOnComplete: 10,
              removeOnFail: 5,
            },
          },
        ),

        // External modules
        ConfigModule,
        HttpModule.register({
          timeout: 30000,
          maxRedirects: 5,
        }),
        PrismaModule,
        TenantModule,
        AuthModule,
        CustomerModule,
        GoogleIntegrationModule,
      ],
      controllers: [JobMonitoringController],
      providers: [
        // Processors
        GTMSyncProcessor,
        BulkCustomerImportProcessor,
        ApiRetryProcessor,
        AnalyticsAggregationProcessor,

        // Services
        JobMonitoringService,
        JobSchedulerService,
      ],
      exports: [BullModule, JobMonitoringService, JobSchedulerService],
    };
  }
}
