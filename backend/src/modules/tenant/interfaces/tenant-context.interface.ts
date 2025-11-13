export interface TenantContextData {
  tenantId: string;
  userId?: string;
  permissions?: string[];
}


export interface TenantIsolationOptions {
  bypassIsolation?: boolean;
  customTenantId?: string;
}