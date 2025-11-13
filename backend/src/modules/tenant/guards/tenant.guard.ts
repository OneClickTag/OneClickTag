import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService } from '../services/tenant-context.service';
import { 
  REQUIRE_TENANT_KEY, 
  BYPASS_TENANT_KEY, 
  REQUIRE_PERMISSION_KEY 
} from '../decorators/require-tenant.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if tenant isolation should be bypassed
    const bypassTenant = this.reflector.getAllAndOverride<boolean>(BYPASS_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (bypassTenant) {
      return true;
    }

    // Check if tenant is required
    const requireTenant = this.reflector.getAllAndOverride<boolean>(REQUIRE_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requireTenant) {
      const request = context.switchToHttp().getRequest();
      const user = request.user; // Set by JWT guard
      
      // Try to get tenant ID from authenticated user first
      let tenantId = user?.tenantId;
      
      // Fallback to tenant context service
      if (!tenantId) {
        tenantId = TenantContextService.getTenantId();
      }
      
      if (!tenantId) {
        throw new ForbiddenException('Tenant context is required for this operation');
      }

      // Set tenant context if it's not already set
      if (!TenantContextService.getTenantId() && user?.tenantId) {
        TenantContextService.run({
          tenantId: user.tenantId,
          userId: user.id,
          permissions: [],
        }, () => {});
      }
    }

    // Check required permissions
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(REQUIRE_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPermissions = TenantContextService.getPermissions() || [];
      
      const hasPermission = requiredPermissions.some(permission => 
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        throw new ForbiddenException(`Required permissions: ${requiredPermissions.join(', ')}`);
      }
    }

    return true;
  }
}