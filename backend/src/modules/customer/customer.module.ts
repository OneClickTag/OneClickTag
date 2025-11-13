import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

// Services
import { CustomerService } from './services/customer.service';
import { GoogleIntegrationService } from './services/google-integration.service';

// Controllers
import { CustomerController } from './controllers/customer.controller';

// Import auth and tenant modules for OAuth and tenant services
import { AuthModule } from '../auth/auth.module';
import { TenantModule } from '../tenant/tenant.module';
import { GoogleIntegrationModule } from '../google-integration/google-integration.module';

@Module({
  imports: [
    JwtModule,
    AuthModule, // For OAuth services
    TenantModule, // For tenant context and caching
    GoogleIntegrationModule, // For conversion actions service
  ],
  controllers: [CustomerController],
  providers: [
    CustomerService,
    GoogleIntegrationService,
  ],
  exports: [
    CustomerService,
    GoogleIntegrationService,
  ],
})
export class CustomerModule {}