import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateFooterContentDto, UpdateFooterContentDto } from '../dto/footer.dto';

@Injectable()
export class FooterService {
  constructor(private prisma: PrismaService) {}

  async findAll(active?: boolean) {
    const where = active !== undefined ? { isActive: active } : {};

    const footers = await this.prisma.footerContent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return footers;
  }

  async findActive() {
    const footer = await this.prisma.footerContent.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    // If no active footer exists, return default footer (the one with id='default')
    if (!footer) {
      const defaultFooter = await this.prisma.footerContent.findUnique({
        where: { id: 'default' },
      });

      if (defaultFooter) {
        return defaultFooter;
      }

      throw new NotFoundException('No active footer content found');
    }

    return footer;
  }

  async findOne(id: string) {
    const footer = await this.prisma.footerContent.findUnique({
      where: { id },
    });

    if (!footer) {
      throw new NotFoundException(`Footer content with ID ${id} not found`);
    }

    return footer;
  }

  async create(createFooterContentDto: CreateFooterContentDto, userId?: string) {
    // If setting as active, deactivate all other footers
    if (createFooterContentDto.isActive) {
      await this.prisma.footerContent.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const footer = await this.prisma.footerContent.create({
      data: {
        ...createFooterContentDto,
        socialLinks: createFooterContentDto.socialLinks as any,
        sections: createFooterContentDto.sections as any,
        updatedBy: userId,
      },
    });

    return footer;
  }

  async update(id: string, updateFooterContentDto: UpdateFooterContentDto, userId?: string) {
    const footer = await this.prisma.footerContent.findUnique({ where: { id } });

    if (!footer) {
      throw new NotFoundException(`Footer content with ID ${id} not found`);
    }

    // If setting as active, deactivate all other footers
    if (updateFooterContentDto.isActive && !footer.isActive) {
      await this.prisma.footerContent.updateMany({
        where: {
          isActive: true,
          id: { not: id }
        },
        data: { isActive: false },
      });
    }

    const updatedFooter = await this.prisma.footerContent.update({
      where: { id },
      data: {
        ...updateFooterContentDto,
        socialLinks: updateFooterContentDto.socialLinks as any,
        sections: updateFooterContentDto.sections as any,
        updatedBy: userId,
      },
    });

    return updatedFooter;
  }

  async toggleActive(id: string, isActive: boolean) {
    const footer = await this.prisma.footerContent.findUnique({ where: { id } });

    if (!footer) {
      throw new NotFoundException(`Footer content with ID ${id} not found`);
    }

    // If activating this footer, deactivate all others
    if (isActive) {
      await this.prisma.footerContent.updateMany({
        where: {
          isActive: true,
          id: { not: id }
        },
        data: { isActive: false },
      });
    }

    const updatedFooter = await this.prisma.footerContent.update({
      where: { id },
      data: { isActive },
    });

    return updatedFooter;
  }

  async delete(id: string) {
    const footer = await this.prisma.footerContent.findUnique({ where: { id } });

    if (!footer) {
      throw new NotFoundException(`Footer content with ID ${id} not found`);
    }

    // Don't allow deletion of the default footer
    if (id === 'default') {
      throw new BadRequestException('Cannot delete the default footer');
    }

    await this.prisma.footerContent.delete({
      where: { id },
    });

    return { message: 'Footer content deleted successfully' };
  }
}
