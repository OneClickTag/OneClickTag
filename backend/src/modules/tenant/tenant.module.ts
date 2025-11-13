import { Module, MiddlewareConsumer, NestModule, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

// Services
import { TenantService } from './services/tenant.service';
import { TenantContextService } from './services/tenant-context.service';
import { TenantCacheService } from './services/tenant-cache.service';

// Controllers
import { TenantController } from './controllers/tenant.controller';

// Guards
import { TenantGuard } from './guards/tenant.guard';

// Middleware
import { 
  TenantIsolationMiddleware, 
  RequireTenantMiddleware,
  BypassTenantMiddleware 
} from './middleware/tenant-isolation.middleware';

@Global() // Make tenant services available globally
@Module({
  imports: [
    JwtModule, // For JWT decoding in middleware
  ],
  controllers: [TenantController],
  providers: [
    // Services
    TenantService,
    TenantContextService,
    TenantCacheService,
    
    // Guards
    TenantGuard,
    
    // Middleware
    TenantIsolationMiddleware,
    RequireTenantMiddleware,
    BypassTenantMiddleware,
  ],
  exports: [
    // Export services for use in other modules
    TenantService,
    TenantContextService,
    TenantCacheService,
    TenantGuard,
    
    // Export middleware for manual use
    TenantIsolationMiddleware,
    RequireTenantMiddleware,
    BypassTenantMiddleware,
  ],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply tenant isolation middleware to all routes
    // This should be applied early in the middleware chain
    consumer
      .apply(TenantIsolationMiddleware)
      .forRoutes('*');
  }
}