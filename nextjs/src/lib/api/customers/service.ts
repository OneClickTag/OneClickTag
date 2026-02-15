// Customer Service for Next.js API routes
// Migrated from NestJS CustomerService

import { customAlphabet } from 'nanoid';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  CustomerStatus,
  CustomerSortField,
  SortOrder,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerQueryParams,
  CustomerResponse,
  PaginatedCustomerResponse,
  CustomerStatsResponse,
  CustomerTrackingsResponse,
  CustomerAnalyticsResponse,
  BulkCreateCustomerInput,
  BulkUpdateCustomerInput,
  BulkDeleteCustomerInput,
  BulkOperationResult,
} from './types';

const generateSlug = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);

// Custom Errors
export class CustomerNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Customer not found: ${identifier}`);
    this.name = 'CustomerNotFoundError';
  }
}

export class CustomerEmailConflictError extends Error {
  constructor(email: string) {
    super(`Customer with email "${email}" already exists`);
    this.name = 'CustomerEmailConflictError';
  }
}

export class InvalidCustomerDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCustomerDataError';
  }
}

// Helper function to map Prisma result to response DTO
function mapToResponseDto(customer: Record<string, unknown>): CustomerResponse {
  const connected = !!customer.googleAccountId;

  return {
    id: customer.id as string,
    slug: customer.slug as string,
    email: customer.email as string,
    firstName: customer.firstName as string,
    lastName: customer.lastName as string,
    fullName: customer.fullName as string,
    company: customer.company as string | null,
    phone: customer.phone as string | null,
    websiteUrl: customer.websiteUrl as string | null,
    status: customer.status as CustomerStatus,
    tags: customer.tags as string[],
    notes: customer.notes as string | null,
    customFields: customer.customFields as Record<string, unknown> | null,
    googleAccountId: customer.googleAccountId as string | null,
    googleEmail: customer.googleEmail as string | null,
    gtmContainerId: customer.gtmContainerId as string | null,
    gtmWorkspaceId: customer.gtmWorkspaceId as string | null,
    gtmContainerName: customer.gtmContainerName as string | null,
    googleAdsAccounts: customer.googleAdsAccounts as CustomerResponse['googleAdsAccounts'],
    ga4Properties: customer.ga4Properties as CustomerResponse['ga4Properties'],
    serverSideEnabled: customer.serverSideEnabled as boolean | undefined,
    stapeContainer: customer.stapeContainer as CustomerResponse['stapeContainer'],
    googleAccount: connected
      ? {
          connected: true,
          email: customer.googleEmail as string | undefined,
          connectedAt: (customer.updatedAt as Date)?.toISOString(),
          hasGTMAccess: !!(customer.gtmContainerId),
          hasGA4Access: !!((customer.ga4Properties as unknown[])?.length),
          hasAdsAccess: !!((customer.googleAdsAccounts as unknown[])?.length),
          gtmError: null,
          ga4Error: null,
          adsError: null,
          gtmAccountId: null,
          gtmContainerId: customer.gtmContainerId as string | null,
          ga4PropertyCount: (customer.ga4Properties as unknown[])?.length || 0,
          adsAccountCount: (customer.googleAdsAccounts as unknown[])?.length || 0,
        }
      : undefined,
    createdAt: customer.createdAt as Date,
    updatedAt: customer.updatedAt as Date,
    createdBy: customer.createdBy as string | null,
    updatedBy: customer.updatedBy as string | null,
  };
}

// Build where clause for customer queries
function buildWhereClause(
  query: CustomerQueryParams,
  tenantId: string
): Record<string, unknown> {
  const where: Record<string, unknown> = { tenantId };

  // Search across multiple fields
  if (query.search) {
    where.OR = [
      { firstName: { contains: query.search, mode: 'insensitive' } },
      { lastName: { contains: query.search, mode: 'insensitive' } },
      { fullName: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
      { company: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  // Status filter
  if (query.status) {
    where.status = query.status;
  }

  // Company filter
  if (query.company) {
    where.company = { contains: query.company, mode: 'insensitive' };
  }

  // Tags filter
  if (query.tags && query.tags.length > 0) {
    where.tags = { hasSome: query.tags };
  }

  // Google account filter
  if (query.hasGoogleAccount !== undefined) {
    where.googleAccountId = query.hasGoogleAccount
      ? { not: null }
      : { equals: null };
  }

  // Date range filters
  if (query.createdAfter || query.createdBefore) {
    where.createdAt = {};
    if (query.createdAfter) {
      (where.createdAt as Record<string, Date>).gte = new Date(query.createdAfter);
    }
    if (query.createdBefore) {
      (where.createdAt as Record<string, Date>).lte = new Date(query.createdBefore);
    }
  }

  return where;
}

// Build order clause
function buildOrderClause(query: CustomerQueryParams): Record<string, string> {
  const orderField = query.sortBy || CustomerSortField.CREATED_AT;
  const orderDirection = query.sortOrder || SortOrder.DESC;

  return { [orderField]: orderDirection };
}

// Generate unique slug
async function generateUniqueSlug(): Promise<string> {
  let slug = generateSlug();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const existingSlug = await prisma.customer.findUnique({
      where: { slug },
    });
    if (!existingSlug) return slug;
    slug = generateSlug();
    attempts++;
  }

  throw new InvalidCustomerDataError('Failed to generate unique slug');
}

// ============================================
// CRUD Operations
// ============================================

export async function createCustomer(
  input: CreateCustomerInput,
  tenantId: string,
  createdBy?: string
): Promise<CustomerResponse> {
  // Check if customer with email already exists in tenant
  const existingCustomer = await prisma.customer.findFirst({
    where: { email: input.email, tenantId },
  });

  if (existingCustomer) {
    throw new CustomerEmailConflictError(input.email);
  }

  // Generate full name
  const fullName = `${input.firstName} ${input.lastName}`.trim();

  // Generate unique slug
  const slug = await generateUniqueSlug();

  const customer = await prisma.customer.create({
    data: {
      ...input,
      fullName,
      slug,
      tenantId,
      createdBy,
      tags: input.tags || [],
      customFields: (input.customFields || {}) as Prisma.InputJsonValue,
    },
    include: {
      googleAdsAccounts: true,
      ga4Properties: true,
      stapeContainer: true,
    },
  });

  return mapToResponseDto(customer as unknown as Record<string, unknown>);
}

export async function findAllCustomers(
  query: CustomerQueryParams,
  tenantId: string
): Promise<PaginatedCustomerResponse> {
  const { page = 1, limit = 20, includeGoogleAds = false } = query;
  const skip = (page - 1) * limit;

  const where = buildWhereClause(query, tenantId);
  const orderBy = buildOrderClause(query);

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        googleAdsAccounts: includeGoogleAds,
        ga4Properties: true,
        stapeContainer: true,
      },
    }),
    prisma.customer.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: customers.map((customer) =>
      mapToResponseDto(customer as unknown as Record<string, unknown>)
    ),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    filters: {
      search: query.search,
      status: query.status,
      company: query.company,
      tags: query.tags,
      hasGoogleAccount: query.hasGoogleAccount,
      createdAfter: query.createdAfter,
      createdBefore: query.createdBefore,
    },
    sort: {
      field: query.sortBy || CustomerSortField.CREATED_AT,
      order: query.sortOrder || SortOrder.DESC,
    },
  };
}

export async function findCustomerById(
  id: string,
  tenantId: string,
  includeGoogleAds = false
): Promise<CustomerResponse> {
  const customer = await prisma.customer.findFirst({
    where: { id, tenantId },
    include: {
      googleAdsAccounts: includeGoogleAds,
      ga4Properties: true,
      stapeContainer: true,
    },
  });

  if (!customer) {
    throw new CustomerNotFoundError(id);
  }

  return mapToResponseDto(customer as unknown as Record<string, unknown>);
}

export async function findCustomerBySlug(
  slug: string,
  tenantId: string,
  includeGoogleAds = false
): Promise<CustomerResponse> {
  const customer = await prisma.customer.findFirst({
    where: { slug, tenantId },
    include: {
      googleAdsAccounts: includeGoogleAds,
      ga4Properties: true,
      stapeContainer: true,
    },
  });

  if (!customer) {
    throw new CustomerNotFoundError(`Customer with slug "${slug}" not found`);
  }

  return mapToResponseDto(customer as unknown as Record<string, unknown>);
}

export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
  tenantId: string,
  updatedBy?: string
): Promise<CustomerResponse> {
  // Check if customer exists
  const existingCustomer = await prisma.customer.findFirst({
    where: { id, tenantId },
  });

  if (!existingCustomer) {
    throw new CustomerNotFoundError(id);
  }

  // Check email conflict if email is being updated
  if (input.email && input.email !== existingCustomer.email) {
    const emailConflict = await prisma.customer.findFirst({
      where: {
        email: input.email,
        tenantId,
        NOT: { id },
      },
    });

    if (emailConflict) {
      throw new CustomerEmailConflictError(input.email);
    }
  }

  // Update full name if first or last name changed
  let fullName = existingCustomer.fullName;
  if (input.firstName || input.lastName) {
    const firstName = input.firstName || existingCustomer.firstName;
    const lastName = input.lastName || existingCustomer.lastName;
    fullName = `${firstName} ${lastName}`.trim();
  }

  // Extract customFields and cast it properly for Prisma
  const { customFields, ...restInput } = input;

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      ...restInput,
      ...(customFields !== undefined && { customFields: customFields as Prisma.InputJsonValue }),
      fullName,
      updatedBy,
    },
    include: {
      googleAdsAccounts: true,
      ga4Properties: true,
      stapeContainer: true,
    },
  });

  return mapToResponseDto(customer as unknown as Record<string, unknown>);
}

export async function deleteCustomer(
  id: string,
  tenantId: string
): Promise<void> {
  const customer = await prisma.customer.findFirst({
    where: { id, tenantId },
  });

  if (!customer) {
    throw new CustomerNotFoundError(id);
  }

  await prisma.customer.delete({
    where: { id },
  });
}

// ============================================
// Stats and Analytics
// ============================================

export async function getCustomerStats(
  tenantId: string
): Promise<CustomerStatsResponse> {
  const [total, activeCount, inactiveCount, withGoogleAccount, recentCount] =
    await Promise.all([
      prisma.customer.count({ where: { tenantId } }),
      prisma.customer.count({
        where: { tenantId, status: CustomerStatus.ACTIVE },
      }),
      prisma.customer.count({
        where: { tenantId, status: CustomerStatus.INACTIVE },
      }),
      prisma.customer.count({
        where: { tenantId, googleAccountId: { not: null } },
      }),
      prisma.customer.count({
        where: {
          tenantId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
    ]);

  return {
    total,
    byStatus: {
      active: activeCount,
      inactive: inactiveCount,
      suspended: total - activeCount - inactiveCount,
    },
    withGoogleAccount,
    withoutGoogleAccount: total - withGoogleAccount,
    recentlyCreated: recentCount,
    tenantId,
    lastUpdated: new Date(),
  };
}

export async function getCustomerTrackings(
  customerId: string,
  tenantId: string,
  page = 0,
  limit = 20
): Promise<CustomerTrackingsResponse> {
  // Verify customer belongs to tenant
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
  });

  if (!customer) {
    throw new CustomerNotFoundError(customerId);
  }

  const skip = page * limit;
  const [trackings, total] = await Promise.all([
    prisma.tracking.findMany({
      where: { customerId, tenantId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        conversionAction: true,
      },
    }),
    prisma.tracking.count({
      where: { customerId, tenantId },
    }),
  ]);

  return {
    trackings: trackings.map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      status: t.status,
      selector: t.selector,
      urlPattern: t.urlPattern,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      conversionAction: t.conversionAction
        ? {
            id: t.conversionAction.id,
            name: t.conversionAction.name,
            status: t.conversionAction.status,
          }
        : null,
    })),
    total,
    page,
    pageSize: limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getCustomerAnalytics(
  customerId: string,
  tenantId: string,
  fromDate?: string,
  toDate?: string
): Promise<CustomerAnalyticsResponse> {
  // Verify customer belongs to tenant
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
  });

  if (!customer) {
    throw new CustomerNotFoundError(customerId);
  }

  const dateFilter: Record<string, Date> = {};
  if (fromDate) {
    dateFilter.gte = new Date(fromDate);
  }
  if (toDate) {
    dateFilter.lte = new Date(toDate);
  }

  const whereClause: Record<string, unknown> = { customerId, tenantId };
  if (Object.keys(dateFilter).length > 0) {
    whereClause.createdAt = dateFilter;
  }

  const [totalTrackings, activeTrackings, failedTrackings, recentActivity] =
    await Promise.all([
      prisma.tracking.count({
        where: { customerId, tenantId },
      }),
      prisma.tracking.count({
        where: { customerId, tenantId, status: 'ACTIVE' },
      }),
      prisma.tracking.count({
        where: { customerId, tenantId, status: 'FAILED' },
      }),
      prisma.tracking.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          updatedAt: true,
        },
      }),
    ]);

  const syncRate =
    totalTrackings > 0 ? Math.round((activeTrackings / totalTrackings) * 100) : 0;

  return {
    totalTrackings,
    activeTrackings,
    failedTrackings,
    syncRate,
    totalEvents: 0,
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      status: a.status,
      updatedAt: a.updatedAt,
    })),
  };
}

// ============================================
// Bulk Operations
// ============================================

export async function bulkCreateCustomers(
  input: BulkCreateCustomerInput,
  tenantId: string,
  createdBy?: string
): Promise<BulkOperationResult[]> {
  const results: BulkOperationResult[] = [];

  for (const customerDto of input.customers) {
    try {
      const customer = await createCustomer(customerDto, tenantId, createdBy);
      results.push({
        success: true,
        customerId: customer.id,
        result: customer,
      });
    } catch (error) {
      results.push({
        success: false,
        customerId: customerDto.email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

export async function bulkUpdateCustomers(
  input: BulkUpdateCustomerInput,
  tenantId: string,
  updatedBy?: string
): Promise<BulkOperationResult[]> {
  const results: BulkOperationResult[] = [];

  for (const update of input.updates) {
    try {
      const customer = await updateCustomer(
        update.id,
        update.data,
        tenantId,
        updatedBy
      );
      results.push({
        success: true,
        customerId: update.id,
        result: customer,
      });
    } catch (error) {
      results.push({
        success: false,
        customerId: update.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

export async function bulkDeleteCustomers(
  input: BulkDeleteCustomerInput,
  tenantId: string
): Promise<BulkOperationResult[]> {
  const results: BulkOperationResult[] = [];

  for (const customerId of input.customerIds) {
    try {
      await deleteCustomer(customerId, tenantId);
      results.push({
        success: true,
        customerId,
      });
    } catch (error) {
      results.push({
        success: false,
        customerId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}
