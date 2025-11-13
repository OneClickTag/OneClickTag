# Multi-Tenant Module

A comprehensive multi-tenancy solution for NestJS applications with automatic tenant filtering, isolation middleware using AsyncLocalStorage, and tenant-scoped caching.

## Features

- ✅ **Prisma Extension** for automatic tenant filtering on all queries
- ✅ **AsyncLocalStorage-based** tenant isolation middleware
- ✅ **TenantService** with complete CRUD operations
- ✅ **Custom decorators** for tenant context injection
- ✅ **Tenant-scoped caching** service with automatic isolation
- ✅ **Automatic tenant filtering** ensures all database queries are tenant-aware
- ✅ **Admin bypass** functionality for system-level operations
- ✅ **Permission-based access control** within tenants
- ✅ **Comprehensive API** with proper tenant isolation

## Architecture

### AsyncLocalStorage Isolation

Uses Node.js AsyncLocalStorage to maintain tenant context throughout the entire request lifecycle without explicit parameter passing:

```typescript
// Middleware automatically sets context
TenantContextService.run(tenantContext, () => {
  // All operations within this scope have access to tenant context
  next();
});

// Services can access context anywhere
const tenantId = TenantContextService.getTenantId();
```

### Automatic Database Filtering

Prisma extension automatically adds tenant filtering to all queries:

```typescript
// Before: Manual tenant filtering required
await prisma.user.findMany({
  where: { tenantId, status: 'active' }
});

// After: Automatic tenant filtering
await prisma.tenantAware.user.findMany({
  where: { status: 'active' } // tenantId automatically added
});
```

### Tenant-Scoped Caching

Cache keys are automatically prefixed with tenant ID:

```typescript
// Automatically scoped to current tenant
await cacheService.set('user-data', userData);
await cacheService.get('user-data'); // Only returns data for current tenant
```

## Quick Start

### 1. Import the Module

```typescript
import { TenantModule } from './modules/tenant';

@Module({
  imports: [
    TenantModule, // Global module - automatically available everywhere
    // ... other modules
  ],
})
export class AppModule {}
```

### 2. Use Tenant-Aware Database Queries

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getUsers() {
    // Automatically filtered by current tenant
    return this.prisma.tenantAware.user.findMany();
  }

  async createUser(data: CreateUserData) {
    // tenantId automatically added
    return this.prisma.tenantAware.user.create({ data });
  }
}
```

### 3. Use Decorators in Controllers

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { 
  TenantContext, 
  TenantId, 
  RequireTenant, 
  TenantGuard 
} from './modules/tenant';

@Controller('data')
@UseGuards(TenantGuard)
export class DataController {
  @Get()
  @RequireTenant()
  getData(
    @TenantContext() context: TenantContext,
    @TenantId() tenantId: string,
  ) {
    return { tenantId, context };
  }
}
```

### 4. Use Tenant-Scoped Caching

```typescript
import { Injectable } from '@nestjs/common';
import { TenantCacheService } from './modules/tenant';

@Injectable()
export class UserService {
  constructor(private cacheService: TenantCacheService) {}

  async getExpensiveData() {
    return this.cacheService.getOrSet(
      'expensive-data',
      () => this.computeExpensiveData(),
      { ttl: 300 } // 5 minutes
    );
  }
}
```

## API Endpoints

### Tenant Management

#### Admin Endpoints (Bypass Tenant Isolation)
- `POST /tenants` - Create new tenant
- `GET /tenants` - Get all tenants
- `GET /tenants/admin/:tenantId` - Get tenant by ID
- `PUT /tenants/admin/:tenantId` - Update tenant
- `DELETE /tenants/admin/:tenantId` - Delete tenant
- `POST /tenants/admin/bulk-update` - Bulk update tenants

#### Tenant-Scoped Endpoints
- `GET /tenants/current` - Get current tenant details
- `PUT /tenants/current` - Update current tenant
- `GET /tenants/users` - Get users in current tenant
- `GET /tenants/stats` - Get current tenant statistics

#### Public Endpoints
- `GET /tenants/by-domain/:domain` - Get tenant by domain

### Cache Management

#### Tenant-Scoped Cache
- `GET /tenants/cache/stats` - Get cache statistics
- `GET /tenants/cache/keys` - Get cache keys
- `GET /tenants/cache/:key` - Get cached value
- `POST /tenants/cache` - Set cached value
- `DELETE /tenants/cache/:key` - Delete cached value
- `DELETE /tenants/cache` - Clear tenant cache

#### Admin Cache Endpoints
- `GET /tenants/admin/cache/stats` - Global cache statistics
- `DELETE /tenants/admin/cache` - Clear all cache
- `POST /tenants/admin/cache/cleanup` - Cleanup expired entries

## Decorators

### @TenantContext()
Inject tenant context into method parameters:

```typescript
@Get()
getData(
  @TenantContext() context: TenantContext,           // Full context
  @TenantContext('tenantId') tenantId: string,       // Just tenant ID
  @TenantContext('permissions') permissions: string[], // Just permissions
) {}
```

### @TenantId()
Inject only the tenant ID:

```typescript
@Get()
getData(@TenantId() tenantId: string) {}
```

### @RequireTenant()
Mark routes that require tenant context:

```typescript
@RequireTenant()
@Get('data')
getData() {} // Will fail if no tenant context
```

### @BypassTenant()
Mark admin routes that bypass tenant isolation:

```typescript
@BypassTenant()
@Get('admin/all-data')
getAllData() {} // Access all data across tenants
```

### @RequirePermission()
Require specific permissions within tenant:

```typescript
@RequirePermission('admin', 'user:write')
@Post('users')
createUser() {} // Requires admin OR user:write permission
```

## Services

### TenantService
Complete CRUD operations for tenant management:

```typescript
// Admin operations (bypass isolation)
await tenantService.createTenant(data);
await tenantService.getAllTenants();
await tenantService.updateTenant(id, data);

// Tenant-scoped operations
await tenantService.getCurrentTenant();
await tenantService.updateCurrentTenant(data);
await tenantService.getTenantUsers();
```

### TenantContextService
Access tenant context from anywhere:

```typescript
const tenantId = TenantContextService.getTenantId();
const userId = TenantContextService.getUserId();
const permissions = TenantContextService.getPermissions();
const hasPermission = TenantContextService.hasPermission('admin');
```

### TenantCacheService
Tenant-scoped caching with automatic isolation:

```typescript
// Basic operations
await cacheService.set(key, value, { ttl: 300 });
const value = await cacheService.get(key);
await cacheService.del(key);

// Advanced operations
await cacheService.getOrSet(key, factory, options);
await cacheService.clearTenant(); // Clear current tenant's cache
const stats = await cacheService.getStats();

// Memoization decorator
@TenantCached({ ttl: 300 })
async expensiveMethod() {
  return await this.computeExpensiveData();
}
```

## Prisma Extension Helpers

### Manual Tenant Operations

```typescript
import { 
  withoutTenantIsolation, 
  withTenantContext,
  validateTenantAccess 
} from './modules/tenant';

// Bypass tenant isolation (admin operations)
const allUsers = await withoutTenantIsolation(() => {
  return prisma.user.findMany();
});

// Run with specific tenant context
const tenantData = await withTenantContext('tenant-id', () => {
  return prisma.tenantAware.user.findMany();
});

// Validate tenant access
const isValid = validateTenantAccess(record, requiredTenantId);
```

## Tenant Context Sources

The middleware extracts tenant context from multiple sources (in order of priority):

1. **JWT Token** - `tenantId` field in JWT payload
2. **Request Headers** - `x-tenant-id` header
3. **Query Parameters** - `tenantId` query parameter
4. **Subdomain** - For subdomain-based tenancy
5. **Request Body** - `tenantId` in request body
6. **Route Parameters** - `tenantId` route parameter

## Error Handling

The module provides comprehensive error handling:

- **Missing Tenant Context** → `ForbiddenException`
- **Insufficient Permissions** → `ForbiddenException`
- **Invalid Tenant Access** → Automatic filtering prevents access
- **Cache Isolation Violations** → Logged warnings + null return

## Security Features

- **Automatic Tenant Isolation** - All queries filtered by tenant
- **Context Validation** - Prevents cross-tenant data access
- **Permission-Based Access** - Fine-grained permissions within tenants
- **Cache Isolation** - Tenant-scoped cache keys
- **Admin Bypass Controls** - Explicit decorators for admin operations

## Performance Considerations

- **AsyncLocalStorage** - Minimal performance overhead
- **Automatic Filtering** - No manual tenant filtering needed
- **Efficient Caching** - In-memory cache with TTL
- **Cleanup Tasks** - Automatic expired entry removal

## Environment Variables

No additional environment variables required. The module works with existing JWT and database configurations.

## Testing

```typescript
import { TenantContextService } from './modules/tenant';

describe('Tenant Operations', () => {
  it('should filter by tenant', async () => {
    await TenantContextService.run({ tenantId: 'test-tenant' }, async () => {
      const data = await service.getData();
      expect(data).toHaveLength(2); // Only test-tenant data
    });
  });
});
```

## Migration Guide

### From Manual Tenant Filtering

```typescript
// Before
async getUsers(tenantId: string) {
  return prisma.user.findMany({
    where: { tenantId }
  });
}

// After
async getUsers() {
  return prisma.tenantAware.user.findMany(); // tenantId automatic
}
```

### From Context Parameters

```typescript
// Before
async processData(tenantId: string, userId: string) {
  // Manual context passing
}

// After
async processData() {
  const tenantId = TenantContextService.getTenantId();
  const userId = TenantContextService.getUserId();
}
```

## Best Practices

1. **Use `tenantAware` client** for all tenant-specific queries
2. **Use `@RequireTenant()`** on tenant-specific routes
3. **Use `@BypassTenant()`** only for admin operations
4. **Validate tenant access** for sensitive operations
5. **Use tenant-scoped caching** for performance
6. **Test with multiple tenants** to ensure isolation

## Troubleshooting

### Common Issues

1. **No tenant context available**
   - Ensure JWT token includes `tenantId`
   - Check middleware configuration
   - Verify request headers

2. **Cross-tenant data access**
   - Check for `@BypassTenant()` usage
   - Verify Prisma extension configuration
   - Review manual queries

3. **Cache isolation issues**
   - Check cache key generation
   - Verify tenant context during cache operations
   - Review global cache usage

The multi-tenant module provides a complete, production-ready solution for building multi-tenant applications with automatic tenant isolation and comprehensive security features.