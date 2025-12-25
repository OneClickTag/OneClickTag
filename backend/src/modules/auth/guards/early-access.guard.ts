import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

/**
 * EarlyAccessGuard - Protects routes during early access/pre-launch mode
 *
 * When EARLY_ACCESS_MODE=true:
 * - Only allows ADMIN and SUPER_ADMIN roles to access protected routes
 * - Throws ForbiddenException for regular users
 *
 * When EARLY_ACCESS_MODE=false:
 * - Allows all authenticated users to access routes
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, EarlyAccessGuard)
 *
 * Note: This guard should be used AFTER JwtAuthGuard to ensure user is authenticated
 */
@Injectable()
export class EarlyAccessGuard implements CanActivate {
  private readonly logger = new Logger(EarlyAccessGuard.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if early access mode is enabled
    const earlyAccessMode = this.configService.get<string>('EARLY_ACCESS_MODE', 'false');
    const isEarlyAccessEnabled = earlyAccessMode === 'true';

    // If early access mode is disabled, allow access
    if (!isEarlyAccessEnabled) {
      return true;
    }

    // Early access mode is enabled - check user role
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('EarlyAccessGuard: No user found in request');
      throw new ForbiddenException('Authentication required');
    }

    // Check if user has admin or super admin role
    const userRole = (user.role || 'USER').toUpperCase();
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    if (!isAdmin) {
      // Log internally but don't expose role details to client
      this.logger.log(
        `EarlyAccessGuard: Access denied for user ${user.id || 'unknown'} with role: ${userRole}. Early access mode is active.`,
      );
      // Security: Generic message without exposing role or admin existence
      throw new ForbiddenException(
        'This feature is currently unavailable. Please try again later.',
      );
    }

    // Admin user - allow access
    this.logger.debug(`EarlyAccessGuard: Admin access granted for user ${user.id || 'unknown'}`);
    return true;
  }
}
