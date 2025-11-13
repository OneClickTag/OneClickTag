import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Config
import { FirebaseConfig } from './config/firebase.config';

// Services
import { AuthService } from './services/auth.service';
import { FirebaseAuthService } from './services/firebase-auth.service';
import { OAuthService } from './services/oauth.service';

// Controllers
import { AuthController } from './controllers/auth.controller';
import { OAuthController } from './controllers/oauth.controller';

// Strategies
import { JwtStrategy } from './strategies/jwt.strategy';
import { FirebaseStrategy } from './strategies/firebase.strategy';
import { GoogleOAuthStrategy } from './strategies/google-oauth.strategy';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';
import { TenantGuard } from './guards/tenant.guard';

// Middleware
import { TenantContextMiddleware } from './middleware/tenant-context.middleware';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, OAuthController],
  providers: [
    // Config
    FirebaseConfig,
    
    // Services
    AuthService,
    FirebaseAuthService,
    OAuthService,
    
    // Strategies
    JwtStrategy,
    FirebaseStrategy,
    GoogleOAuthStrategy,
    
    // Guards
    JwtAuthGuard,
    FirebaseAuthGuard,
    TenantGuard,
  ],
  exports: [
    AuthService,
    FirebaseAuthService,
    OAuthService,
    JwtAuthGuard,
    FirebaseAuthGuard,
    TenantGuard,
    JwtStrategy,
    FirebaseStrategy,
    JwtModule,
  ],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantContextMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}