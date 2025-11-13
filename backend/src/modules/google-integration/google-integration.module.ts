import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleAdsController } from './controllers/google-ads.controller';
import { GoogleAdsService } from './services/google-ads.service';
import { ConversionActionsService } from './services/conversion-actions.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    TenantModule,
    AuthModule,
  ],
  controllers: [
    GoogleAdsController,
  ],
  providers: [
    GoogleAdsService,
    ConversionActionsService,
  ],
  exports: [
    GoogleAdsService,
    ConversionActionsService,
  ],
})
export class GoogleIntegrationModule {}