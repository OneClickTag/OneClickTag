/**
 * Unit tests for TenantService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

import { TenantService, CreateTenantData, UpdateTenantData } from './tenant.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TenantContextService } from './tenant-context.service';
import { withoutTenantIsolation, withTenantContext } from '../extensions/prisma-tenant.extension';
import { 
  createTestTenant, 
  createTestUser,
  expectError,
  random 
} from '../../../../test/utils/test-helpers';

// Mock the tenant extension functions
jest.mock('../extensions/prisma-tenant.extension', () => ({
  withoutTenantIsolation: jest.fn((callback) => callback()),
  withTenantContext: jest.fn((tenantId, callback) => callback()),
}));

describe('TenantService', () => {
  let service: TenantService;
  let prisma: DeepMockProxy<PrismaService>;

  const mockTenantId = 'test-tenant-id';

  beforeEach(async () => {
    // Create mocks
    prisma = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);

    // Mock TenantContextService.getTenantId
    jest.spyOn(TenantContextService, 'getTenantId').mockReturnValue(mockTenantId);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTenant', () => {
    const createTenantData: CreateTenantData = {
      name: 'Test Tenant',
      domain: 'test.example.com',
      settings: { feature1: true },
      isActive: true,
    };

    it('should create tenant successfully', async () => {
      // Arrange
      const expectedTenant = createTestTenant({
        id: 'new-tenant-id',
        ...createTenantData,
        _count: { users: 0, oauthTokens: 0 },
      });

      prisma.tenant.findUnique.mockResolvedValue(null); // No existing tenant
      prisma.tenant.create.mockResolvedValue(expectedTenant);

      // Act
      const result = await service.createTenant(createTenantData);

      // Assert
      expect(withoutTenantIsolation).toHaveBeenCalled();
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { domain: createTenantData.domain },
      });
      expect(prisma.tenant.create).toHaveBeenCalledWith({
        data: {
          name: createTenantData.name,
          domain: createTenantData.domain,
          settings: createTenantData.settings,
          isActive: createTenantData.isActive,
        },
        include: {
          _count: {
            select: {
              users: true,
              oauthTokens: true,
            },
          },
        },
      });
      expect(result).toEqual(expectedTenant);
    });

    it('should set default values for optional fields', async () => {
      // Arrange
      const minimalData = {
        name: 'Minimal Tenant',
        domain: 'minimal.example.com',
      };

      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.tenant.create.mockResolvedValue(createTestTenant(minimalData));

      // Act
      await service.createTenant(minimalData);

      // Assert
      expect(prisma.tenant.create).toHaveBeenCalledWith({
        data: {
          name: minimalData.name,
          domain: minimalData.domain,
          settings: {}, // Default empty settings
          isActive: true, // Default active
        },
        include: expect.any(Object),
      });
    });

    it('should throw ConflictException when domain already exists', async () => {
      // Arrange
      const existingTenant = createTestTenant({ domain: createTenantData.domain });
      prisma.tenant.findUnique.mockResolvedValue(existingTenant);

      // Act & Assert
      await expectError(
        () => service.createTenant(createTenantData),
        ConflictException
      );

      expect(prisma.tenant.create).not.toHaveBeenCalled();
    });
  });

  describe('getAllTenants', () => {
    const mockTenants = [
      createTestTenant({ id: '1', name: 'Tenant 1', isActive: true }),
      createTestTenant({ id: '2', name: 'Tenant 2', isActive: true }),
      createTestTenant({ id: '3', name: 'Tenant 3', isActive: false }),
    ];

    it('should return only active tenants by default', async () => {
      // Arrange
      const activeTenants = mockTenants.filter(t => t.isActive);
      prisma.tenant.findMany.mockResolvedValue(activeTenants);

      // Act
      const result = await service.getAllTenants();

      // Assert
      expect(withoutTenantIsolation).toHaveBeenCalled();
      expect(prisma.tenant.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: {
          _count: {
            select: {
              users: true,
              oauthTokens: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(activeTenants);
    });

    it('should return all tenants when includeInactive is true', async () => {
      // Arrange
      prisma.tenant.findMany.mockResolvedValue(mockTenants);

      // Act
      const result = await service.getAllTenants(true);

      // Assert
      expect(prisma.tenant.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockTenants);
    });
  });

  describe('getTenantById', () => {
    const tenantId = 'tenant-123';

    it('should return tenant by ID successfully', async () => {
      // Arrange
      const tenant = createTestTenant({ id: tenantId });
      prisma.tenant.findUnique.mockResolvedValue(tenant);

      // Act
      const result = await service.getTenantById(tenantId);

      // Assert
      expect(withoutTenantIsolation).toHaveBeenCalled();
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: tenantId },
        include: {
          _count: {
            select: {
              users: true,
              oauthTokens: true,
            },
          },
        },
      });
      expect(result).toEqual(tenant);
    });

    it('should throw NotFoundException when tenant not found', async () => {
      // Arrange
      prisma.tenant.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expectError(
        () => service.getTenantById(tenantId),
        NotFoundException
      );
    });
  });

  describe('getTenantByDomain', () => {
    const domain = 'test.example.com';

    it('should return tenant by domain successfully', async () => {
      // Arrange
      const tenant = createTestTenant({ domain });
      prisma.tenant.findUnique.mockResolvedValue(tenant);

      // Act
      const result = await service.getTenantByDomain(domain);

      // Assert
      expect(withoutTenantIsolation).toHaveBeenCalled();
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { domain },
        include: {
          _count: {
            select: {
              users: true,
              oauthTokens: true,
            },
          },
        },
      });
      expect(result).toEqual(tenant);
    });

    it('should throw NotFoundException when tenant not found', async () => {
      // Arrange
      prisma.tenant.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expectError(
        () => service.getTenantByDomain(domain),
        NotFoundException
      );
    });
  });

  describe('updateTenant', () => {
    const tenantId = 'tenant-123';
    const updateData: UpdateTenantData = {
      name: 'Updated Tenant',
      settings: { newFeature: true },
      isActive: false,
    };

    it('should update tenant successfully', async () => {
      // Arrange
      const updatedTenant = createTestTenant({ id: tenantId, ...updateData });
      prisma.tenant.update.mockResolvedValue(updatedTenant);

      // Act
      const result = await service.updateTenant(tenantId, updateData);

      // Assert
      expect(withoutTenantIsolation).toHaveBeenCalled();
      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: tenantId },
        data: updateData,
        include: {
          _count: {
            select: {
              users: true,
              oauthTokens: true,
            },
          },
        },
      });
      expect(result).toEqual(updatedTenant);
    });

    it('should check for domain conflicts when updating domain', async () => {
      // Arrange
      const updateWithDomain = { ...updateData, domain: 'new.example.com' };
      const existingTenant = createTestTenant({ 
        id: 'other-tenant', 
        domain: updateWithDomain.domain 
      });

      prisma.tenant.findFirst.mockResolvedValue(existingTenant);

      // Act & Assert
      await expectError(
        () => service.updateTenant(tenantId, updateWithDomain),
        ConflictException
      );

      expect(prisma.tenant.findFirst).toHaveBeenCalledWith({
        where: {
          domain: updateWithDomain.domain,
          NOT: { id: tenantId },
        },
      });
      expect(prisma.tenant.update).not.toHaveBeenCalled();
    });

    it('should allow domain update when no conflict exists', async () => {
      // Arrange
      const updateWithDomain = { ...updateData, domain: 'new.example.com' };
      const updatedTenant = createTestTenant({ id: tenantId, ...updateWithDomain });

      prisma.tenant.findFirst.mockResolvedValue(null); // No conflict
      prisma.tenant.update.mockResolvedValue(updatedTenant);

      // Act
      const result = await service.updateTenant(tenantId, updateWithDomain);

      // Assert
      expect(result).toEqual(updatedTenant);
    });

    it('should throw NotFoundException when tenant not found', async () => {
      // Arrange
      const error = { code: 'P2025' }; // Prisma "Record to update not found" error
      prisma.tenant.update.mockRejectedValue(error);

      // Act & Assert
      await expectError(
        () => service.updateTenant(tenantId, updateData),
        NotFoundException
      );
    });

    it('should rethrow other database errors', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      prisma.tenant.update.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.updateTenant(tenantId, updateData)).rejects.toThrow(dbError);
    });
  });

  describe('deleteTenant', () => {
    const tenantId = 'tenant-123';

    it('should delete tenant successfully', async () => {
      // Arrange
      const deletedTenant = createTestTenant({ id: tenantId });
      prisma.tenant.delete.mockResolvedValue(deletedTenant);

      // Act
      const result = await service.deleteTenant(tenantId);

      // Assert
      expect(withoutTenantIsolation).toHaveBeenCalled();
      expect(prisma.tenant.delete).toHaveBeenCalledWith({
        where: { id: tenantId },
      });
      expect(result).toEqual(deletedTenant);
    });

    it('should throw NotFoundException when tenant not found', async () => {
      // Arrange
      const error = { code: 'P2025' }; // Prisma "Record to delete does not exist" error
      prisma.tenant.delete.mockRejectedValue(error);

      // Act & Assert
      await expectError(
        () => service.deleteTenant(tenantId),
        NotFoundException
      );
    });
  });

  describe('deactivateTenant', () => {
    it('should call updateTenant with isActive: false', async () => {
      // Arrange
      const tenantId = 'tenant-123';
      const deactivatedTenant = createTestTenant({ id: tenantId, isActive: false });
      jest.spyOn(service, 'updateTenant').mockResolvedValue(deactivatedTenant);

      // Act
      const result = await service.deactivateTenant(tenantId);

      // Assert
      expect(service.updateTenant).toHaveBeenCalledWith(tenantId, { isActive: false });
      expect(result).toEqual(deactivatedTenant);
    });
  });

  describe('activateTenant', () => {
    it('should call updateTenant with isActive: true', async () => {
      // Arrange
      const tenantId = 'tenant-123';
      const activatedTenant = createTestTenant({ id: tenantId, isActive: true });
      jest.spyOn(service, 'updateTenant').mockResolvedValue(activatedTenant);

      // Act
      const result = await service.activateTenant(tenantId);

      // Assert
      expect(service.updateTenant).toHaveBeenCalledWith(tenantId, { isActive: true });
      expect(result).toEqual(activatedTenant);
    });
  });

  describe('getCurrentTenant', () => {
    it('should return current tenant successfully', async () => {
      // Arrange
      const currentTenant = createTestTenant({ id: mockTenantId });
      jest.spyOn(service, 'getTenantById').mockResolvedValue(currentTenant);

      // Act
      const result = await service.getCurrentTenant();

      // Assert
      expect(service.getTenantById).toHaveBeenCalledWith(mockTenantId);
      expect(result).toEqual(currentTenant);
    });

    it('should throw ForbiddenException when no tenant context', async () => {
      // Arrange
      jest.spyOn(TenantContextService, 'getTenantId').mockReturnValue(null);

      // Act & Assert
      await expectError(
        () => service.getCurrentTenant(),
        ForbiddenException
      );
    });
  });

  describe('updateCurrentTenant', () => {
    const updateData: UpdateTenantData = {
      name: 'Updated Current Tenant',
      settings: { feature: true },
    };

    it('should update current tenant successfully', async () => {
      // Arrange
      const updatedTenant = createTestTenant({ id: mockTenantId, ...updateData });
      jest.spyOn(service, 'updateTenant').mockResolvedValue(updatedTenant);

      // Act
      const result = await service.updateCurrentTenant(updateData);

      // Assert
      expect(service.updateTenant).toHaveBeenCalledWith(mockTenantId, updateData);
      expect(result).toEqual(updatedTenant);
    });

    it('should throw ForbiddenException when no tenant context', async () => {
      // Arrange
      jest.spyOn(TenantContextService, 'getTenantId').mockReturnValue(null);

      // Act & Assert
      await expectError(
        () => service.updateCurrentTenant(updateData),
        ForbiddenException
      );
    });

    it('should prevent tenants from deactivating themselves', async () => {
      // Arrange
      const deactivateData = { isActive: false };

      // Act & Assert
      await expectError(
        () => service.updateCurrentTenant(deactivateData),
        ForbiddenException
      );
    });
  });

  describe('getTenantUsers', () => {
    const mockUsers = [
      createTestUser({ id: '1', tenantId: mockTenantId }),
      createTestUser({ id: '2', tenantId: mockTenantId }),
    ];

    it('should return users for current tenant', async () => {
      // Arrange
      prisma.tenantAware.user.findMany.mockResolvedValue(mockUsers);

      // Act
      const result = await service.getTenantUsers();

      // Assert
      expect(withTenantContext).toHaveBeenCalledWith(mockTenantId, expect.any(Function));
      expect(prisma.tenantAware.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockUsers);
    });

    it('should return users for specified tenant', async () => {
      // Arrange
      const specificTenantId = 'specific-tenant-id';
      prisma.tenantAware.user.findMany.mockResolvedValue(mockUsers);

      // Act
      const result = await service.getTenantUsers(specificTenantId);

      // Assert
      expect(withTenantContext).toHaveBeenCalledWith(specificTenantId, expect.any(Function));
      expect(result).toEqual(mockUsers);
    });

    it('should throw ForbiddenException when no tenant context', async () => {
      // Arrange
      jest.spyOn(TenantContextService, 'getTenantId').mockReturnValue(null);

      // Act & Assert
      await expectError(
        () => service.getTenantUsers(),
        ForbiddenException
      );
    });
  });

  describe('getTenantStats', () => {
    it('should return stats for current tenant', async () => {
      // Arrange
      const userCount = 5;
      const tokenCount = 3;
      
      prisma.tenantAware.user.count.mockResolvedValue(userCount);
      prisma.tenantAware.oAuthToken.count.mockResolvedValue(tokenCount);

      // Act
      const result = await service.getTenantStats();

      // Assert
      expect(withTenantContext).toHaveBeenCalledWith(mockTenantId, expect.any(Function));
      expect(result).toEqual({
        tenantId: mockTenantId,
        userCount,
        oauthTokenCount: tokenCount,
        lastUpdated: expect.any(Date),
      });
    });

    it('should return stats for specified tenant', async () => {
      // Arrange
      const specificTenantId = 'specific-tenant-id';
      const userCount = 10;
      const tokenCount = 7;
      
      prisma.tenantAware.user.count.mockResolvedValue(userCount);
      prisma.tenantAware.oAuthToken.count.mockResolvedValue(tokenCount);

      // Act
      const result = await service.getTenantStats(specificTenantId);

      // Assert
      expect(withTenantContext).toHaveBeenCalledWith(specificTenantId, expect.any(Function));
      expect(result.tenantId).toBe(specificTenantId);
    });
  });

  describe('validateTenantAccess', () => {
    it('should return true for matching tenant ID', async () => {
      // Act
      const result = await service.validateTenantAccess(mockTenantId);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for different tenant ID', async () => {
      // Act
      const result = await service.validateTenantAccess('different-tenant-id');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when no current tenant context', async () => {
      // Arrange
      jest.spyOn(TenantContextService, 'getTenantId').mockReturnValue(null);

      // Act
      const result = await service.validateTenantAccess(mockTenantId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('switchTenantContext', () => {
    const targetTenantId = 'target-tenant-id';
    const mockCallback = jest.fn().mockResolvedValue('callback-result');

    it('should switch context and execute callback successfully', async () => {
      // Arrange
      const activeTenant = createTestTenant({ id: targetTenantId, isActive: true });
      jest.spyOn(service, 'getTenantById').mockResolvedValue(activeTenant);

      // Act
      const result = await service.switchTenantContext(targetTenantId, mockCallback);

      // Assert
      expect(service.getTenantById).toHaveBeenCalledWith(targetTenantId);
      expect(withTenantContext).toHaveBeenCalledWith(targetTenantId, mockCallback);
      expect(result).toBe('callback-result');
    });

    it('should throw ForbiddenException for inactive tenant', async () => {
      // Arrange
      const inactiveTenant = createTestTenant({ id: targetTenantId, isActive: false });
      jest.spyOn(service, 'getTenantById').mockResolvedValue(inactiveTenant);

      // Act & Assert
      await expectError(
        () => service.switchTenantContext(targetTenantId, mockCallback),
        ForbiddenException
      );

      expect(withTenantContext).not.toHaveBeenCalled();
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('bulkUpdateTenants', () => {
    const bulkUpdates = [
      { id: 'tenant-1', data: { name: 'Updated Tenant 1' } },
      { id: 'tenant-2', data: { name: 'Updated Tenant 2' } },
      { id: 'non-existent', data: { name: 'Should Fail' } },
    ];

    it('should process bulk updates with mixed success/failure', async () => {
      // Arrange
      const successfulUpdate1 = createTestTenant({ id: 'tenant-1', name: 'Updated Tenant 1' });
      const successfulUpdate2 = createTestTenant({ id: 'tenant-2', name: 'Updated Tenant 2' });

      jest.spyOn(service, 'updateTenant')
        .mockResolvedValueOnce(successfulUpdate1)
        .mockResolvedValueOnce(successfulUpdate2)
        .mockRejectedValueOnce(new NotFoundException('Tenant not found'));

      // Act
      const results = await service.bulkUpdateTenants(bulkUpdates);

      // Assert
      expect(withoutTenantIsolation).toHaveBeenCalled();
      expect(results).toEqual([
        { success: true, tenantId: 'tenant-1', result: successfulUpdate1 },
        { success: true, tenantId: 'tenant-2', result: successfulUpdate2 },
        { success: false, tenantId: 'non-existent', error: 'Tenant not found' },
      ]);
    });

    it('should handle empty bulk updates', async () => {
      // Act
      const results = await service.bulkUpdateTenants([]);

      // Assert
      expect(results).toEqual([]);
    });
  });

  describe('getTenantsByStatus', () => {
    const activeTenants = [
      createTestTenant({ id: '1', isActive: true }),
      createTestTenant({ id: '2', isActive: true }),
    ];
    const inactiveTenants = [
      createTestTenant({ id: '3', isActive: false }),
    ];

    it('should return active tenants', async () => {
      // Arrange
      prisma.tenant.findMany.mockResolvedValue(activeTenants);

      // Act
      const result = await service.getTenantsByStatus(true);

      // Assert
      expect(withoutTenantIsolation).toHaveBeenCalled();
      expect(prisma.tenant.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: {
          _count: {
            select: {
              users: true,
              oauthTokens: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(activeTenants);
    });

    it('should return inactive tenants', async () => {
      // Arrange
      prisma.tenant.findMany.mockResolvedValue(inactiveTenants);

      // Act
      const result = await service.getTenantsByStatus(false);

      // Assert
      expect(prisma.tenant.findMany).toHaveBeenCalledWith({
        where: { isActive: false },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(inactiveTenants);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      prisma.tenant.findMany.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.getAllTenants()).rejects.toThrow(dbError);
    });

    it('should handle concurrent tenant creation with same domain', async () => {
      // Arrange
      const createData = { name: 'Test', domain: 'concurrent.com' };
      
      // First check passes, but create fails due to concurrent insertion
      prisma.tenant.findUnique.mockResolvedValueOnce(null);
      prisma.tenant.create.mockRejectedValue({ 
        code: 'P2002', 
        message: 'Unique constraint violation' 
      });

      // Act & Assert
      await expect(service.createTenant(createData)).rejects.toThrow();
    });

    it('should handle very large tenant lists efficiently', async () => {
      // Arrange
      const largeTenantList = Array.from({ length: 1000 }, (_, i) =>
        createTestTenant({ id: `tenant-${i}`, name: `Tenant ${i}` })
      );
      prisma.tenant.findMany.mockResolvedValue(largeTenantList);

      // Act
      const start = Date.now();
      const result = await service.getAllTenants();
      const duration = Date.now() - start;

      // Assert
      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle malformed tenant data gracefully', async () => {
      // Arrange
      const malformedData = {
        name: null,
        domain: undefined,
        settings: 'invalid-json-string', // Should be object
      };

      // Mock Prisma to handle validation at DB level
      prisma.tenant.create.mockRejectedValue(new Error('Validation failed'));

      // Act & Assert
      await expect(service.createTenant(malformedData as any)).rejects.toThrow();
    });
  });

  describe('performance tests', () => {
    it('should handle bulk operations efficiently', async () => {
      // Arrange
      const bulkSize = 100;
      const bulkUpdates = Array.from({ length: bulkSize }, (_, i) => ({
        id: `tenant-${i}`,
        data: { name: `Updated Tenant ${i}` },
      }));

      jest.spyOn(service, 'updateTenant').mockImplementation(async (id, data) =>
        createTestTenant({ id, ...data })
      );

      // Act
      const start = Date.now();
      const results = await service.bulkUpdateTenants(bulkUpdates);
      const duration = Date.now() - start;

      // Assert
      expect(results).toHaveLength(bulkSize);
      expect(results.every(r => r.success)).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent tenant access validation', async () => {
      // Arrange
      const promises = Array.from({ length: 10 }, () =>
        service.validateTenantAccess(mockTenantId)
      );

      // Act
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(10);
      expect(results.every(result => result === true)).toBe(true);
    });
  });
});