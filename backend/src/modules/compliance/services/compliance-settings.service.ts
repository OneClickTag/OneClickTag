import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateComplianceSettingsDto } from '../dto/create-compliance-settings.dto';
import { UpdateComplianceSettingsDto } from '../dto/update-compliance-settings.dto';

@Injectable()
export class ComplianceSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find compliance settings by tenant ID
   * Returns null if not found (for initial check)
   */
  async findByTenant(tenantId: string) {
    return this.prisma.complianceSettings.findUnique({
      where: { tenantId },
    });
  }

  /**
   * Create or update compliance settings for a tenant
   * Uses upsert to handle both create and update cases
   */
  async createOrUpdate(
    tenantId: string,
    dto: CreateComplianceSettingsDto | UpdateComplianceSettingsDto,
    userId: string,
  ) {
    return this.prisma.complianceSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...dto,
        createdBy: userId,
        updatedBy: userId,
      },
      update: {
        ...dto,
        updatedBy: userId,
      },
    });
  }
}
