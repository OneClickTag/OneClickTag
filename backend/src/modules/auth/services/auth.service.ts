import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { FirebaseAuthService } from './firebase-auth.service';
import { FirebaseAuthDto, CreateTenantDto, LoginResponseDto } from '../dto';
import { AuthenticatedUser } from '../strategies/jwt.strategy';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private firebaseAuthService: FirebaseAuthService,
  ) {}

  async authenticateWithFirebase(firebaseAuthDto: FirebaseAuthDto): Promise<LoginResponseDto> {
    const { idToken, tenantId } = firebaseAuthDto;

    // Verify Firebase token
    const decodedToken = await this.firebaseAuthService.verifyIdToken(idToken);

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { firebaseId: decodedToken.uid },
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

    if (!user) {
      // Create new tenant for the user if no tenantId provided
      let finalTenantId = tenantId;
      if (!finalTenantId) {
        const userDomain = decodedToken.email.split('@')[1];
        // First try to find existing tenant by domain
        let tenant = await this.prisma.tenant.findUnique({
          where: { domain: userDomain },
        });
        
        // If no tenant exists for this domain, create one
        if (!tenant) {
          tenant = await this.prisma.tenant.create({
            data: {
              name: `${decodedToken.name || decodedToken.email.split('@')[0]}'s Organization`,
              domain: userDomain,
              isActive: true,
            },
          });
        }
        finalTenantId = tenant.id;
      }

      // Create new user
      user = await this.prisma.user.create({
        data: {
          email: decodedToken.email,
          name: decodedToken.name || decodedToken.email.split('@')[0],
          firebaseId: decodedToken.uid,
          tenantId: finalTenantId,
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
    } else if (!user.tenantId) {
      // Create tenant for existing user without one
      const userDomain = user.email.split('@')[1];
      const tenant = await this.prisma.tenant.create({
        data: {
          name: `${user.name || user.email.split('@')[0]}'s Organization`,
          domain: userDomain,
          isActive: true,
        },
      });

      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { tenantId: tenant.id },
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
    } else if (tenantId && user.tenantId !== tenantId) {
      // Update user's tenant if provided and different
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { tenantId },
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
    }

    // Check if tenant is active
    if (user.tenant && !user.tenant.isActive) {
      throw new UnauthorizedException('Tenant is inactive');
    }

    // Generate JWT tokens
    const payload = {
      sub: user.id,
      email: user.email,
      firebaseId: user.firebaseId,
      tenantId: user.tenantId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION', '15m'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION', '7d'),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
      },
      tenant: user.tenant || undefined,
    };
  }

  async refreshToken(refreshToken: string): Promise<LoginResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
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

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (user.tenant && !user.tenant.isActive) {
        throw new UnauthorizedException('Tenant is inactive');
      }

      // Generate new tokens
      const newPayload = {
        sub: user.id,
        email: user.email,
        firebaseId: user.firebaseId,
        tenantId: user.tenantId,
      };

      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION', '15m'),
      });

      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION', '7d'),
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
        },
        tenant: user.tenant || undefined,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async createTenant(createTenantDto: CreateTenantDto, ownerId: string) {
    const { name, domain, settings } = createTenantDto;

    // Check if domain is already taken
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { domain },
    });

    if (existingTenant) {
      throw new ConflictException('Domain is already taken');
    }

    // Create tenant
    const tenant = await this.prisma.tenant.create({
      data: {
        name,
        domain,
        settings,
      },
    });

    // Assign user to tenant
    await this.prisma.user.update({
      where: { id: ownerId },
      data: { tenantId: tenant.id },
    });

    return tenant;
  }

  async validateUser(userId: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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

    if (!user) {
      return null;
    }

    if (user.tenant && !user.tenant.isActive) {
      throw new UnauthorizedException('Tenant is inactive');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      firebaseId: user.firebaseId,
      tenantId: user.tenantId,
      tenant: user.tenant,
    };
  }

  async getUserProfile(userId: string): Promise<AuthenticatedUser> {
    const user = await this.validateUser(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async generateTokens(user: any): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: user.id,
      email: user.email,
      firebaseId: user.firebaseId,
      tenantId: user.tenantId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION', '15m'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION', '7d'),
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}