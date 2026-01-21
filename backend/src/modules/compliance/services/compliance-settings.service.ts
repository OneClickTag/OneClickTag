import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
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
    const existing = await this.findByTenant(tenantId);

    if (existing) {
      return this.prisma.complianceSettings.update({
        where: { tenantId },
        data: {
          companyName: dto.companyName,
          companyAddress: dto.companyAddress,
          companyPhone: dto.companyPhone,
          companyEmail: dto.companyEmail,
          dpoName: dto.dpoName,
          dpoEmail: dto.dpoEmail,
          dpoPhone: dto.dpoPhone,
          ccpaTollFreeNumber: dto.ccpaTollFreeNumber,
          apiContactEmail: dto.apiContactEmail,
          privacyContactEmail: dto.privacyContactEmail,
          updatedBy: userId,
        },
      });
    }

    return this.prisma.complianceSettings.create({
      data: {
        tenantId,
        companyName: dto.companyName,
        companyAddress: dto.companyAddress,
        companyPhone: dto.companyPhone,
        companyEmail: dto.companyEmail,
        dpoName: dto.dpoName,
        dpoEmail: dto.dpoEmail,
        dpoPhone: dto.dpoPhone,
        ccpaTollFreeNumber: dto.ccpaTollFreeNumber,
        apiContactEmail: dto.apiContactEmail,
        privacyContactEmail: dto.privacyContactEmail,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }
}
