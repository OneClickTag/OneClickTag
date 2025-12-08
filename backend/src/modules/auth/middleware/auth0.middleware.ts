import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Auth0Middleware implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request) || this.extractTokenFromQuery(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token is required');
    }

    try {
      // Verify the JWT token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
        issuer: this.configService.get<string>('JWT_ISSUER') || 'oneclicktag.com',
        audience: this.configService.get<string>('JWT_AUDIENCE') || 'oneclicktag-app',
      });

      // Attach the payload to the request object
      request['user'] = payload;
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private extractTokenFromQuery(request: Request): string | undefined {
    // For SSE compatibility - EventSource doesn't support custom headers
    return request.query.authorization as string | undefined;
  }
}

// Export as guard for easier usage
export { Auth0Middleware as Auth0Guard };