import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TenantContextService } from './tenant-context.service';
import { withoutTenantIsolation, withTenantContext } from '../extensions/prisma-tenant.extension';

export interface CreateTenantData {
  name: string;
  domain: string;
  settings?: any;
  isActive?: boolean;
}

export interface UpdateTenantData {
  name?: string;
  domain?: string;
  settings?: any;
  isActive?: boolean;
}

export interface TenantWithStats {
  id: string;
  name: string;
  domain: string;
  settings: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    users: number;
    oauthTokens: number;
  };
}

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  // Admin operations (bypass tenant isolation)
  async createTenant(data: CreateTenantData): Promise<any> {
    return withoutTenantIsolation(async () => {
      // Check if domain is already taken
      const existingTenant = await this.prisma.tenant.findUnique({
        where: { domain: data.domain },
      });

      if (existingTenant) {
        throw new ConflictException(`Domain "${data.domain}" is already taken`);
      }

      return this.prisma.tenant.create({
        data: {
          name: data.name,
          domain: data.domain,
          settings: data.settings || {},
          isActive: data.isActive ?? true,
        },
        include: {
          _count: {
            select: {
              users: true,
              oauthTokens: true,
            },
          },
        },
      });
    });
  }

  async getAllTenants(includeInactive = false): Promise<TenantWithStats[]> {
    return withoutTenantIsolation(async () => {
      return this.prisma.tenant.findMany({
        where: includeInactive ? {} : { isActive: true },
        include: {
          _count: {
            select: {
              users: true,
              oauthTokens: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  async getTenantById(tenantId: string): Promise<TenantWithStats> {
    return withoutTenantIsolation(async () => {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          _count: {
            select: {
              users: true,
              oauthTokens: true,
            },
          },
        },
      });

      if (!tenant) {
        throw new NotFoundException(`Tenant with ID "${tenantId}" not found`);
      }

      return tenant;
    });
  }

  async getTenantByDomain(domain: string): Promise<any> {
    return withoutTenantIsolation(async () => {
      const tenant = await this.prisma.tenant.findUnique({
        where: { domain },
        include: {
          _count: {
            select: {
              users: true,
              oauthTokens: true,
            },
          },
        },
      });

      if (!tenant) {
        throw new NotFoundException(`Tenant with domain "${domain}" not found`);
      }

      return tenant;
    });
  }

  async updateTenant(tenantId: string, data: UpdateTenantData): Promise<any> {
    return withoutTenantIsolation(async () => {
      // Check if domain is being changed and is already taken
      if (data.domain) {
        const existingTenant = await this.prisma.tenant.findFirst({
          where: {
            domain: data.domain,
            NOT: { id: tenantId },
          },
        });

        if (existingTenant) {
          throw new ConflictException(`Domain "${data.domain}" is already taken`);
        }
      }

      try {
        return await this.prisma.tenant.update({
          where: { id: tenantId },
          data,
          include: {
            _count: {
              select: {
                users: true,
                oauthTokens: true,
              },
            },
          },
        });
      } catch (error) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Tenant with ID "${tenantId}" not found`);
        }
        throw error;
      }
    });
  }

  async deleteTenant(tenantId: string): Promise<any> {
    return withoutTenantIsolation(async () => {
      try {
        return await this.prisma.tenant.delete({
          where: { id: tenantId },
        });
      } catch (error) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Tenant with ID "${tenantId}" not found`);
        }
        throw error;
      }
    });
  }

  async deactivateTenant(tenantId: string): Promise<any> {
    return this.updateTenant(tenantId, { isActive: false });
  }

  async activateTenant(tenantId: string): Promise<any> {
    return this.updateTenant(tenantId, { isActive: true });
  }

  // Tenant-scoped operations (use current tenant context)
  async getCurrentTenant(): Promise<any> {
    const tenantId = TenantContextService.getTenantId();
    
    if (!tenantId) {
      throw new ForbiddenException('No tenant context available');
    }

    return this.getTenantById(tenantId);
  }

  async updateCurrentTenant(data: UpdateTenantData): Promise<any> {
    const tenantId = TenantContextService.getTenantId();
    
    if (!tenantId) {
      throw new ForbiddenException('No tenant context available');
    }

    // Prevent tenants from deactivating themselves
    if (data.isActive === false) {
      throw new ForbiddenException('Tenants cannot deactivate themselves');
    }

    return this.updateTenant(tenantId, data);
  }

  async getTenantUsers(tenantId?: string): Promise<any[]> {
    const targetTenantId = tenantId || TenantContextService.getTenantId();
    
    if (!targetTenantId) {
      throw new ForbiddenException('No tenant context available');
    }

    return withTenantContext(targetTenantId, async () => {
      return this.prisma.tenantAware.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  async getTenantStats(tenantId?: string): Promise<any> {
    const targetTenantId = tenantId || TenantContextService.getTenantId();
    
    if (!targetTenantId) {
      throw new ForbiddenException('No tenant context available');
    }

    return withTenantContext(targetTenantId, async () => {
      const [userCount, oauthTokenCount] = await Promise.all([
        this.prisma.tenantAware.user.count(),
        this.prisma.tenantAware.oAuthToken.count(),
      ]);

      return {
        tenantId: targetTenantId,
        userCount,
        oauthTokenCount,
        lastUpdated: new Date(),
      };
    });
  }

  // Utility methods
  async validateTenantAccess(tenantId: string): Promise<boolean> {
    const currentTenantId = TenantContextService.getTenantId();
    
    if (!currentTenantId) {
      return false;
    }

    return currentTenantId === tenantId;
  }

  async switchTenantContext<T>(tenantId: string, callback: () => Promise<T>): Promise<T> {
    // Verify tenant exists and is active
    const tenant = await this.getTenantById(tenantId);
    
    if (!tenant.isActive) {
      throw new ForbiddenException(`Tenant "${tenantId}" is inactive`);
    }

    return withTenantContext(tenantId, callback);
  }

  // Batch operations for admin use
  async bulkUpdateTenants(updates: Array<{ id: string; data: UpdateTenantData }>): Promise<any[]> {
    return withoutTenantIsolation(async () => {
      const results = [];
      
      for (const update of updates) {
        try {
          const result = await this.updateTenant(update.id, update.data);
          results.push({ success: true, tenantId: update.id, result });
        } catch (error) {
          results.push({ 
            success: false, 
            tenantId: update.id, 
            error: error.message 
          });
        }
      }
      
      return results;
    });
  }

  async getTenantsByStatus(isActive: boolean): Promise<any[]> {
    return withoutTenantIsolation(async () => {
      return this.prisma.tenant.findMany({
        where: { isActive },
        include: {
          _count: {
            select: {
              users: true,
              oauthTokens: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  }
}