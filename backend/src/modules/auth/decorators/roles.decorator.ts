import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// Convenience decorators
export const AdminOnly = () => Roles('ADMIN', 'SUPER_ADMIN');
export const SuperAdminOnly = () => Roles('SUPER_ADMIN');
