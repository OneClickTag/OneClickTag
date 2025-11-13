import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TenantContextService } from '../services/tenant-context.service';
import { TenantContextData } from '../interfaces/tenant-context.interface';

// Remove duplicate declaration - already defined in auth middleware

@Injectable()
export class TenantIsolationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantIsolationMiddleware.name);

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantContext = await this.extractTenantContext(req);

      if (tenantContext) {
        // Set tenant context in request for backwards compatibility
        req.tenantContext = tenantContext;

        // Use AsyncLocalStorage to automatically provide tenant context
        // to all downstream operations
        return TenantContextService.runAsync(tenantContext, async () => {
          next();
        });
      } else {
        // No tenant context available - continue without isolation
        // This allows public routes and admin operations to work
        next();
      }
    } catch (error) {
      this.logger.error('Failed to extract tenant context:', error);
      // Don't fail the request - continue without tenant context
      next();
    }
  }

  private async extractTenantContext(req: Request): Promise<any | null> {
    let tenantId: string | null = null;
    let userId: string | null = null;
    let permissions: string[] = [];

    // 1. Try to extract from JWT token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = this.jwtService.decode(token) as any;
        if (payload && payload.sub && payload.tenantId) {
          tenantId = payload.tenantId;
          userId = payload.sub;
          permissions = payload.permissions || [];
        }
      } catch (error) {
        this.logger.debug('Failed to decode JWT token for tenant context');
      }
    }

    // 2. Try from request headers (x-tenant-id)
    if (!tenantId) {
      const headerTenantId = req.headers['x-tenant-id'] as string;
      if (headerTenantId) {
        tenantId = headerTenantId;
      }
    }

    // 3. Try from query parameters
    if (!tenantId) {
      const queryTenantId = req.query.tenantId as string;
      if (queryTenantId) {
        tenantId = queryTenantId;
      }
    }

    // 4. Try from subdomain (if using subdomain-based tenancy)
    if (!tenantId) {
      const host = req.headers.host;
      if (host) {
        const subdomain = host.split('.')[0];
        if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
          // In a real implementation, you'd resolve subdomain to tenantId
          // For now, we'll use subdomain as tenantId if it's not a special subdomain
          tenantId = subdomain;
        }
      }
    }

    // 5. Try from request body (for specific endpoints)
    if (!tenantId && req.body && req.body.tenantId) {
      tenantId = req.body.tenantId;
    }

    // 6. Try from route parameters
    if (!tenantId && req.params && req.params.tenantId) {
      tenantId = req.params.tenantId;
    }

    if (!tenantId) {
      return null;
    }

    // Fetch tenant details for full context
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, domain: true, isActive: true },
    });

    if (!tenant) {
      return null;
    }

    return {
      tenantId,
      userId: userId || undefined,
      permissions,
      tenant,
    };
  }
}

// Helper middleware for routes that require tenant context
@Injectable()
export class RequireTenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequireTenantMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const tenantContext = TenantContextService.getCurrentContext();
    
    if (!tenantContext || !tenantContext.tenantId) {
      return res.status(400).json({
        error: 'Tenant context required',
        message: 'This endpoint requires a valid tenant context. Please provide tenantId in headers, query parameters, or JWT token.',
      });
    }

    next();
  }
}

// Helper middleware for admin routes that bypass tenant isolation
@Injectable()
export class BypassTenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(BypassTenantMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Clear tenant context for admin operations
    TenantContextService.run({} as any, () => {
      next();
    });
  }
}