import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MonitoringService } from './monitoring.service';
import { HealthModule } from './health/health.module';

@Global()
@Module({
  imports: [ConfigModule, HealthModule],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}