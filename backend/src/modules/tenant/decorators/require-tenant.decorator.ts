import { SetMetadata } from '@nestjs/common';

export const REQUIRE_TENANT_KEY = 'requireTenant';
export const BYPASS_TENANT_KEY = 'bypassTenant';
export const REQUIRE_PERMISSION_KEY = 'requirePermission';

/**
 * Decorator to mark routes/controllers that require tenant context
 * 
 * Usage:
 * @RequireTenant()
 * @Get('data')
 * getData() { ... }
 */
export const RequireTenant = () => SetMetadata(REQUIRE_TENANT_KEY, true);

/**
 * Decorator to mark routes/controllers that should bypass tenant isolation
 * Use with caution - typically for admin operations only
 * 
 * Usage:
 * @BypassTenant()
 * @Get('admin/all-tenants')
 * getAllTenants() { ... }
 */
export const BypassTenant = () => SetMetadata(BYPASS_TENANT_KEY, true);

/**
 * Decorator to mark routes that require specific permissions
 * 
 * Usage:
 * @RequirePermission('admin', 'user:write')
 * @Post('users')
 * createUser() { ... }
 */
export const RequirePermission = (...permissions: string[]) => 
  SetMetadata(REQUIRE_PERMISSION_KEY, permissions);