import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceSettingsController } from './compliance-settings.controller';
import { ComplianceSettingsService } from '../services/compliance-settings.service';
import { CreateComplianceSettingsDto } from '../dto/create-compliance-settings.dto';

describe('ComplianceSettingsController', () => {
  let controller: ComplianceSettingsController;
  let service: ComplianceSettingsService;

  const mockComplianceSettingsService = {
    findByTenant: jest.fn(),
    createOrUpdate: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    tenantId: 'tenant-123',
    email: 'test@example.com',
    role: 'ADMIN',
  };

  const mockComplianceSettings = {
    id: 'settings-123',
    tenantId: 'tenant-123',
    companyName: 'Test Company',
    companyAddress: '123 Test St',
    companyEmail: 'company@test.com',
    companyPhone: '+1-555-0100',
    dpoName: 'Jane Doe',
    dpoEmail: 'dpo@test.com',
    dpoPhone: '+1-555-0101',
    ccpaTollFreeNumber: '1-800-555-0100',
    apiContactEmail: 'api@test.com',
    privacyContactEmail: 'privacy@test.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-123',
    updatedBy: 'user-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComplianceSettingsController],
      providers: [
        {
          provide: ComplianceSettingsService,
          useValue: mockComplianceSettingsService,
        },
      ],
    }).compile();

    controller = module.get<ComplianceSettingsController>(
      ComplianceSettingsController,
    );
    service = module.get<ComplianceSettingsService>(ComplianceSettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSettings', () => {
    it('should return compliance settings for the tenant', async () => {
      mockComplianceSettingsService.findByTenant.mockResolvedValue(
        mockComplianceSettings,
      );

      const result = await controller.getSettings(mockUser as any);

      expect(result).toEqual(mockComplianceSettings);
      expect(mockComplianceSettingsService.findByTenant).toHaveBeenCalledWith(
        mockUser.tenantId,
      );
    });

    it('should return null if settings not found', async () => {
      mockComplianceSettingsService.findByTenant.mockResolvedValue(null);

      const result = await controller.getSettings(mockUser as any);

      expect(result).toBeNull();
      expect(mockComplianceSettingsService.findByTenant).toHaveBeenCalledWith(
        mockUser.tenantId,
      );
    });
  });

  describe('updateSettings', () => {
    const createDto: CreateComplianceSettingsDto = {
      companyName: 'Test Company',
      companyAddress: '123 Test St',
      companyEmail: 'company@test.com',
      companyPhone: '+1-555-0100',
      dpoName: 'Jane Doe',
      dpoEmail: 'dpo@test.com',
      dpoPhone: '+1-555-0101',
      ccpaTollFreeNumber: '1-800-555-0100',
      apiContactEmail: 'api@test.com',
      privacyContactEmail: 'privacy@test.com',
    };

    it('should create or update compliance settings', async () => {
      mockComplianceSettingsService.createOrUpdate.mockResolvedValue(
        mockComplianceSettings,
      );

      const result = await controller.updateSettings(mockUser as any, createDto);

      expect(result).toEqual(mockComplianceSettings);
      expect(mockComplianceSettingsService.createOrUpdate).toHaveBeenCalledWith(
        mockUser.tenantId,
        createDto,
        mockUser.id,
      );
    });

    it('should update existing settings with new values', async () => {
      const updatedSettings = {
        ...mockComplianceSettings,
        companyName: 'Updated Company',
      };
      mockComplianceSettingsService.createOrUpdate.mockResolvedValue(
        updatedSettings,
      );

      const updateDto = {
        ...createDto,
        companyName: 'Updated Company',
      };

      const result = await controller.updateSettings(mockUser as any, updateDto);

      expect(result.companyName).toBe('Updated Company');
      expect(mockComplianceSettingsService.createOrUpdate).toHaveBeenCalledWith(
        mockUser.tenantId,
        updateDto,
        mockUser.id,
      );
    });
  });
});
