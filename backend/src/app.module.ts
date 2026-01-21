import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { CustomerModule } from './modules/customer/customer.module';
import { GoogleIntegrationModule } from './modules/google-integration/google-integration.module';
import { JobsModule } from './jobs/jobs.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { MonitoringModule } from './common/monitoring/monitoring.module';
import { AdminModule } from './modules/admin/admin.module';
import { PublicModule } from './modules/public/public.module';
import { LeadsModule } from './modules/leads/leads.module';
import { ComplianceModule } from './modules/compliance/compliance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MonitoringModule,
    PrismaModule,
    TenantModule, // Import before other modules for proper middleware order
    AuthModule,
    AdminModule,
    PublicModule,
    LeadsModule,
    CustomerModule,
    GoogleIntegrationModule,
    JobsModule,
    RealtimeModule,
    UsersModule,
    ComplianceModule,
  ],
})
export class AppModule {}