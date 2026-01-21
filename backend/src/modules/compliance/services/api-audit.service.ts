import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateAuditLogInput {
  tenantId: string;
  userId?: string;
  customerId?: string;
  apiService: string;
  endpoint: string;
  httpMethod: string;
  requestPayload?: any;
  responseStatus: number;
  responseBody?: any;
  errorMessage?: string;
  durationMs?: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilters {
  skip?: number;
  take?: number;
  userId?: string;
  customerId?: string;
  apiService?: string;
  httpMethod?: string;
  minStatus?: number; // e.g., 400 for errors
  maxStatus?: number; // e.g., 499 for client errors
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class ApiAuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an API call for compliance audit trail
   * Automatically sanitizes sensitive data
   */
  async log(input: CreateAuditLogInput) {
    // Sanitize payloads before storing
    const sanitizedRequest = input.requestPayload
      ? this.sanitizePayload(input.requestPayload)
      : null;
    const sanitizedResponse = input.responseBody
      ? this.sanitizePayload(input.responseBody)
      : null;

    return this.prisma.apiAuditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId || null,
        customerId: input.customerId || null,
        apiService: input.apiService,
        endpoint: input.endpoint,
        httpMethod: input.httpMethod,
        requestPayload: sanitizedRequest as Prisma.JsonValue,
        responseStatus: input.responseStatus,
        responseBody: sanitizedResponse as Prisma.JsonValue,
        errorMessage: input.errorMessage,
        durationMs: input.durationMs,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  /**
   * Find all audit logs for a tenant with filtering
   * Supports pagination and various filters
   */
  async findAll(tenantId: string, filters?: AuditLogFilters) {
    const {
      skip = 0,
      take = 50,
      userId,
      customerId,
      apiService,
      httpMethod,
      minStatus,
      maxStatus,
      startDate,
      endDate,
    } = filters || {};

    const where: Prisma.ApiAuditLogWhereInput = {
      tenantId,
      ...(userId && { userId }),
      ...(customerId && { customerId }),
      ...(apiService && { apiService }),
      ...(httpMethod && { httpMethod }),
      ...(minStatus &&
        maxStatus && {
          responseStatus: {
            gte: minStatus,
            lte: maxStatus,
          },
        }),
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
    };

    const [logs, total] = await Promise.all([
      this.prisma.apiAuditLog.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          customer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.apiAuditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      skip,
      take,
    };
  }

  /**
   * Find audit log by ID
   * Ensures multi-tenant isolation
   */
  async findById(id: string, tenantId: string) {
    const log = await this.prisma.apiAuditLog.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }

    return log;
  }

  /**
   * Sanitize payload to remove sensitive data
   * Removes OAuth tokens, passwords, and other secrets
   */
  sanitizePayload(payload: any): any {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }

    // Create a deep copy to avoid mutating original
    const sanitized = JSON.parse(JSON.stringify(payload));

    // List of sensitive field names to redact
    const sensitiveFields = [
      'password',
      'accessToken',
      'access_token',
      'refreshToken',
      'refresh_token',
      'token',
      'apiKey',
      'api_key',
      'secret',
      'clientSecret',
      'client_secret',
      'authorization',
      'auth',
      'credentials',
      'creditCard',
      'credit_card',
      'cvv',
      'ssn',
      'socialSecurity',
    ];

    // Recursive function to redact sensitive fields
    const redact = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(redact);
      }

      if (obj !== null && typeof obj === 'object') {
        const result: any = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            // Check if field name is sensitive
            const lowerKey = key.toLowerCase();
            const isSensitive = sensitiveFields.some((field) =>
              lowerKey.includes(field.toLowerCase()),
            );

            if (isSensitive) {
              result[key] = '[REDACTED]';
            } else {
              result[key] = redact(obj[key]);
            }
          }
        }
        return result;
      }

      return obj;
    };

    return redact(sanitized);
  }
}
