import { Prisma } from '@prisma/client';
import { TenantContextService } from '../services/tenant-context.service';

export type TenantAwareClient = ReturnType<typeof createTenantAwareClient>;

export function createTenantAwareClient(
  prisma: any,
  options: { bypassModels?: string[] } = {},
) {
  const { bypassModels = [] } = options;

  return prisma.$extends({
    name: 'tenant-isolation',
    query: {
      // Apply tenant filtering to all models except those in bypassModels
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Skip tenant filtering for bypass models
          if (bypassModels.includes(model)) {
            return query(args);
          }

          // Skip tenant filtering for certain models that don't have tenantId
          const nonTenantModels = ['Tenant']; // Add other non-tenant models here
          if (nonTenantModels.includes(model)) {
            return query(args);
          }

          const tenantId = TenantContextService.getTenantId();

          // For operations that don't require tenant context (like admin operations)
          // Allow bypass if no tenant context is available
          if (!tenantId) {
            console.warn(
              `No tenant context found for ${model}.${operation}. This might be an admin operation or require manual tenant specification.`,
            );
            return query(args);
          }

          // Apply tenant filtering based on operation type
          switch (operation) {
            case 'findFirst':
            case 'findUnique':
            case 'findMany':
            case 'count':
            case 'aggregate':
            case 'groupBy':
              return query({
                ...args,
                where: {
                  ...args.where,
                  tenantId,
                },
              });

            case 'create':
              return query({
                ...args,
                data: {
                  ...args.data,
                  tenantId,
                },
              });

            case 'createMany':
              // For createMany, ensure all records have tenantId
              const dataArray = Array.isArray(args.data) ? args.data : [args.data];
              return query({
                ...args,
                data: dataArray.map((item: any) => ({
                  ...item,
                  tenantId,
                })),
              });

            case 'update':
            case 'updateMany':
              return query({
                ...args,
                where: {
                  ...args.where,
                  tenantId,
                },
              });

            case 'upsert':
              return query({
                ...args,
                where: {
                  ...args.where,
                  tenantId,
                },
                create: {
                  ...args.create,
                  tenantId,
                },
                update: args.update, // Don't modify tenantId on update
              });

            case 'delete':
            case 'deleteMany':
              return query({
                ...args,
                where: {
                  ...args.where,
                  tenantId,
                },
              });

            default:
              // For unknown operations, apply tenant filtering to where clause if it exists
              if (args.where) {
                return query({
                  ...args,
                  where: {
                    ...args.where,
                    tenantId,
                  },
                });
              }
              return query(args);
          }
        },
      },
    },
    result: {
      // Add tenant validation to results
      $allModels: {
        tenantId: {
          needs: { tenantId: true },
          compute(model: any) {
            const currentTenantId = TenantContextService.getTenantId();
            
            // Validate that returned data belongs to current tenant
            if (currentTenantId && model.tenantId && model.tenantId !== currentTenantId) {
              console.warn(
                `Data integrity warning: Retrieved record with tenantId ${model.tenantId} while current context is ${currentTenantId}`,
              );
            }
            
            return model.tenantId;
          },
        },
      },
    },
  });
}

// Helper function to bypass tenant isolation for specific operations
export function withoutTenantIsolation<T>(callback: () => T): T {
  // Temporarily clear tenant context
  const originalContext = TenantContextService.getCurrentContext();
  
  try {
    // Run callback without tenant context
    return TenantContextService.run({} as any, callback);
  } finally {
    // Restore original context
    if (originalContext) {
      TenantContextService.run(originalContext, () => {});
    }
  }
}

// Helper function to run with specific tenant context
export function withTenantContext<T>(tenantId: string, callback: () => T): T {
  return TenantContextService.run({ tenantId }, callback);
}

// Type-safe helper for tenant-aware models
export interface TenantAwareModel {
  tenantId: string;
}

// Validation helper
export function validateTenantAccess(record: TenantAwareModel, requiredTenantId?: string): boolean {
  const tenantId = requiredTenantId || TenantContextService.getTenantId();
  
  if (!tenantId) {
    throw new Error('No tenant context available for validation');
  }
  
  return record.tenantId === tenantId;
}