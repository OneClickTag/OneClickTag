import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface RequestTenantContext {
  tenantId: string;
  tenant: {
    id: string;
    name: string;
    domain: string;
    isActive: boolean;
  };
}

// Alias for backward compatibility
export type TenantContext = RequestTenantContext;

declare global {
  namespace Express {
    interface Request {
      tenantContext?: RequestTenantContext;
    }
  }
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Try to extract tenant from multiple sources
      let tenantId: string | null = null;

      // 1. First try from JWT token
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const payload = this.jwtService.decode(token) as any;
          tenantId = payload?.tenantId;
        } catch {
          // Ignore JWT decode errors in middleware
        }
      }

      // 2. Try from request headers (x-tenant-id)
      if (!tenantId) {
        tenantId = req.headers['x-tenant-id'] as string;
      }

      // 3. Try from query parameters
      if (!tenantId) {
        tenantId = req.query.tenantId as string;
      }

      // 4. Try from subdomain (if using subdomain-based tenancy)
      if (!tenantId) {
        const host = req.headers.host;
        if (host) {
          const subdomain = host.split('.')[0];
          if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
            const tenant = await this.prisma.tenant.findUnique({
              where: { domain: subdomain },
              select: { id: true, name: true, domain: true, isActive: true },
            });
            if (tenant) {
              tenantId = tenant.id;
            }
          }
        }
      }

      // If tenantId found, fetch tenant details and set context
      if (tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { id: true, name: true, domain: true, isActive: true },
        });

        if (tenant) {
          req.tenantContext = {
            tenantId: tenant.id,
            tenant,
          };
        }
      }

      next();
    } catch (error) {
      // Don't fail the request if tenant context setup fails
      // Just log the error and continue
      console.warn('Tenant context middleware error:', error.message);
      next();
    }
  }
}