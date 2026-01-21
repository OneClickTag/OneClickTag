import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateDataRequestDto } from '../dto/create-data-request.dto';
import { UpdateDataRequestDto } from '../dto/update-data-request.dto';
import { RequestStatus, Prisma } from '@prisma/client';

@Injectable()
export class DataRequestService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all data access requests for a tenant
   * Supports pagination and filtering
   */
  async findAll(
    tenantId: string,
    options?: {
      skip?: number;
      take?: number;
      status?: RequestStatus;
      email?: string;
    },
  ) {
    const { skip = 0, take = 50, status, email } = options || {};

    const where = {
      tenantId,
      ...(status && { status }),
      ...(email && { email: { contains: email, mode: 'insensitive' as const } }),
    };

    const [requests, total] = await Promise.all([
      this.prisma.dataAccessRequest.findMany({
        where,
        skip,
        take,
        orderBy: {
          requestedAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          assignedToUser: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.dataAccessRequest.count({ where }),
    ]);

    return {
      requests,
      total,
      skip,
      take,
    };
  }

  /**
   * Find data access request by ID
   * Ensures multi-tenant isolation
   */
  async findById(id: string, tenantId: string) {
    const request = await this.prisma.dataAccessRequest.findFirst({
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
        assignedToUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Data request with ID ${id} not found`);
    }

    return request;
  }

  /**
   * Create a new data access request
   * Automatically calculates due date (30 days from now per GDPR)
   */
  async create(tenantId: string, dto: CreateDataRequestDto, userId?: string) {
    // Calculate due date (30 days from now - GDPR requirement)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    return this.prisma.dataAccessRequest.create({
      data: {
        tenantId,
        userId: userId || null,
        requestType: dto.requestType,
        email: dto.email,
        description: dto.description,
        dueDate,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Update a data access request
   * Ensures multi-tenant isolation
   */
  async update(id: string, tenantId: string, dto: UpdateDataRequestDto) {
    // Verify request exists and belongs to tenant
    await this.findById(id, tenantId);

    // If status is being set to COMPLETED, set completedAt timestamp
    const updateData: Prisma.DataAccessRequestUpdateInput = { ...dto };
    if (dto.status === RequestStatus.COMPLETED && !updateData.completedAt) {
      updateData.completedAt = new Date();
    }

    return this.prisma.dataAccessRequest.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        assignedToUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Delete a data access request
   * Ensures multi-tenant isolation
   */
  async delete(id: string, tenantId: string) {
    // Verify request exists and belongs to tenant
    await this.findById(id, tenantId);

    return this.prisma.dataAccessRequest.delete({
      where: { id },
    });
  }

  /**
   * Export all user data (GDPR Article 20 - Right to Data Portability)
   * Returns complete user data in JSON format
   */
  async exportUserData(userId: string, tenantId: string) {
    // Fetch all user-related data
    const [user, consents, dataRequests, auditLogs] = await Promise.all([
      // User profile
      this.prisma.user.findFirst({
        where: { id: userId, tenantId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      // Cookie consents
      this.prisma.userCookieConsent.findMany({
        where: { userId, tenantId },
      }),
      // Data access requests
      this.prisma.dataAccessRequest.findMany({
        where: { userId, tenantId },
      }),
      // API audit logs (limited to last 90 days for privacy)
      this.prisma.apiAuditLog.findMany({
        where: {
          userId,
          tenantId,
          createdAt: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days
          },
        },
        select: {
          id: true,
          apiService: true,
          endpoint: true,
          httpMethod: true,
          responseStatus: true,
          createdAt: true,
          // Exclude sensitive payload data
        },
      }),
    ]);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Compile complete data export
    return {
      exportedAt: new Date().toISOString(),
      userData: {
        profile: user,
        cookieConsents: consents,
        dataAccessRequests: dataRequests,
        apiActivityLogs: auditLogs,
      },
    };
  }
}
