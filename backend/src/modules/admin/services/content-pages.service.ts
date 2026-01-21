import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateContentPageDto, UpdateContentPageDto } from '../dto/content-page.dto';

@Injectable()
export class ContentPagesService {
  constructor(private prisma: PrismaService) {}

  async findAll(published?: boolean) {
    const where = published !== undefined ? { isPublished: published } : {};

    const pages = await this.prisma.contentPage.findMany({
      where,
      orderBy: { order: 'asc' },
    });

    return pages;
  }

  async findOne(id: string) {
    const page = await this.prisma.contentPage.findUnique({
      where: { id },
    });

    if (!page) {
      throw new NotFoundException(`Content page with ID ${id} not found`);
    }

    return page;
  }

  async findBySlug(slug: string) {
    const page = await this.prisma.contentPage.findUnique({
      where: { slug },
    });

    if (!page) {
      throw new NotFoundException(`Content page with slug "${slug}" not found`);
    }

    if (!page.isPublished) {
      throw new NotFoundException(`Content page with slug "${slug}" is not published`);
    }

    return page;
  }

  async create(createContentPageDto: CreateContentPageDto, userId?: string) {
    // Check if slug already exists
    const existing = await this.prisma.contentPage.findUnique({
      where: { slug: createContentPageDto.slug },
    });

    if (existing) {
      throw new BadRequestException(`Content page with slug "${createContentPageDto.slug}" already exists`);
    }

    const page = await this.prisma.contentPage.create({
      data: {
        ...createContentPageDto,
        createdBy: userId,
      },
    });

    return page;
  }

  async update(id: string, updateContentPageDto: UpdateContentPageDto, userId?: string) {
    const page = await this.prisma.contentPage.findUnique({ where: { id } });

    if (!page) {
      throw new NotFoundException(`Content page with ID ${id} not found`);
    }

    // Check if slug is being changed and if it's already taken
    if (updateContentPageDto.slug && updateContentPageDto.slug !== page.slug) {
      const existing = await this.prisma.contentPage.findUnique({
        where: { slug: updateContentPageDto.slug },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException(`Content page with slug "${updateContentPageDto.slug}" already exists`);
      }
    }

    const updatedPage = await this.prisma.contentPage.update({
      where: { id },
      data: {
        ...updateContentPageDto,
        updatedBy: userId,
      },
    });

    return updatedPage;
  }

  async publish(id: string, isPublished: boolean) {
    const page = await this.prisma.contentPage.findUnique({ where: { id } });

    if (!page) {
      throw new NotFoundException(`Content page with ID ${id} not found`);
    }

    const updatedPage = await this.prisma.contentPage.update({
      where: { id },
      data: { isPublished },
    });

    return updatedPage;
  }

  async delete(id: string) {
    const page = await this.prisma.contentPage.findUnique({ where: { id } });

    if (!page) {
      throw new NotFoundException(`Content page with ID ${id} not found`);
    }

    await this.prisma.contentPage.delete({ where: { id } });

    return { message: 'Content page deleted successfully' };
  }

  async reorder(pages: { id: string; order: number }[]) {
    await Promise.all(
      pages.map((page) =>
        this.prisma.contentPage.update({
          where: { id: page.id },
          data: { order: page.order },
        }),
      ),
    );

    return { message: 'Content pages reordered successfully' };
  }
}
