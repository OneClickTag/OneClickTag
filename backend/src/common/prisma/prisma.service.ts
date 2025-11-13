import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createTenantAwareClient, TenantAwareClient } from '../../modules/tenant/extensions/prisma-tenant.extension';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  public tenantAware: TenantAwareClient;

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Optimize for serverless environments like Vercel
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      errorFormat: 'pretty',
    });
    
    // Create tenant-aware client with bypass for certain models
    this.tenantAware = createTenantAwareClient(this, {
      bypassModels: ['Tenant'], // Models that don't need tenant filtering
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Method to get raw Prisma client (without tenant filtering)
  // Use with caution - only for admin operations
  getRawClient(): PrismaClient {
    return this;
  }

  // Method to get tenant-aware client (default for most operations)
  getTenantAware(): TenantAwareClient {
    return this.tenantAware;
  }
}