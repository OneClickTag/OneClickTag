import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateLandingPageContentDto, UpdateLandingPageContentDto } from '../dto/landing-page.dto';

@Injectable()
export class LandingPageService {
  constructor(private prisma: PrismaService) {}

  async findAll(active?: boolean) {
    const where = active !== undefined ? { isActive: active } : {};

    const sections = await this.prisma.landingPageContent.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return sections;
  }

  async findOne(id: string) {
    const section = await this.prisma.landingPageContent.findUnique({
      where: { id },
    });

    if (!section) {
      throw new NotFoundException(`Landing page section with ID ${id} not found`);
    }

    return section;
  }

  async findByKey(key: string) {
    const section = await this.prisma.landingPageContent.findUnique({
      where: { key },
    });

    if (!section) {
      throw new NotFoundException(`Landing page section with key "${key}" not found`);
    }

    if (!section.isActive) {
      throw new NotFoundException(`Landing page section with key "${key}" is not active`);
    }

    return section;
  }

  async create(createLandingPageContentDto: CreateLandingPageContentDto, userId?: string) {
    // Check if key already exists
    const existing = await this.prisma.landingPageContent.findUnique({
      where: { key: createLandingPageContentDto.key },
    });

    if (existing) {
      throw new BadRequestException(`Landing page section with key "${createLandingPageContentDto.key}" already exists`);
    }

    const section = await this.prisma.landingPageContent.create({
      data: {
        ...createLandingPageContentDto,
        updatedBy: userId,
      },
    });

    return section;
  }

  async update(id: string, updateLandingPageContentDto: UpdateLandingPageContentDto, userId?: string) {
    const section = await this.prisma.landingPageContent.findUnique({ where: { id } });

    if (!section) {
      throw new NotFoundException(`Landing page section with ID ${id} not found`);
    }

    // Check if key is being changed and if it's already taken
    if (updateLandingPageContentDto.key && updateLandingPageContentDto.key !== section.key) {
      const existing = await this.prisma.landingPageContent.findUnique({
        where: { key: updateLandingPageContentDto.key },
      });

      if (existing) {
        throw new BadRequestException(`Landing page section with key "${updateLandingPageContentDto.key}" already exists`);
      }
    }

    const updatedSection = await this.prisma.landingPageContent.update({
      where: { id },
      data: {
        ...updateLandingPageContentDto,
        updatedBy: userId,
      },
    });

    return updatedSection;
  }

  async toggleActive(id: string, isActive: boolean) {
    const section = await this.prisma.landingPageContent.findUnique({ where: { id } });

    if (!section) {
      throw new NotFoundException(`Landing page section with ID ${id} not found`);
    }

    const updatedSection = await this.prisma.landingPageContent.update({
      where: { id },
      data: { isActive },
    });

    return updatedSection;
  }

  async delete(id: string) {
    const section = await this.prisma.landingPageContent.findUnique({ where: { id } });

    if (!section) {
      throw new NotFoundException(`Landing page section with ID ${id} not found`);
    }

    await this.prisma.landingPageContent.delete({ where: { id } });

    return { message: 'Landing page section deleted successfully' };
  }
}
