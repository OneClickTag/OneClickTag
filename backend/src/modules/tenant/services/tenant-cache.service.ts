import { Injectable, Logger } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tenantId?: string; // Override tenant ID
  global?: boolean; // Skip tenant scoping
}

export interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
  tenantId?: string;
}

@Injectable()
export class TenantCacheService {
  private readonly logger = new Logger(TenantCacheService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 300; // 5 minutes

  /**
   * Get value from tenant-scoped cache
   */
  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const cacheKey = this.buildCacheKey(key, options);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Validate tenant access (except for global cache)
    if (!options.global && entry.tenantId) {
      const currentTenantId = options.tenantId || TenantContextService.getTenantId();
      if (entry.tenantId !== currentTenantId) {
        this.logger.warn(`Tenant isolation violation: Attempted to access cache key "${cacheKey}" from different tenant`);
        return null;
      }
    }

    return entry.value;
  }

  /**
   * Set value in tenant-scoped cache
   */
  async set<T = any>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const cacheKey = this.buildCacheKey(key, options);
    const ttl = options.ttl || this.defaultTTL;
    const expiresAt = Date.now() + (ttl * 1000);
    const tenantId = options.global ? undefined : (options.tenantId || TenantContextService.getTenantId());

    this.cache.set(cacheKey, {
      value,
      expiresAt,
      tenantId,
    });

    // Schedule cleanup
    setTimeout(() => {
      const entry = this.cache.get(cacheKey);
      if (entry && Date.now() > entry.expiresAt) {
        this.cache.delete(cacheKey);
      }
    }, ttl * 1000);
  }

  /**
   * Delete from cache
   */
  async del(key: string, options: CacheOptions = {}): Promise<boolean> {
    const cacheKey = this.buildCacheKey(key, options);
    return this.cache.delete(cacheKey);
  }

  /**
   * Delete multiple keys at once
   */
  async delMany(keys: string[], options: CacheOptions = {}): Promise<number> {
    let deletedCount = 0;
    for (const key of keys) {
      const deleted = await this.del(key, options);
      if (deleted) {
        deletedCount++;
      }
    }
    return deletedCount;
  }

  /**
   * Delete all keys matching a pattern
   * Pattern supports simple wildcards: 'customers:*', 'customers:123:*', etc.
   */
  async delPattern(pattern: string, options: CacheOptions = {}): Promise<number> {
    const tenantId = options.global ? undefined : (options.tenantId || TenantContextService.getTenantId());
    const regexPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);

    let deletedCount = 0;
    for (const [cacheKey, entry] of this.cache.entries()) {
      // Check tenant isolation
      if (!options.global && entry.tenantId !== tenantId) {
        continue;
      }

      // Extract the original key from the cache key (remove tenant prefix)
      const originalKey = this.extractOriginalKey(cacheKey, entry.tenantId);

      if (regex.test(originalKey)) {
        this.cache.delete(cacheKey);
        deletedCount++;
      }
    }

    this.logger.log(`Deleted ${deletedCount} cache entries matching pattern: ${pattern}`);
    return deletedCount;
  }

  /**
   * Extract original key from cache key (removing tenant prefix)
   */
  private extractOriginalKey(cacheKey: string, tenantId?: string): string {
    if (tenantId) {
      const prefix = `tenant:${tenantId}:`;
      if (cacheKey.startsWith(prefix)) {
        return cacheKey.substring(prefix.length);
      }
    }
    return cacheKey;
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string, options: CacheOptions = {}): Promise<boolean> {
    const value = await this.get(key, options);
    return value !== null;
  }

  /**
   * Get or set value (cache-aside pattern)
   */
  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T> | T,
    options: CacheOptions = {},
  ): Promise<T> {
    const cached = await this.get<T>(key, options);
    
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Clear all cache entries for current tenant
   */
  async clearTenant(tenantId?: string): Promise<number> {
    const targetTenantId = tenantId || TenantContextService.getTenantId();
    
    if (!targetTenantId) {
      this.logger.warn('No tenant ID provided for cache clear operation');
      return 0;
    }

    let cleared = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tenantId === targetTenantId) {
        this.cache.delete(key);
        cleared++;
      }
    }

    this.logger.log(`Cleared ${cleared} cache entries for tenant ${targetTenantId}`);
    return cleared;
  }

  /**
   * Clear all cache entries (admin operation)
   */
  async clearAll(): Promise<number> {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.log(`Cleared all ${size} cache entries`);
    return size;
  }

  /**
   * Get cache statistics
   */
  async getStats(tenantId?: string): Promise<{
    totalEntries: number;
    tenantEntries: number;
    expiredEntries: number;
    tenantId?: string;
  }> {
    const targetTenantId = tenantId || TenantContextService.getTenantId();
    const now = Date.now();
    
    let totalEntries = 0;
    let tenantEntries = 0;
    let expiredEntries = 0;

    for (const [key, entry] of this.cache.entries()) {
      totalEntries++;
      
      if (now > entry.expiresAt) {
        expiredEntries++;
      }
      
      if (targetTenantId && entry.tenantId === targetTenantId) {
        tenantEntries++;
      }
    }

    return {
      totalEntries,
      tenantEntries,
      expiredEntries,
      tenantId: targetTenantId,
    };
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.cache.delete(key));
    
    if (toDelete.length > 0) {
      this.logger.log(`Cleaned up ${toDelete.length} expired cache entries`);
    }

    return toDelete.length;
  }

  /**
   * Get all cache keys for current tenant
   */
  async getKeys(tenantId?: string): Promise<string[]> {
    const targetTenantId = tenantId || TenantContextService.getTenantId();
    const keys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tenantId === targetTenantId) {
        // Extract original key (remove tenant prefix)
        const originalKey = key.replace(`tenant:${targetTenantId}:`, '');
        keys.push(originalKey);
      }
    }

    return keys;
  }

  /**
   * Memoize function with tenant-scoped caching
   */
  memoize<T extends (...args: any[]) => any>(
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string,
    options: CacheOptions = {},
  ): T {
    return ((...args: Parameters<T>) => {
      const key = keyGenerator ? keyGenerator(...args) : `memoized:${fn.name}:${JSON.stringify(args)}`;
      
      return this.getOrSet(key, () => fn(...args), options);
    }) as T;
  }

  /**
   * Build cache key with tenant scoping
   */
  private buildCacheKey(key: string, options: CacheOptions): string {
    if (options.global) {
      return `global:${key}`;
    }

    const tenantId = options.tenantId || TenantContextService.getTenantId();
    
    if (!tenantId) {
      this.logger.warn(`No tenant context for cache key "${key}", using global scope`);
      return `global:${key}`;
    }

    return `tenant:${tenantId}:${key}`;
  }

  /**
   * Start periodic cleanup task
   */
  startPeriodicCleanup(intervalMs = 60000): NodeJS.Timeout {
    return setInterval(() => {
      this.cleanup();
    }, intervalMs);
  }
}

// Decorator for automatic caching of method results
export function TenantCached(options: CacheOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService = this.cacheService as TenantCacheService;
      
      if (!cacheService) {
        console.warn(`TenantCacheService not found in ${target.constructor.name}, executing method without caching`);
        return method.apply(this, args);
      }

      const key = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
      
      return cacheService.getOrSet(key, () => method.apply(this, args), options);
    };

    return descriptor;
  };
}