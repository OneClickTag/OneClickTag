/**
 * Unit tests for CustomerService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

import { CustomerService } from './customer.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TenantCacheService } from '../../tenant/services/tenant-cache.service';
import { TenantContextService } from '../../tenant/services/tenant-context.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerQueryDto,
  BulkCreateCustomerDto,
  BulkUpdateCustomerDto,
  BulkDeleteCustomerDto,
  CustomerStatus,
} from '../dto';
import {
  CustomerNotFoundException,
  CustomerEmailConflictException,
  InvalidCustomerDataException,
} from '../exceptions/customer.exceptions';
import { 
  createTestUser, 
  createTestTenant,
  createTestCustomer,
  expectError,
  random 
} from '../../../../test/utils/test-helpers';

describe('CustomerService', () => {
  let service: CustomerService;
  let prisma: DeepMockProxy<PrismaService>;
  let cacheService: DeepMockProxy<TenantCacheService>;

  const mockTenantId = 'test-tenant-id';

  beforeEach(async () => {
    // Create mocks
    prisma = mockDeep<PrismaService>();
    cacheService = mockDeep<TenantCacheService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantCacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);

    // Mock TenantContextService.getTenantId
    jest.spyOn(TenantContextService, 'getTenantId').mockReturnValue(mockTenantId);

    // Setup default cache behavior
    cacheService.getOrSet.mockImplementation(async (key, factory) => {
      return await factory();
    });
    cacheService.del.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createCustomerDto: CreateCustomerDto = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      company: 'Test Company',
      phone: '+1234567890',
      tags: ['test'],
      customFields: { department: 'engineering' },
    };

    it('should create customer successfully', async () => {
      // Arrange
      const expectedCustomer = createTestCustomer({
        id: 'customer-123',
        email: createCustomerDto.email,
        firstName: createCustomerDto.firstName,
        lastName: createCustomerDto.lastName,
        fullName: 'John Doe',
        company: createCustomerDto.company,
        tenantId: mockTenantId,
        tags: createCustomerDto.tags,
        customFields: createCustomerDto.customFields,
      });

      prisma.tenantAware.customer.findFirst.mockResolvedValue(null); // No existing customer
      prisma.tenantAware.customer.create.mockResolvedValue(expectedCustomer);

      // Act
      const result = await service.create(createCustomerDto, 'created-by-user');

      // Assert
      expect(prisma.tenantAware.customer.findFirst).toHaveBeenCalledWith({
        where: { email: createCustomerDto.email },
      });

      expect(prisma.tenantAware.customer.create).toHaveBeenCalledWith({
        data: {
          ...createCustomerDto,
          fullName: 'John Doe',
          tenantId: mockTenantId,
          createdBy: 'created-by-user',
          tags: createCustomerDto.tags,
          customFields: createCustomerDto.customFields,
        },
        include: {
          googleAdsAccounts: true,
        },
      });

      expect(cacheService.del).toHaveBeenCalledWith('customers:list');
      expect(cacheService.del).toHaveBeenCalledWith('customers:stats');

      expect(result).toEqual(
        expect.objectContaining({
          id: expectedCustomer.id,
          email: expectedCustomer.email,
          firstName: expectedCustomer.firstName,
          lastName: expectedCustomer.lastName,
          fullName: expectedCustomer.fullName,
        })
      );
    });

    it('should throw CustomerEmailConflictException when email already exists', async () => {
      // Arrange
      const existingCustomer = createTestCustomer({ email: createCustomerDto.email });
      prisma.tenantAware.customer.findFirst.mockResolvedValue(existingCustomer);

      // Act & Assert
      await expectError(
        () => service.create(createCustomerDto),
        CustomerEmailConflictException
      );

      expect(prisma.tenantAware.customer.create).not.toHaveBeenCalled();
    });

    it('should throw InvalidCustomerDataException when tenant context is missing', async () => {
      // Arrange
      jest.spyOn(TenantContextService, 'getTenantId').mockReturnValue(null);

      // Act & Assert
      await expectError(
        () => service.create(createCustomerDto),
        'Tenant context is required'
      );

      expect(prisma.tenantAware.customer.findFirst).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      prisma.tenantAware.customer.findFirst.mockResolvedValue(null);
      prisma.tenantAware.customer.create.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expectError(
        () => service.create(createCustomerDto),
        InvalidCustomerDataException
      );
    });

    it('should generate correct fullName from firstName and lastName', async () => {
      // Arrange
      const dtoWithNames = {
        ...createCustomerDto,
        firstName: 'Jane',
        lastName: 'Smith',
      };
      
      prisma.tenantAware.customer.findFirst.mockResolvedValue(null);
      prisma.tenantAware.customer.create.mockResolvedValue(createTestCustomer());

      // Act
      await service.create(dtoWithNames);

      // Assert
      expect(prisma.tenantAware.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fullName: 'Jane Smith',
          }),
        })
      );
    });
  });

  describe('findAll', () => {
    const query: CustomerQueryDto = {
      page: 1,
      limit: 10,
      search: 'test',
      status: CustomerStatus.ACTIVE,
      includeGoogleAds: true,
    };

    it('should return paginated customers with filters', async () => {
      // Arrange
      const customers = [
        createTestCustomer({ id: '1', firstName: 'John' }),
        createTestCustomer({ id: '2', firstName: 'Jane' }),
      ];
      
      prisma.tenantAware.customer.findMany.mockResolvedValue(customers);
      prisma.tenantAware.customer.count.mockResolvedValue(25);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(prisma.tenantAware.customer.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { firstName: { contains: query.search, mode: 'insensitive' } },
            { lastName: { contains: query.search, mode: 'insensitive' } },
            { fullName: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { company: { contains: query.search, mode: 'insensitive' } },
          ]),
          status: query.status,
        }),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
        include: {
          googleAdsAccounts: true,
        },
      });

      expect(result).toEqual({
        data: expect.any(Array),
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNext: true,
          hasPrev: false,
        },
        filters: expect.objectContaining({
          search: query.search,
          status: query.status,
        }),
        sort: {
          field: 'createdAt',
          order: 'desc',
        },
      });
    });

    it('should use cache for repeated queries', async () => {
      // Arrange
      const cacheKey = `customers:list:${JSON.stringify(query)}`;
      const cachedData = { data: [], pagination: {}, filters: {}, sort: {} };
      
      cacheService.getOrSet.mockResolvedValue(cachedData);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        cacheKey,
        expect.any(Function),
        { ttl: 300 }
      );
      expect(result).toBe(cachedData);
    });

    it('should throw InvalidCustomerDataException when tenant context is missing', async () => {
      // Arrange
      jest.spyOn(TenantContextService, 'getTenantId').mockReturnValue(null);

      // Act & Assert
      await expectError(
        () => service.findAll(query),
        'Tenant context is required'
      );
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const paginationQuery = { page: 3, limit: 5 };
      prisma.tenantAware.customer.findMany.mockResolvedValue([]);
      prisma.tenantAware.customer.count.mockResolvedValue(20);

      // Act
      await service.findAll(paginationQuery);

      // Assert
      expect(prisma.tenantAware.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (3-1) * 5
          take: 5,
        })
      );
    });
  });

  describe('findOne', () => {
    const customerId = 'customer-123';

    it('should return customer by id', async () => {
      // Arrange
      const customer = createTestCustomer({ id: customerId });
      prisma.tenantAware.customer.findUnique.mockResolvedValue(customer);

      // Act
      const result = await service.findOne(customerId, true);

      // Assert
      expect(prisma.tenantAware.customer.findUnique).toHaveBeenCalledWith({
        where: { id: customerId },
        include: {
          googleAdsAccounts: true,
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: customer.id,
          email: customer.email,
        })
      );
    });

    it('should use cache for customer lookups', async () => {
      // Arrange
      const cacheKey = `customers:${customerId}:true`;
      const cachedCustomer = createTestCustomer({ id: customerId });
      
      cacheService.getOrSet.mockResolvedValue(cachedCustomer);

      // Act
      const result = await service.findOne(customerId, true);

      // Assert
      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        cacheKey,
        expect.any(Function),
        { ttl: 600 }
      );
    });

    it('should throw CustomerNotFoundException when customer not found', async () => {
      // Arrange
      prisma.tenantAware.customer.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expectError(
        () => service.findOne(customerId),
        CustomerNotFoundException
      );
    });
  });

  describe('update', () => {
    const customerId = 'customer-123';
    const updateCustomerDto: UpdateCustomerDto = {
      firstName: 'Jane',
      lastName: 'Smith',
      company: 'Updated Company',
    };

    it('should update customer successfully', async () => {
      // Arrange
      const existingCustomer = createTestCustomer({
        id: customerId,
        email: 'existing@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });
      const updatedCustomer = {
        ...existingCustomer,
        ...updateCustomerDto,
        fullName: 'Jane Smith',
      };

      prisma.tenantAware.customer.findUnique.mockResolvedValue(existingCustomer);
      prisma.tenantAware.customer.update.mockResolvedValue(updatedCustomer);

      // Act
      const result = await service.update(customerId, updateCustomerDto, 'updated-by-user');

      // Assert
      expect(prisma.tenantAware.customer.update).toHaveBeenCalledWith({
        where: { id: customerId },
        data: {
          ...updateCustomerDto,
          fullName: 'Jane Smith',
          updatedBy: 'updated-by-user',
        },
        include: {
          googleAdsAccounts: true,
        },
      });

      expect(cacheService.del).toHaveBeenCalledWith(`customers:${customerId}:true`);
      expect(cacheService.del).toHaveBeenCalledWith(`customers:${customerId}:false`);
      expect(cacheService.del).toHaveBeenCalledWith('customers:list');
      expect(cacheService.del).toHaveBeenCalledWith('customers:stats');

      expect(result.fullName).toBe('Jane Smith');
    });

    it('should throw CustomerNotFoundException when customer does not exist', async () => {
      // Arrange
      prisma.tenantAware.customer.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expectError(
        () => service.update(customerId, updateCustomerDto),
        CustomerNotFoundException
      );

      expect(prisma.tenantAware.customer.update).not.toHaveBeenCalled();
    });

    it('should throw CustomerEmailConflictException when updating to existing email', async () => {
      // Arrange
      const existingCustomer = createTestCustomer({ 
        id: customerId, 
        email: 'existing@example.com' 
      });
      const conflictCustomer = createTestCustomer({ 
        id: 'other-customer', 
        email: 'conflict@example.com' 
      });

      prisma.tenantAware.customer.findUnique.mockResolvedValue(existingCustomer);
      prisma.tenantAware.customer.findFirst.mockResolvedValue(conflictCustomer);

      const updateDto = { ...updateCustomerDto, email: 'conflict@example.com' };

      // Act & Assert
      await expectError(
        () => service.update(customerId, updateDto),
        CustomerEmailConflictException
      );
    });

    it('should preserve existing fullName when names are not updated', async () => {
      // Arrange
      const existingCustomer = createTestCustomer({
        id: customerId,
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
      });

      prisma.tenantAware.customer.findUnique.mockResolvedValue(existingCustomer);
      prisma.tenantAware.customer.update.mockResolvedValue(existingCustomer);

      const updateDtoWithoutNames = { company: 'New Company' };

      // Act
      await service.update(customerId, updateDtoWithoutNames);

      // Assert
      expect(prisma.tenantAware.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fullName: 'John Doe', // Should preserve existing fullName
          }),
        })
      );
    });
  });

  describe('remove', () => {
    const customerId = 'customer-123';

    it('should delete customer successfully', async () => {
      // Arrange
      const customer = createTestCustomer({ id: customerId });
      prisma.tenantAware.customer.findUnique.mockResolvedValue(customer);
      prisma.tenantAware.customer.delete.mockResolvedValue(customer);

      // Act
      await service.remove(customerId);

      // Assert
      expect(prisma.tenantAware.customer.findUnique).toHaveBeenCalledWith({
        where: { id: customerId },
      });
      expect(prisma.tenantAware.customer.delete).toHaveBeenCalledWith({
        where: { id: customerId },
      });

      expect(cacheService.del).toHaveBeenCalledWith(`customers:${customerId}:true`);
      expect(cacheService.del).toHaveBeenCalledWith(`customers:${customerId}:false`);
      expect(cacheService.del).toHaveBeenCalledWith('customers:list');
      expect(cacheService.del).toHaveBeenCalledWith('customers:stats');
    });

    it('should throw CustomerNotFoundException when customer does not exist', async () => {
      // Arrange
      prisma.tenantAware.customer.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expectError(
        () => service.remove(customerId),
        CustomerNotFoundException
      );

      expect(prisma.tenantAware.customer.delete).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const customer = createTestCustomer({ id: customerId });
      prisma.tenantAware.customer.findUnique.mockResolvedValue(customer);
      prisma.tenantAware.customer.delete.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expectError(
        () => service.remove(customerId),
        InvalidCustomerDataException
      );
    });
  });

  describe('bulkCreate', () => {
    const bulkCreateDto: BulkCreateCustomerDto = {
      customers: [
        {
          email: 'customer1@example.com',
          firstName: 'Customer',
          lastName: 'One',
          company: 'Company 1',
        },
        {
          email: 'customer2@example.com',
          firstName: 'Customer',
          lastName: 'Two',
          company: 'Company 2',
        },
      ],
    };

    it('should create multiple customers successfully', async () => {
      // Arrange
      const createdCustomers = bulkCreateDto.customers.map((dto, index) =>
        createTestCustomer({ id: `customer-${index + 1}`, ...dto })
      );

      // Mock individual create calls
      jest.spyOn(service, 'create')
        .mockResolvedValueOnce(service['mapToResponseDto'](createdCustomers[0]))
        .mockResolvedValueOnce(service['mapToResponseDto'](createdCustomers[1]));

      // Act
      const results = await service.bulkCreate(bulkCreateDto, 'created-by-user');

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        success: true,
        customerId: createdCustomers[0].id,
        result: expect.objectContaining({
          id: createdCustomers[0].id,
          email: createdCustomers[0].email,
        }),
      });
      expect(results[1]).toEqual({
        success: true,
        customerId: createdCustomers[1].id,
        result: expect.objectContaining({
          id: createdCustomers[1].id,
          email: createdCustomers[1].email,
        }),
      });
    });

    it('should handle partial failures in bulk create', async () => {
      // Arrange
      const createdCustomer = createTestCustomer({ 
        id: 'customer-1', 
        ...bulkCreateDto.customers[0] 
      });

      jest.spyOn(service, 'create')
        .mockResolvedValueOnce(service['mapToResponseDto'](createdCustomer))
        .mockRejectedValueOnce(new CustomerEmailConflictException('customer2@example.com'));

      // Act
      const results = await service.bulkCreate(bulkCreateDto);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('Email already exists');
    });

    it('should throw InvalidCustomerDataException when tenant context is missing', async () => {
      // Arrange
      jest.spyOn(TenantContextService, 'getTenantId').mockReturnValue(null);

      // Act & Assert
      await expectError(
        () => service.bulkCreate(bulkCreateDto),
        'Tenant context is required'
      );
    });
  });

  describe('bulkUpdate', () => {
    const bulkUpdateDto: BulkUpdateCustomerDto = {
      updates: [
        {
          id: 'customer-1',
          data: { firstName: 'Updated', lastName: 'One' },
        },
        {
          id: 'customer-2',
          data: { firstName: 'Updated', lastName: 'Two' },
        },
      ],
    };

    it('should update multiple customers successfully', async () => {
      // Arrange
      const updatedCustomers = bulkUpdateDto.updates.map(update =>
        createTestCustomer({ id: update.id, ...update.data })
      );

      jest.spyOn(service, 'update')
        .mockResolvedValueOnce(service['mapToResponseDto'](updatedCustomers[0]))
        .mockResolvedValueOnce(service['mapToResponseDto'](updatedCustomers[1]));

      // Act
      const results = await service.bulkUpdate(bulkUpdateDto, 'updated-by-user');

      // Assert
      expect(results).toHaveLength(2);
      expect(results.every(result => result.success)).toBe(true);
      expect(service.update).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in bulk update', async () => {
      // Arrange
      const updatedCustomer = createTestCustomer({ 
        id: 'customer-1',
        ...bulkUpdateDto.updates[0].data 
      });

      jest.spyOn(service, 'update')
        .mockResolvedValueOnce(service['mapToResponseDto'](updatedCustomer))
        .mockRejectedValueOnce(new CustomerNotFoundException('customer-2'));

      // Act
      const results = await service.bulkUpdate(bulkUpdateDto);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('Customer not found');
    });
  });

  describe('bulkDelete', () => {
    const bulkDeleteDto: BulkDeleteCustomerDto = {
      customerIds: ['customer-1', 'customer-2', 'customer-3'],
    };

    it('should delete multiple customers successfully', async () => {
      // Arrange
      jest.spyOn(service, 'remove')
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      // Act
      const results = await service.bulkDelete(bulkDeleteDto);

      // Assert
      expect(results).toHaveLength(3);
      expect(results.every(result => result.success)).toBe(true);
      expect(service.remove).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in bulk delete', async () => {
      // Arrange
      jest.spyOn(service, 'remove')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new CustomerNotFoundException('customer-2'))
        .mockResolvedValueOnce(undefined);

      // Act
      const results = await service.bulkDelete(bulkDeleteDto);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return customer statistics', async () => {
      // Arrange
      const statsData = {
        total: 100,
        activeCount: 80,
        inactiveCount: 15,
        withGoogleAccount: 60,
        recentCount: 25,
      };

      prisma.tenantAware.customer.count
        .mockResolvedValueOnce(statsData.total)
        .mockResolvedValueOnce(statsData.activeCount)
        .mockResolvedValueOnce(statsData.inactiveCount)
        .mockResolvedValueOnce(statsData.withGoogleAccount)
        .mockResolvedValueOnce(statsData.recentCount);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result).toEqual({
        total: 100,
        byStatus: {
          active: 80,
          inactive: 15,
          suspended: 5, // 100 - 80 - 15
        },
        withGoogleAccount: 60,
        withoutGoogleAccount: 40, // 100 - 60
        recentlyCreated: 25,
        tenantId: mockTenantId,
        lastUpdated: expect.any(Date),
      });
    });

    it('should use cache for statistics', async () => {
      // Arrange
      const cachedStats = { total: 50, byStatus: {} };
      cacheService.getOrSet.mockResolvedValue(cachedStats);

      // Act
      const result = await service.getStats();

      // Assert
      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'customers:stats',
        expect.any(Function),
        { ttl: 600 }
      );
      expect(result).toBe(cachedStats);
    });

    it('should throw InvalidCustomerDataException when tenant context is missing', async () => {
      // Arrange
      jest.spyOn(TenantContextService, 'getTenantId').mockReturnValue(null);

      // Act & Assert
      await expectError(
        () => service.getStats(),
        'Tenant context is required'
      );
    });
  });

  describe('buildWhereClause', () => {
    it('should build correct where clause for search query', async () => {
      // Arrange
      const query = { search: 'john' };
      
      // Act - Access private method through service instance
      const whereClause = service['buildWhereClause'](query);

      // Assert
      expect(whereClause).toEqual({
        OR: [
          { firstName: { contains: 'john', mode: 'insensitive' } },
          { lastName: { contains: 'john', mode: 'insensitive' } },
          { fullName: { contains: 'john', mode: 'insensitive' } },
          { email: { contains: 'john', mode: 'insensitive' } },
          { company: { contains: 'john', mode: 'insensitive' } },
        ],
      });
    });

    it('should build correct where clause for status filter', async () => {
      // Arrange
      const query = { status: CustomerStatus.ACTIVE };
      
      // Act
      const whereClause = service['buildWhereClause'](query);

      // Assert
      expect(whereClause).toEqual({
        status: CustomerStatus.ACTIVE,
      });
    });

    it('should build correct where clause for Google account filter', async () => {
      // Arrange
      const query = { hasGoogleAccount: true };
      
      // Act
      const whereClause = service['buildWhereClause'](query);

      // Assert
      expect(whereClause).toEqual({
        googleAccountId: { not: null },
      });
    });

    it('should build correct where clause for date range filters', async () => {
      // Arrange
      const query = {
        createdAfter: '2024-01-01',
        createdBefore: '2024-12-31',
      };
      
      // Act
      const whereClause = service['buildWhereClause'](query);

      // Assert
      expect(whereClause).toEqual({
        createdAt: {
          gte: new Date('2024-01-01'),
          lte: new Date('2024-12-31'),
        },
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle concurrent customer creation with same email', async () => {
      // Arrange
      const createDto = {
        email: 'concurrent@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      // First call finds no existing customer
      prisma.tenantAware.customer.findFirst.mockResolvedValueOnce(null);
      // But create fails due to concurrent insertion
      prisma.tenantAware.customer.create.mockRejectedValueOnce(
        new Error('unique constraint violation')
      );

      // Act & Assert
      await expectError(
        () => service.create(createDto),
        InvalidCustomerDataException
      );
    });

    it('should handle very large result sets efficiently', async () => {
      // Arrange
      const largeQuery = { limit: 1000 };
      const customers = Array.from({ length: 1000 }, (_, i) =>
        createTestCustomer({ id: `customer-${i}` })
      );

      prisma.tenantAware.customer.findMany.mockResolvedValue(customers);
      prisma.tenantAware.customer.count.mockResolvedValue(1000);

      // Act
      const start = Date.now();
      await service.findAll(largeQuery);
      const duration = Date.now() - start;

      // Assert - Should complete within reasonable time
      expect(duration).toBeLessThan(1000);
      expect(prisma.tenantAware.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 1000,
        })
      );
    });

    it('should handle malformed custom fields gracefully', async () => {
      // Arrange
      const createDto = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        customFields: { invalidJson: 'test' },
      };

      prisma.tenantAware.customer.findFirst.mockResolvedValue(null);
      prisma.tenantAware.customer.create.mockResolvedValue(
        createTestCustomer(createDto)
      );

      // Act & Assert - Should not throw error
      const result = await service.create(createDto);
      expect(result).toBeDefined();
    });
  });

  describe('performance tests', () => {
    it('should handle bulk operations efficiently', async () => {
      // Arrange
      const bulkSize = 100;
      const bulkCreateDto: BulkCreateCustomerDto = {
        customers: Array.from({ length: bulkSize }, (_, i) => ({
          email: `bulk${i}@example.com`,
          firstName: `Bulk${i}`,
          lastName: 'User',
        })),
      };

      jest.spyOn(service, 'create').mockImplementation(async (dto) => 
        service['mapToResponseDto'](createTestCustomer(dto))
      );

      // Act
      const start = Date.now();
      const results = await service.bulkCreate(bulkCreateDto);
      const duration = Date.now() - start;

      // Assert
      expect(results).toHaveLength(bulkSize);
      expect(results.every(r => r.success)).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});