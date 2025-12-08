import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateContactPageContentDto, UpdateContactPageContentDto } from '../dto/contact-page.dto';

@Injectable()
export class ContactPageService {
  constructor(private prisma: PrismaService) {}

  async findAll(active?: boolean) {
    const where = active !== undefined ? { isActive: active } : {};

    const pages = await this.prisma.contactPageContent.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return pages;
  }

  async findOne(id: string) {
    const page = await this.prisma.contactPageContent.findUnique({
      where: { id },
    });

    if (!page) {
      throw new NotFoundException(`Contact page content with ID ${id} not found`);
    }

    return page;
  }

  async create(createContactPageContentDto: CreateContactPageContentDto, userId?: string) {
    const page = await this.prisma.contactPageContent.create({
      data: {
        ...createContactPageContentDto,
        updatedBy: userId,
      },
    });

    return page;
  }

  async update(id: string, updateContactPageContentDto: UpdateContactPageContentDto, userId?: string) {
    const page = await this.prisma.contactPageContent.findUnique({ where: { id } });

    if (!page) {
      throw new NotFoundException(`Contact page content with ID ${id} not found`);
    }

    const updatedPage = await this.prisma.contactPageContent.update({
      where: { id },
      data: {
        ...updateContactPageContentDto,
        updatedBy: userId,
      },
    });

    return updatedPage;
  }

  async toggleActive(id: string, isActive: boolean) {
    const page = await this.prisma.contactPageContent.findUnique({ where: { id } });

    if (!page) {
      throw new NotFoundException(`Contact page content with ID ${id} not found`);
    }

    const updatedPage = await this.prisma.contactPageContent.update({
      where: { id },
      data: { isActive },
    });

    return updatedPage;
  }

  async delete(id: string) {
    const page = await this.prisma.contactPageContent.findUnique({ where: { id } });

    if (!page) {
      throw new NotFoundException(`Contact page content with ID ${id} not found`);
    }

    await this.prisma.contactPageContent.delete({ where: { id } });

    return { message: 'Contact page content deleted successfully' };
  }

  // Helper method to get the active contact page or first available
  async getActiveContactPage() {
    // Try to find an active page
    let page = await this.prisma.contactPageContent.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    // If no active page found, try to find any page
    if (!page) {
      page = await this.prisma.contactPageContent.findFirst({
        orderBy: { createdAt: 'desc' },
      });
    }

    return page;
  }

  // Helper method to get or create default contact page
  async getOrCreateDefaultContactPage() {
    let page = await this.getActiveContactPage();

    if (!page) {
      // Create a default contact page if none exists
      page = await this.prisma.contactPageContent.create({
        data: {
          email: 'contact@oneclicktag.com',
          phone: '',
          address: '',
          businessHours: '',
          isActive: true,
        },
      });
    }

    return page;
  }
}
