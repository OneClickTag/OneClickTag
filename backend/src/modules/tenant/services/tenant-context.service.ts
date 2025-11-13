import { Injectable, Scope } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { TenantContextData } from '../interfaces/tenant-context.interface';

@Injectable({ scope: Scope.DEFAULT })
export class TenantContextDataService {
  private static asyncLocalStorage = new AsyncLocalStorage<TenantContextData>();

  static run<T>(context: TenantContextData, callback: () => T): T {
    return this.asyncLocalStorage.run(context, callback);
  }

  static runAsync<T>(context: TenantContextData, callback: () => Promise<T>): Promise<T> {
    return this.asyncLocalStorage.run(context, callback);
  }

  static getCurrentContext(): TenantContextData | undefined {
    return this.asyncLocalStorage.getStore();
  }

  static getTenantId(): string | undefined {
    const context = this.getCurrentContext();
    return context?.tenantId;
  }

  static getUserId(): string | undefined {
    const context = this.getCurrentContext();
    return context?.userId;
  }

  static getPermissions(): string[] | undefined {
    const context = this.getCurrentContext();
    return context?.permissions;
  }

  static hasPermission(permission: string): boolean {
    const permissions = this.getPermissions();
    return permissions?.includes(permission) || false;
  }

  static setContext(context: TenantContextData): void {
    // This method is useful for testing or manual context setting
    // In production, context should be set via middleware
    console.warn('TenantContextDataService.setContext() should only be used for testing');
  }

  static setTenantId(tenantId: string): void {
    const currentContext = this.getCurrentContext() || {};
    this.run({ ...currentContext, tenantId }, () => {});
  }

  static clearTenantId(): void {
    const currentContext = this.getCurrentContext();
    if (currentContext) {
      const { tenantId, ...rest } = currentContext;
      this.run(rest as TenantContextData, () => {});
    }
  }

  // Instance methods for dependency injection compatibility
  getCurrentContext(): TenantContextData | undefined {
    return TenantContextDataService.getCurrentContext();
  }

  getTenantId(): string | undefined {
    return TenantContextDataService.getTenantId();
  }

  getUserId(): string | undefined {
    return TenantContextDataService.getUserId();
  }

  getPermissions(): string[] | undefined {
    return TenantContextDataService.getPermissions();
  }

  hasPermission(permission: string): boolean {
    return TenantContextDataService.hasPermission(permission);
  }
}

// Export alias for backwards compatibility
export const TenantContextService = TenantContextDataService;