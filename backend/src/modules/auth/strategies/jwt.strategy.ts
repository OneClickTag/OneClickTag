import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  firebaseId?: string;
  tenantId?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  firebaseId?: string;
  tenantId?: string;
  role: string;
  tenant?: {
    id: string;
    name: string;
    domain: string;
    isActive: boolean;
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request) => {
          // Support query param for SSE connections (EventSource can't send custom headers)
          return request.query?.authorization as string;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    try {
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

      if (user.tenantId && user.tenant && !user.tenant.isActive) {
        throw new UnauthorizedException('Tenant is inactive');
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        firebaseId: user.firebaseId,
        tenantId: user.tenantId,
        role: user.role,
        tenant: user.tenant,
      };
    } catch (error) {
      // If database is temporarily unavailable (e.g., during server restart),
      // fall back to JWT payload data to maintain session
      if (error instanceof UnauthorizedException) {
        throw error; // Re-throw auth errors
      }

      // Database connection error during restart - use JWT payload as fallback
      // This allows valid tokens to work even if DB is momentarily unavailable
      console.warn('Database unavailable during JWT validation, using payload fallback:', error.message);

      return {
        id: payload.sub,
        email: payload.email,
        name: payload.email.split('@')[0], // Derive name from email
        firebaseId: payload.firebaseId,
        tenantId: payload.tenantId,
        role: payload.role || 'USER', // Default to USER if not in payload
      };
    }
  }
}