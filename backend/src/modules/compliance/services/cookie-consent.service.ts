import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { UpdateCookieBannerDto } from '../dto/update-cookie-banner.dto';
import { RecordConsentDto } from '../dto/record-consent.dto';

@Injectable()
export class CookieConsentService {
  constructor(private readonly prisma: PrismaService) {}

  // ========================================
  // COOKIE CONSENT BANNER
  // ========================================

  /**
   * Find cookie banner configuration for a tenant
   * Returns null if not configured yet
   */
  async findBanner(tenantId: string) {
    return this.prisma.cookieConsentBanner.findUnique({
      where: { tenantId },
    });
  }

  /**
   * Create or update cookie banner configuration
   * Uses upsert to handle both create and update cases
   */
  async createOrUpdateBanner(tenantId: string, dto: UpdateCookieBannerDto) {
    return this.prisma.cookieConsentBanner.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...dto,
      },
      update: dto,
    });
  }

  // ========================================
  // USER COOKIE CONSENT
  // ========================================

  /**
   * Record user's cookie consent choices
   * Calculates expiration date based on banner settings
   */
  async recordConsent(
    tenantId: string,
    dto: RecordConsentDto,
    userId?: string,
  ) {
    // Get banner settings to determine expiry
    const banner = await this.findBanner(tenantId);
    const expiryDays = banner?.consentExpiryDays || 365;

    // Calculate expiration date
    const consentExpiresAt = new Date();
    consentExpiresAt.setDate(consentExpiresAt.getDate() + expiryDays);

    return this.prisma.userCookieConsent.create({
      data: {
        tenantId,
        userId: userId || null,
        anonymousId: dto.anonymousId,
        necessaryCookies: dto.necessaryCookies,
        analyticsCookies: dto.analyticsCookies,
        marketingCookies: dto.marketingCookies,
        newsletterConsent: dto.newsletterConsent || false,
        consentExpiresAt,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
      },
    });
  }

  /**
   * Find user's most recent consent record
   * Searches by userId or anonymousId
   */
  async findUserConsent(
    tenantId: string,
    userId?: string,
    anonymousId?: string,
  ) {
    if (!userId && !anonymousId) {
      throw new Error('Either userId or anonymousId must be provided');
    }

    return this.prisma.userCookieConsent.findFirst({
      where: {
        tenantId,
        ...(userId && { userId }),
        ...(anonymousId && { anonymousId }),
      },
      orderBy: {
        consentGivenAt: 'desc',
      },
    });
  }

  /**
   * Get all consent records for a tenant
   * Supports pagination and filtering
   */
  async getAllConsents(
    tenantId: string,
    options?: {
      skip?: number;
      take?: number;
      userId?: string;
      anonymousId?: string;
    },
  ) {
    const { skip = 0, take = 50, userId, anonymousId } = options || {};

    const where = {
      tenantId,
      ...(userId && { userId }),
      ...(anonymousId && { anonymousId }),
    };

    const [consents, total] = await Promise.all([
      this.prisma.userCookieConsent.findMany({
        where,
        skip,
        take,
        orderBy: {
          consentGivenAt: 'desc',
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
      }),
      this.prisma.userCookieConsent.count({ where }),
    ]);

    return {
      consents,
      total,
      skip,
      take,
    };
  }

  /**
   * Get all consent records with advanced filtering
   * Supports filtering by consent types and search
   */
  async getAllConsentsWithFilters(
    tenantId: string,
    options?: {
      skip?: number;
      take?: number;
      analyticsCookies?: boolean;
      marketingCookies?: boolean;
      newsletterConsent?: boolean;
      search?: string;
    },
  ) {
    const { skip = 0, take = 20, analyticsCookies, marketingCookies, newsletterConsent, search } = options || {};

    const where: any = {
      tenantId,
      ...(analyticsCookies !== undefined && { analyticsCookies }),
      ...(marketingCookies !== undefined && { marketingCookies }),
      ...(newsletterConsent !== undefined && { newsletterConsent }),
    };

    // Add search filter for user email or anonymous ID
    if (search) {
      where.OR = [
        { anonymousId: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [consents, total] = await Promise.all([
      this.prisma.userCookieConsent.findMany({
        where,
        skip,
        take,
        orderBy: {
          consentGivenAt: 'desc',
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
      }),
      this.prisma.userCookieConsent.count({ where }),
    ]);

    return {
      data: consents,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  /**
   * Get consent statistics for a tenant
   */
  async getConsentStats(tenantId: string) {
    const [total, analytics, marketing, newsletter] = await Promise.all([
      this.prisma.userCookieConsent.count({ where: { tenantId } }),
      this.prisma.userCookieConsent.count({ where: { tenantId, analyticsCookies: true } }),
      this.prisma.userCookieConsent.count({ where: { tenantId, marketingCookies: true } }),
      this.prisma.userCookieConsent.count({ where: { tenantId, newsletterConsent: true } }),
    ]);

    return {
      total,
      analytics: {
        accepted: analytics,
        rejected: total - analytics,
        rate: total > 0 ? Math.round((analytics / total) * 100) : 0,
      },
      marketing: {
        accepted: marketing,
        rejected: total - marketing,
        rate: total > 0 ? Math.round((marketing / total) * 100) : 0,
      },
      newsletter: {
        subscribed: newsletter,
        notSubscribed: total - newsletter,
        rate: total > 0 ? Math.round((newsletter / total) * 100) : 0,
      },
    };
  }
}
