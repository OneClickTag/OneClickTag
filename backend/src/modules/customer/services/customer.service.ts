import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TenantContextService } from '../../tenant/services/tenant-context.service';
import { TenantCacheService } from '../../tenant/services/tenant-cache.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerResponseDto,
  CustomerQueryDto,
  PaginatedCustomerResponseDto,
  BulkCreateCustomerDto,
  BulkUpdateCustomerDto,
  BulkDeleteCustomerDto,
  BulkOperationResultDto,
  CustomerSortField,
  CustomerStatus,
  SortOrder,
} from '../dto';
import {
  CustomerSearchFilters,
  CustomerSortOptions,
  PaginationOptions,
  PaginationResult,
  BulkOperationResult,
} from '../interfaces/customer.interface';
import {
  CustomerNotFoundException,
  CustomerEmailConflictException,
  InvalidCustomerDataException,
  CustomerBulkOperationException,
} from '../exceptions/customer.exceptions';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: TenantCacheService,
  ) {}

  async createWithTenant(createCustomerDto: CreateCustomerDto, createdBy: string, tenantId: string): Promise<CustomerResponseDto> {
    this.logger.log(`Creating customer with email: ${createCustomerDto.email} for tenant: ${tenantId}`);

    try {
      // Set tenant context for this operation
      return await TenantContextService.runAsync({
        tenantId,
        userId: createdBy,
        permissions: [],
      }, async () => {
        return this.create(createCustomerDto, createdBy);
      });
    } catch (error) {
      this.logger.error(`Failed to create customer with tenant: ${error.message}`, error.stack);
      throw error;
    }
  }

  async create(createCustomerDto: CreateCustomerDto, createdBy?: string): Promise<CustomerResponseDto> {
    const tenantId = TenantContextService.getTenantId();
    if (!tenantId) {
      throw new InvalidCustomerDataException('Tenant context is required');
    }

    this.logger.log(`Creating customer with email: ${createCustomerDto.email} for tenant: ${tenantId}`);

    try {
      // Check if customer with email already exists in tenant
      const existingCustomer = await this.prisma.tenantAware.customer.findFirst({
        where: { email: createCustomerDto.email },
      });

      if (existingCustomer) {
        throw new CustomerEmailConflictException(createCustomerDto.email);
      }

      // Generate full name
      const fullName = `${createCustomerDto.firstName} ${createCustomerDto.lastName}`.trim();

      const customer = await this.prisma.tenantAware.customer.create({
        data: {
          ...createCustomerDto,
          fullName,
          tenantId,
          createdBy,
          tags: createCustomerDto.tags || [],
          customFields: createCustomerDto.customFields || {},
        },
        include: {
          googleAdsAccounts: true,
          ga4Properties: true,
        },
      });

      // Clear cache
      await this.cacheService.del('customers:list');
      await this.cacheService.del(`customers:stats`);

      this.logger.log(`Customer created successfully: ${customer.id}`);
      return this.mapToResponseDto(customer);
    } catch (error) {
      this.logger.error(`Failed to create customer: ${error.message}`, error.stack);
      if (error instanceof CustomerEmailConflictException) {
        throw error;
      }
      throw new InvalidCustomerDataException(error.message);
    }
  }

  async findAll(query: CustomerQueryDto): Promise<PaginatedCustomerResponseDto> {
    const tenantId = TenantContextService.getTenantId();
    if (!tenantId) {
      throw new InvalidCustomerDataException('Tenant context is required');
    }

    const cacheKey = `customers:list:${JSON.stringify(query)}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const { page = 1, limit = 20, includeGoogleAds = false } = query;
        const skip = (page - 1) * limit;

        // Build where clause
        const where = this.buildWhereClause(query);

        // Build order clause
        const orderBy = this.buildOrderClause(query);

        this.logger.log(`Fetching customers with filters: ${JSON.stringify(where)}`);

        const [customers, total] = await Promise.all([
          this.prisma.tenantAware.customer.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            include: {
              googleAdsAccounts: includeGoogleAds,
              ga4Properties: true,
            },
          }),
          this.prisma.tenantAware.customer.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
          data: customers.map(customer => this.mapToResponseDto(customer)),
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
      },
      { ttl: 300 }, // 5 minutes cache
    );
  }

  async findOne(id: string, includeGoogleAds = false): Promise<CustomerResponseDto> {
    const cacheKey = `customers:${id}:${includeGoogleAds}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        this.logger.log(`Fetching customer: ${id}`);

        const customer = await this.prisma.tenantAware.customer.findUnique({
          where: { id },
          include: {
            googleAdsAccounts: includeGoogleAds,
            ga4Properties: true,
          },
        });

        if (!customer) {
          throw new CustomerNotFoundException(id);
        }

        return this.mapToResponseDto(customer);
      },
      { ttl: 600 }, // 10 minutes cache
    );
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto, updatedBy?: string): Promise<CustomerResponseDto> {
    this.logger.log(`Updating customer: ${id}`);

    try {
      // Check if customer exists
      const existingCustomer = await this.prisma.tenantAware.customer.findUnique({
        where: { id },
      });

      if (!existingCustomer) {
        throw new CustomerNotFoundException(id);
      }

      // Check email conflict if email is being updated
      if (updateCustomerDto.email && updateCustomerDto.email !== existingCustomer.email) {
        const emailConflict = await this.prisma.tenantAware.customer.findFirst({
          where: {
            email: updateCustomerDto.email,
            NOT: { id },
          },
        });

        if (emailConflict) {
          throw new CustomerEmailConflictException(updateCustomerDto.email);
        }
      }

      // Update full name if first or last name changed
      let fullName = existingCustomer.fullName;
      if (updateCustomerDto.firstName || updateCustomerDto.lastName) {
        const firstName = updateCustomerDto.firstName || existingCustomer.firstName;
        const lastName = updateCustomerDto.lastName || existingCustomer.lastName;
        fullName = `${firstName} ${lastName}`.trim();
      }

      const customer = await this.prisma.tenantAware.customer.update({
        where: { id },
        data: {
          ...updateCustomerDto,
          fullName,
          updatedBy,
        },
        include: {
          googleAdsAccounts: true,
          ga4Properties: true,
        },
      });

      // Clear cache
      await this.cacheService.del(`customers:${id}:true`);
      await this.cacheService.del(`customers:${id}:false`);
      await this.cacheService.del('customers:list');
      await this.cacheService.del('customers:stats');

      this.logger.log(`Customer updated successfully: ${id}`);
      return this.mapToResponseDto(customer);
    } catch (error) {
      this.logger.error(`Failed to update customer ${id}: ${error.message}`, error.stack);
      if (error instanceof CustomerNotFoundException || error instanceof CustomerEmailConflictException) {
        throw error;
      }
      throw new InvalidCustomerDataException(error.message);
    }
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting customer: ${id}`);

    try {
      const customer = await this.prisma.tenantAware.customer.findUnique({
        where: { id },
      });

      if (!customer) {
        throw new CustomerNotFoundException(id);
      }

      await this.prisma.tenantAware.customer.delete({
        where: { id },
      });

      // Clear cache
      await this.cacheService.del(`customers:${id}:true`);
      await this.cacheService.del(`customers:${id}:false`);
      await this.cacheService.del('customers:list');
      await this.cacheService.del('customers:stats');

      this.logger.log(`Customer deleted successfully: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete customer ${id}: ${error.message}`, error.stack);
      if (error instanceof CustomerNotFoundException) {
        throw error;
      }
      throw new InvalidCustomerDataException(error.message);
    }
  }

  async bulkCreate(bulkCreateDto: BulkCreateCustomerDto, createdBy?: string): Promise<BulkOperationResultDto[]> {
    const tenantId = TenantContextService.getTenantId();
    if (!tenantId) {
      throw new InvalidCustomerDataException('Tenant context is required');
    }

    this.logger.log(`Bulk creating ${bulkCreateDto.customers.length} customers for tenant: ${tenantId}`);

    const results: BulkOperationResultDto[] = [];

    for (const customerDto of bulkCreateDto.customers) {
      try {
        const customer = await this.create(customerDto, createdBy);
        results.push({
          success: true,
          customerId: customer.id,
          result: customer,
        });
      } catch (error) {
        results.push({
          success: false,
          customerId: customerDto.email, // Use email as identifier for failed creates
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    this.logger.log(`Bulk create completed: ${successCount}/${bulkCreateDto.customers.length} successful`);

    return results;
  }

  async bulkUpdate(bulkUpdateDto: BulkUpdateCustomerDto, updatedBy?: string): Promise<BulkOperationResultDto[]> {
    this.logger.log(`Bulk updating ${bulkUpdateDto.updates.length} customers`);

    const results: BulkOperationResultDto[] = [];

    for (const update of bulkUpdateDto.updates) {
      try {
        const customer = await this.update(update.id, update.data, updatedBy);
        results.push({
          success: true,
          customerId: update.id,
          result: customer,
        });
      } catch (error) {
        results.push({
          success: false,
          customerId: update.id,
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    this.logger.log(`Bulk update completed: ${successCount}/${bulkUpdateDto.updates.length} successful`);

    return results;
  }

  async bulkDelete(bulkDeleteDto: BulkDeleteCustomerDto): Promise<BulkOperationResultDto[]> {
    this.logger.log(`Bulk deleting ${bulkDeleteDto.customerIds.length} customers`);

    const results: BulkOperationResultDto[] = [];

    for (const customerId of bulkDeleteDto.customerIds) {
      try {
        await this.remove(customerId);
        results.push({
          success: true,
          customerId,
        });
      } catch (error) {
        results.push({
          success: false,
          customerId,
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    this.logger.log(`Bulk delete completed: ${successCount}/${bulkDeleteDto.customerIds.length} successful`);

    return results;
  }

  async getStats(): Promise<any> {
    const tenantId = TenantContextService.getTenantId();
    if (!tenantId) {
      throw new InvalidCustomerDataException('Tenant context is required');
    }

    return this.cacheService.getOrSet(
      'customers:stats',
      async () => {
        this.logger.log('Fetching customer statistics');

        const [
          total,
          activeCount,
          inactiveCount,
          withGoogleAccount,
          recentCount,
        ] = await Promise.all([
          this.prisma.tenantAware.customer.count(),
          this.prisma.tenantAware.customer.count({ where: { status: CustomerStatus.ACTIVE } }),
          this.prisma.tenantAware.customer.count({ where: { status: CustomerStatus.INACTIVE } }),
          this.prisma.tenantAware.customer.count({ where: { googleAccountId: { not: null } } }),
          this.prisma.tenantAware.customer.count({
            where: {
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
      },
      { ttl: 600 }, // 10 minutes cache
    );
  }

  private buildWhereClause(query: CustomerQueryDto): any {
    const where: any = {};

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
        where.createdAt.gte = new Date(query.createdAfter);
      }
      if (query.createdBefore) {
        where.createdAt.lte = new Date(query.createdBefore);
      }
    }

    return where;
  }

  private buildOrderClause(query: CustomerQueryDto): any {
    const orderField = query.sortBy || CustomerSortField.CREATED_AT;
    const orderDirection = query.sortOrder || SortOrder.DESC;

    return { [orderField]: orderDirection };
  }

  private mapToResponseDto(customer: any): CustomerResponseDto {
    // Only check if Google account is connected
    // DO NOT check actual API access here - that's expensive and done via getConnectionStatus endpoint
    // This method just returns basic customer data, not live connection status
    const connected = !!customer.googleAccountId;

    return {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      fullName: customer.fullName,
      company: customer.company,
      phone: customer.phone,
      status: customer.status,
      tags: customer.tags,
      notes: customer.notes,
      customFields: customer.customFields,
      googleAccountId: customer.googleAccountId,
      googleEmail: customer.googleEmail,
      googleAdsAccounts: customer.googleAdsAccounts,
      // Only include basic connection info, frontend should call getConnectionStatus for actual status
      googleAccount: connected ? {
        connected: true,
        email: customer.googleEmail,
        connectedAt: customer.updatedAt?.toISOString(),
        // These flags are unreliable here - frontend must call getConnectionStatus for accurate info
        hasGTMAccess: false, // Unknown until tested
        hasGA4Access: false, // Unknown until tested
        hasAdsAccess: false, // Unknown until tested
        gtmError: 'Use getConnectionStatus endpoint for accurate status',
        ga4Error: 'Use getConnectionStatus endpoint for accurate status',
        adsError: 'Use getConnectionStatus endpoint for accurate status',
        gtmAccountId: null,
        gtmContainerId: null,
        ga4PropertyCount: 0,
        adsAccountCount: 0,
      } : undefined,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      createdBy: customer.createdBy,
      updatedBy: customer.updatedBy,
    };
  }
}