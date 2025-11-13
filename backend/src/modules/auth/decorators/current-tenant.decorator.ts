import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentTenant = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): string | object => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    if (data === 'id') {
      return user?.tenantId;
    }
    
    return user?.tenant;
  },
);