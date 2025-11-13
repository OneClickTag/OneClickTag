/**
 * Unit tests for AuthService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

import { AuthService } from './auth.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { FirebaseAuthService } from './firebase-auth.service';
import { FirebaseAuthDto } from '../dto';
import { 
  createTestUser, 
  createTestTenant, 
  expectError,
  random 
} from '../../../../test/utils/test-helpers';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: DeepMockProxy<PrismaService>;
  let jwtService: DeepMockProxy<JwtService>;
  let configService: DeepMockProxy<ConfigService>;
  let firebaseAuthService: DeepMockProxy<FirebaseAuthService>;

  beforeEach(async () => {
    // Create mocks
    prisma = mockDeep<PrismaService>();
    jwtService = mockDeep<JwtService>();
    configService = mockDeep<ConfigService>();
    firebaseAuthService = mockDeep<FirebaseAuthService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: FirebaseAuthService, useValue: firebaseAuthService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Setup default config values
    configService.get.mockImplementation((key: string) => {
      const config = {
        'auth.jwtSecret': 'test-jwt-secret',
        'auth.jwtRefreshSecret': 'test-jwt-refresh-secret',
        'auth.jwtExpiresIn': '15m',
        'auth.jwtRefreshExpiresIn': '7d',
      };
      return config[key];
    });
  });

  describe('authenticateWithFirebase', () => {
    const mockFirebaseToken = {
      uid: 'firebase-uid-123',
      email: 'test@example.com',
      name: 'Test User',
      aud: 'test-app',
      auth_time: Date.now() / 1000,
      exp: Date.now() / 1000 + 3600,
      iat: Date.now() / 1000,
      iss: 'https://securetoken.google.com/test-app',
      sub: 'firebase-uid-123',
      firebase: {
        identities: {
          email: ['test@example.com']
        },
        sign_in_provider: 'password'
      }
    };

    const firebaseAuthDto: FirebaseAuthDto = {
      idToken: 'firebase-id-token',
      tenantId: 'tenant-123',
    };

    it('should authenticate existing user successfully', async () => {
      // Arrange
      const tenant = createTestTenant({ id: 'tenant-123' });
      const user = createTestUser({
        id: 'user-123',
        firebaseId: 'firebase-uid-123',
        email: 'test@example.com',
        tenantId: 'tenant-123',
        tenant,
      });

      firebaseAuthService.verifyIdToken.mockResolvedValue(mockFirebaseToken);
      // @ts-ignore - bypass circular type issue
      prisma.user.findUnique.mockResolvedValue(user);
      jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      // Act
      const result = await service.authenticateWithFirebase(firebaseAuthDto);

      // Assert
      expect(firebaseAuthService.verifyIdToken).toHaveBeenCalledWith('firebase-id-token');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { firebaseId: 'firebase-uid-123' },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              domain: true,
              isActive: true,
            },
          },
        },
      });

      expect(result).toEqual({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenant: user.tenant,
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should create new user when user does not exist', async () => {
      // Arrange
      const tenant = createTestTenant({ id: 'tenant-123' });
      const newUser = createTestUser({
        id: 'new-user-123',
        firebaseId: 'firebase-uid-123',
        email: 'test@example.com',
        name: 'Test User',
        tenantId: 'tenant-123',
        tenant,
      });

      firebaseAuthService.verifyIdToken.mockResolvedValue(mockFirebaseToken);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(newUser);
      jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      // Act
      const result = await service.authenticateWithFirebase(firebaseAuthDto);

      // Assert
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          firebaseId: 'firebase-uid-123',
          tenantId: 'tenant-123',
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              domain: true,
              isActive: true,
            },
          },
        },
      });

      expect(result.user.id).toBe('new-user-123');
    });

    it('should create user name from email when name is not provided', async () => {
      // Arrange
      const mockTokenWithoutName = {
        uid: 'firebase-uid-123',
        email: 'test@example.com',
        name: undefined,
        aud: 'test-app',
        auth_time: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
        iat: Date.now() / 1000,
        iss: 'https://securetoken.google.com/test-app',
        sub: 'firebase-uid-123',
        firebase: {
          identities: {
            email: ['test@example.com']
          },
          sign_in_provider: 'password'
        }
      };

      firebaseAuthService.verifyIdToken.mockResolvedValue(mockTokenWithoutName);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(createTestUser());
      jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      // Act
      await service.authenticateWithFirebase(firebaseAuthDto);

      // Assert
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'test', // Should be extracted from email
          }),
        })
      );
    });

    it('should handle user with inactive tenant', async () => {
      // Arrange
      const inactiveTenant = createTestTenant({ 
        id: 'tenant-123',
        isActive: false,
      });
      const user = createTestUser({
        tenantId: 'tenant-123',
        tenant: inactiveTenant,
      });

      firebaseAuthService.verifyIdToken.mockResolvedValue(mockFirebaseToken);
      // @ts-ignore - bypass circular type issue
      prisma.user.findUnique.mockResolvedValue(user);

      // Act & Assert
      await expectError(
        () => service.authenticateWithFirebase(firebaseAuthDto),
        'Tenant is not active'
      );
    });

    it('should throw UnauthorizedException when Firebase token is invalid', async () => {
      // Arrange
      firebaseAuthService.verifyIdToken.mockRejectedValue(new Error('Invalid token'));

      // Act & Assert
      await expectError(
        () => service.authenticateWithFirebase(firebaseAuthDto),
        UnauthorizedException
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      // Arrange
      const user = createTestUser();
      const refreshToken = 'valid-refresh-token';
      
      jwtService.verify.mockReturnValue({ sub: user.id });
      // @ts-ignore - bypass circular type issue
      prisma.user.findUnique.mockResolvedValue(user);
      jwtService.sign.mockReturnValue('new-access-token');

      // Act
      const result = await service.refreshToken(refreshToken);

      // Assert
      expect(jwtService.verify).toHaveBeenCalledWith(refreshToken, {
        secret: 'test-jwt-refresh-secret',
      });
      expect(result.accessToken).toBe('new-access-token');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      // Arrange
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expectError(
        () => service.refreshToken('invalid-token'),
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      jwtService.verify.mockReturnValue({ sub: 'non-existent-user' });
      prisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expectError(
        () => service.refreshToken('valid-token'),
        UnauthorizedException
      );
    });
  });

  describe('validateUser', () => {
    it('should validate user successfully', async () => {
      // Arrange
      const user = createTestUser();
      // @ts-ignore - bypass circular type issue
      prisma.user.findUnique.mockResolvedValue(user);

      // Act
      const result = await service.validateUser(user.id);

      // Assert
      expect(result).toEqual(user);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: user.id },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              domain: true,
              isActive: true,
            },
          },
        },
      });
    });

    it('should return null when user not found', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.validateUser('non-existent-user');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when user tenant is inactive', async () => {
      // Arrange
      const userWithInactiveTenant = createTestUser({
        tenant: createTestTenant({ isActive: false }),
      });
      prisma.user.findUnique.mockResolvedValue(userWithInactiveTenant);

      // Act
      const result = await service.validateUser(userWithInactiveTenant.id);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('createTenant', () => {
    const createTenantDto = {
      name: 'Test Tenant',
      domain: 'test.example.com',
      adminEmail: 'admin@test.example.com',
      plan: 'premium' as const,
    };

    it('should create tenant successfully', async () => {
      // Arrange
      const tenant = createTestTenant({
        name: createTenantDto.name,
        domain: createTenantDto.domain,
      });
      const adminUser = createTestUser({
        email: createTenantDto.adminEmail,
        tenantId: tenant.id,
        role: 'admin',
      });

      // @ts-ignore - bypass circular type issue
      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback(prisma as any);
      });
      prisma.tenant.create.mockResolvedValue(tenant);
      prisma.user.create.mockResolvedValue(adminUser);

      // Act
      const result = await service.createTenant(createTenantDto, 'owner-123');

      // Assert
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { domain: createTenantDto.domain },
      });
      expect(result).toEqual({
        tenant,
        adminUser,
      });
    });

    it('should throw ConflictException when domain already exists', async () => {
      // Arrange
      const existingTenant = createTestTenant({
        domain: createTenantDto.domain,
      });
      prisma.tenant.findUnique.mockResolvedValue(existingTenant);

      // Act & Assert
      await expectError(
        () => service.createTenant(createTenantDto, 'owner-123'),
        ConflictException
      );
    });

    it('should create tenant with correct settings based on plan', async () => {
      // Arrange
      // @ts-ignore - bypass circular type issue
      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback(prisma as any);
      });
      prisma.tenant.create.mockResolvedValue(createTestTenant());
      prisma.user.create.mockResolvedValue(createTestUser());

      // Act
      await service.createTenant(createTenantDto, 'owner-123');

      // Assert
      expect(prisma.tenant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          settings: expect.objectContaining({
            features: expect.arrayContaining(['basic_tracking']),
            limits: expect.objectContaining({
              customers: 100,
              campaigns: 10,
            }),
          }),
        }),
      });
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      // Arrange
      const user = createTestUser();
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      // Act
      const result = await service.generateTokens(user);

      // Assert
      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          sub: user.id,
          email: user.email,
          tenantId: user.tenantId,
          role: user.role,
        },
        { secret: 'test-jwt-secret', expiresIn: '15m' }
      );

      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: user.id },
        { secret: 'test-jwt-refresh-secret', expiresIn: '7d' }
      );

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Arrange
      firebaseAuthService.verifyIdToken.mockResolvedValue({
        uid: 'firebase-uid',
        email: 'test@example.com',
        name: 'Test User',
        aud: 'test-app',
        auth_time: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
        iat: Date.now() / 1000,
        iss: 'https://securetoken.google.com/test-app',
        sub: 'firebase-uid',
        firebase: {
          identities: {
            email: ['test@example.com']
          },
          sign_in_provider: 'password'
        }
      });
      prisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expectError(
        () => service.authenticateWithFirebase({
          idToken: 'token',
          tenantId: 'tenant-id',
        }),
        'Database connection failed'
      );
    });

    it('should handle malformed JWT tokens', async () => {
      // Arrange
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token format');
      });

      // Act & Assert
      await expectError(
        () => service.refreshToken('malformed-token'),
        UnauthorizedException
      );
    });

    it('should handle missing Firebase UID', async () => {
      // Arrange
      firebaseAuthService.verifyIdToken.mockResolvedValue({
        uid: '', // Empty UID
        email: 'test@example.com',
        name: 'Test User',
        aud: 'test-app',
        auth_time: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
        iat: Date.now() / 1000,
        iss: 'https://securetoken.google.com/test-app',
        sub: '',
        firebase: {
          identities: {
            email: ['test@example.com']
          },
          sign_in_provider: 'password'
        }
      });

      // Act & Assert
      await expectError(
        () => service.authenticateWithFirebase({
          idToken: 'token',
          tenantId: 'tenant-id',
        }),
        'Invalid Firebase token'
      );
    });
  });

  describe('performance and concurrency', () => {
    it('should handle concurrent authentication requests', async () => {
      // Arrange
      const firebaseToken = {
        uid: 'firebase-uid-123',
        email: 'test@example.com',
        name: 'Test User',
        sub: 'firebase-uid-123',
        aud: 'project-id',
        auth_time: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: 'https://securetoken.google.com/project-id',
        firebase: {
          identities: {},
          sign_in_provider: 'password',
        },
      };

      firebaseAuthService.verifyIdToken.mockResolvedValue(firebaseToken);
      prisma.user.findUnique.mockResolvedValue(null);
      
      let createCallCount = 0;
      (prisma.user.create as any).mockImplementation(() => {
        createCallCount++;
        if (createCallCount === 1) {
          // First call succeeds
          return Promise.resolve(createTestUser({
            firebaseId: 'firebase-uid-123',
          }));
        } else {
          // Subsequent calls should find existing user
          throw new Error('User already exists');
        }
      });

      jwtService.sign.mockReturnValue('token');

      // Act - Simulate concurrent requests
      const requests = Array(5).fill(null).map(() => 
        service.authenticateWithFirebase({
          idToken: 'firebase-token',
          tenantId: 'tenant-id',
        })
      );

      const results = await Promise.allSettled(requests);

      // Assert - At least one should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);
    });

    it('should have reasonable performance for token generation', async () => {
      // Arrange
      const user = createTestUser();
      jwtService.sign.mockReturnValue('token');

      // Act
      const start = Date.now();
      await service.generateTokens(user);
      const duration = Date.now() - start;

      // Assert - Should complete within 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});