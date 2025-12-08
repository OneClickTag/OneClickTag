import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateSiteSettingsDto, UpdateSiteSettingsDto } from '../dto/site-settings.dto';

@Injectable()
export class SiteSettingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const settings = await this.prisma.siteSettings.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return settings;
  }

  async findOne(id: string) {
    const setting = await this.prisma.siteSettings.findUnique({
      where: { id },
    });

    if (!setting) {
      throw new NotFoundException(`Site setting with ID ${id} not found`);
    }

    return setting;
  }

  async findByKey(key: string) {
    const setting = await this.prisma.siteSettings.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException(`Site setting with key "${key}" not found`);
    }

    return setting;
  }

  async create(createSiteSettingsDto: CreateSiteSettingsDto, userId?: string) {
    // Check if key already exists
    const existing = await this.prisma.siteSettings.findUnique({
      where: { key: createSiteSettingsDto.key },
    });

    if (existing) {
      throw new BadRequestException(`Site setting with key "${createSiteSettingsDto.key}" already exists`);
    }

    const setting = await this.prisma.siteSettings.create({
      data: {
        ...createSiteSettingsDto,
        updatedBy: userId,
      },
    });

    return setting;
  }

  async update(id: string, updateSiteSettingsDto: UpdateSiteSettingsDto, userId?: string) {
    const setting = await this.prisma.siteSettings.findUnique({ where: { id } });

    if (!setting) {
      throw new NotFoundException(`Site setting with ID ${id} not found`);
    }

    // Check if key is being changed and if it's already taken
    if (updateSiteSettingsDto.key && updateSiteSettingsDto.key !== setting.key) {
      const existing = await this.prisma.siteSettings.findUnique({
        where: { key: updateSiteSettingsDto.key },
      });

      if (existing) {
        throw new BadRequestException(`Site setting with key "${updateSiteSettingsDto.key}" already exists`);
      }
    }

    const updatedSetting = await this.prisma.siteSettings.update({
      where: { id },
      data: {
        ...updateSiteSettingsDto,
        updatedBy: userId,
      },
    });

    return updatedSetting;
  }

  async delete(id: string) {
    const setting = await this.prisma.siteSettings.findUnique({ where: { id } });

    if (!setting) {
      throw new NotFoundException(`Site setting with ID ${id} not found`);
    }

    await this.prisma.siteSettings.delete({ where: { id } });

    return { message: 'Site setting deleted successfully' };
  }

  // Helper method to get or create the global settings
  async getGlobalSettings() {
    let settings = await this.prisma.siteSettings.findUnique({
      where: { key: 'global' },
    });

    if (!settings) {
      // Create default global settings if they don't exist
      settings = await this.prisma.siteSettings.create({
        data: {
          key: 'global',
          brandName: 'OneClickTag',
        },
      });
    }

    return settings;
  }

  async updateGlobalSettings(updateSiteSettingsDto: UpdateSiteSettingsDto, userId?: string) {
    const settings = await this.getGlobalSettings();

    const updatedSettings = await this.prisma.siteSettings.update({
      where: { id: settings.id },
      data: {
        ...updateSiteSettingsDto,
        key: 'global', // Ensure key stays as 'global'
        updatedBy: userId,
      },
    });

    return updatedSettings;
  }
}
