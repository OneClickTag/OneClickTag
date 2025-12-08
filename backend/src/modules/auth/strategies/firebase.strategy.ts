import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { FirebaseAuthService } from '../services/firebase-auth.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuthenticatedUser } from './jwt.strategy';

@Injectable()
export class FirebaseStrategy extends PassportStrategy(Strategy, 'firebase') {
  constructor(
    private firebaseAuthService: FirebaseAuthService,
    private prisma: PrismaService,
  ) {
    super();
  }

  async validate(req: Request): Promise<AuthenticatedUser> {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No Firebase token provided');
    }

    const idToken = authHeader.split(' ')[1];
    
    try {
      const decodedToken = await this.firebaseAuthService.verifyIdToken(idToken);
      
      // Find or create user based on Firebase UID
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
        // Create new user if not exists
        user = await this.prisma.user.create({
          data: {
            email: decodedToken.email,
            name: decodedToken.name || decodedToken.email.split('@')[0],
            firebaseId: decodedToken.uid,
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
      throw new UnauthorizedException(`Firebase authentication failed: ${error.message}`);
    }
  }
}