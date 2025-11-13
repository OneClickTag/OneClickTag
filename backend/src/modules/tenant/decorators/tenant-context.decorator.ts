import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContextService } from '../services/tenant-context.service';
import { TenantContextData } from '../interfaces/tenant-context.interface';

/**
 * Decorator to inject tenant context into controller method parameters
 * 
 * Usage examples:
 * @TenantContext() context: TenantContextData
 * @TenantContext('tenantId') tenantId: string
 * @TenantContext('userId') userId: string
 * @TenantContext('permissions') permissions: string[]
 */
export const TenantContext = createParamDecorator(
  (data: keyof TenantContextData | undefined, ctx: ExecutionContext): TenantContextData | any => {
    const context = TenantContextService.getCurrentContext();
    
    if (!context) {
      return data ? undefined : null;
    }
    
    return data ? context[data] : context;
  },
);

/**
 * Decorator to inject only the tenant ID
 * 
 * Usage:
 * @TenantId() tenantId: string
 */
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    // First try to get from tenant context
    const contextTenantId = TenantContextService.getTenantId();
    if (contextTenantId) {
      return contextTenantId;
    }
    
    // Fallback: get from authenticated user
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return user?.tenantId;
  },
);

/**
 * Decorator to inject only the user ID from tenant context
 * 
 * Usage:
 * @UserId() userId: string
 */
export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    // First try to get from tenant context
    const contextUserId = TenantContextService.getUserId();
    if (contextUserId) {
      return contextUserId;
    }
    
    // Fallback: get from authenticated user
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return user?.id;
  },
);

/**
 * Decorator to inject permissions from tenant context
 * 
 * Usage:
 * @Permissions() permissions: string[]
 */
export const Permissions = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string[] | undefined => {
    return TenantContextService.getPermissions();
  },
);