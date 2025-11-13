import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from '../middleware/tenant-context.middleware';

export const GetTenantContext = createParamDecorator(
  (data: keyof TenantContext | undefined, ctx: ExecutionContext): TenantContext | any => {
    const request = ctx.switchToHttp().getRequest();
    const tenantContext = request.tenantContext as TenantContext;
    
    return data ? tenantContext?.[data] : tenantContext;
  },
);