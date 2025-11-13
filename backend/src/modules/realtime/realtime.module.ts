import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Controllers
import { SSEController } from './controllers/sse.controller';

// Services
import { SSEService } from './services/sse.service';
import { CustomerEventsService } from './services/customer-events.service';
import { CampaignEventsService } from './services/campaign-events.service';
import { GTMEventsService } from './services/gtm-events.service';
import { ErrorEventsService } from './services/error-events.service';
import { JobEventsService } from './services/job-events.service';
import { RealtimeEventService } from './services/realtime-event.service';

// Other modules
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    TenantModule,
    AuthModule,
  ],
  controllers: [
    SSEController,
  ],
  providers: [
    SSEService,
    CustomerEventsService,
    CampaignEventsService,
    GTMEventsService,
    ErrorEventsService,
    JobEventsService,
    RealtimeEventService,
  ],
  exports: [
    SSEService,
    CustomerEventsService,
    CampaignEventsService,
    GTMEventsService,
    ErrorEventsService,
    JobEventsService,
    RealtimeEventService,
  ],
})
export class RealtimeModule {}