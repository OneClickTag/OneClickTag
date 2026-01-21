import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCookieCategoryDto } from '../dto/create-cookie-category.dto';
import { UpdateCookieCategoryDto } from '../dto/update-cookie-category.dto';
import { CreateCookieDto } from '../dto/create-cookie.dto';
import { UpdateCookieDto } from '../dto/update-cookie.dto';

@Injectable()
export class CookieManagementService {
  constructor(private readonly prisma: PrismaService) {}

  // ========================================
  // COOKIE CATEGORIES
  // ========================================

  /**
   * Find all cookie categories for a tenant
   * Includes related cookies
   */
  async findAllCategories(tenantId: string) {
    return this.prisma.cookieCategory.findMany({
      where: { tenantId },
      include: {
        cookies: true,
      },
      orderBy: {
        category: 'asc',
      },
    });
  }

  /**
   * Find cookie category by ID
   * Ensures multi-tenant isolation
   */
  async findCategoryById(id: string, tenantId: string) {
    const category = await this.prisma.cookieCategory.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        cookies: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Cookie category with ID ${id} not found`);
    }

    return category;
  }

  /**
   * Create a new cookie category
   */
  async createCategory(tenantId: string, dto: CreateCookieCategoryDto) {
    return this.prisma.cookieCategory.create({
      data: {
        tenantId,
        ...dto,
      },
      include: {
        cookies: true,
      },
    });
  }

  /**
   * Update a cookie category
   * Ensures multi-tenant isolation
   */
  async updateCategory(
    id: string,
    tenantId: string,
    dto: UpdateCookieCategoryDto,
  ) {
    // Verify category exists and belongs to tenant
    await this.findCategoryById(id, tenantId);

    return this.prisma.cookieCategory.update({
      where: { id },
      data: dto,
      include: {
        cookies: true,
      },
    });
  }

  /**
   * Delete a cookie category
   * Ensures multi-tenant isolation
   * Note: Will cascade delete related cookies
   */
  async deleteCategory(id: string, tenantId: string) {
    // Verify category exists and belongs to tenant
    await this.findCategoryById(id, tenantId);

    return this.prisma.cookieCategory.delete({
      where: { id },
    });
  }

  // ========================================
  // COOKIES
  // ========================================

  /**
   * Find all cookies for a tenant
   * Optionally filter by category
   */
  async findAllCookies(tenantId: string, categoryId?: string) {
    return this.prisma.cookie.findMany({
      where: {
        tenantId,
        ...(categoryId && { categoryId }),
      },
      include: {
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Find cookie by ID
   * Ensures multi-tenant isolation
   */
  async findCookieById(id: string, tenantId: string) {
    const cookie = await this.prisma.cookie.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        category: true,
      },
    });

    if (!cookie) {
      throw new NotFoundException(`Cookie with ID ${id} not found`);
    }

    return cookie;
  }

  /**
   * Create a new cookie
   * Verifies category exists and belongs to tenant
   */
  async createCookie(tenantId: string, dto: CreateCookieDto) {
    // Verify category exists and belongs to tenant
    await this.findCategoryById(dto.categoryId, tenantId);

    return this.prisma.cookie.create({
      data: {
        tenantId,
        ...dto,
      },
      include: {
        category: true,
      },
    });
  }

  /**
   * Update a cookie
   * Ensures multi-tenant isolation
   */
  async updateCookie(id: string, tenantId: string, dto: UpdateCookieDto) {
    // Verify cookie exists and belongs to tenant
    await this.findCookieById(id, tenantId);

    // If updating category, verify new category belongs to tenant
    if (dto.categoryId) {
      await this.findCategoryById(dto.categoryId, tenantId);
    }

    return this.prisma.cookie.update({
      where: { id },
      data: dto,
      include: {
        category: true,
      },
    });
  }

  /**
   * Delete a cookie
   * Ensures multi-tenant isolation
   */
  async deleteCookie(id: string, tenantId: string) {
    // Verify cookie exists and belongs to tenant
    await this.findCookieById(id, tenantId);

    return this.prisma.cookie.delete({
      where: { id },
    });
  }

  /**
   * Delete multiple cookies
   * Ensures multi-tenant isolation
   */
  async deleteMultipleCookies(ids: string[], tenantId: string) {
    return await this.prisma.$transaction(async (tx) => {
      // Verify all cookies exist and belong to tenant
      const cookies = await tx.cookie.findMany({
        where: {
          id: { in: ids },
          tenantId,
        },
      });

      if (cookies.length !== ids.length) {
        const foundIds = cookies.map((c) => c.id);
        const missing = ids.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(
          `Cookies with IDs ${missing.join(', ')} not found or do not belong to this tenant`,
        );
      }

      // Delete all cookies
      return await tx.cookie.deleteMany({
        where: {
          id: { in: ids },
          tenantId,
        },
      });
    });
  }
}
