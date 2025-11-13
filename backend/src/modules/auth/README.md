# Authentication Module

This module provides comprehensive authentication and authorization features for the OneClickTag application, including Firebase authentication, JWT token management, OAuth integration, and multi-tenancy support.

## Features

- ✅ Firebase Admin SDK integration for token verification
- ✅ JWT strategy for API authentication
- ✅ AuthGuard for protecting routes
- ✅ Google OAuth flow for GTM/Ads API access
- ✅ OAuth token storage and automatic refresh
- ✅ Tenant context middleware with tenantId extraction
- ✅ Multi-tenancy support
- ✅ Complete decorators, DTOs, services, controllers, and guards

## Quick Start

### 1. Environment Setup

```bash
# Copy environment variables
cp .env.example .env

# Configure your environment variables
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_SERVICE_ACCOUNT_KEY="path/to/serviceAccountKey.json"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
JWT_SECRET="your-super-secret-jwt-key"
```

### 2. Database Migration

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push
```

### 3. Usage Examples

#### Basic Authentication with Firebase

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { FirebaseAuthDto, Public } from './modules/auth';

@Controller('auth')
export class AuthController {
  @Public()
  @Post('login')
  async login(@Body() firebaseAuthDto: FirebaseAuthDto) {
    return this.authService.authenticateWithFirebase(firebaseAuthDto);
  }
}
```

#### Protected Routes

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, AuthenticatedUser } from './modules/auth';

@Controller('protected')
@UseGuards(JwtAuthGuard)
export class ProtectedController {
  @Get('profile')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
```

#### Tenant-Aware Routes

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { 
  JwtAuthGuard, 
  TenantGuard, 
  RequireTenant, 
  CurrentTenant 
} from './modules/auth';

@Controller('tenant-data')
@UseGuards(JwtAuthGuard, TenantGuard)
@RequireTenant()
export class TenantController {
  @Get('dashboard')
  getTenantDashboard(@CurrentTenant('id') tenantId: string) {
    return { tenantId, message: 'Tenant-specific data' };
  }
}
```

#### OAuth Integration

```typescript
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { 
  JwtAuthGuard, 
  CurrentUser, 
  OAuthService,
  InitiateOAuthDto 
} from './modules/auth';

@Controller('oauth')
@UseGuards(JwtAuthGuard)
export class OAuthController {
  constructor(private oauthService: OAuthService) {}

  @Post('initiate')
  async initiateOAuth(
    @CurrentUser() user: AuthenticatedUser,
    @Body() initiateOAuthDto: InitiateOAuthDto,
  ) {
    return this.oauthService.initiateOAuth(user, initiateOAuthDto);
  }
}
```

## API Endpoints

### Authentication

- `POST /auth/firebase` - Authenticate with Firebase ID token
- `POST /auth/refresh` - Refresh JWT access token
- `GET /auth/profile` - Get current user profile
- `POST /auth/tenant` - Create a new tenant
- `POST /auth/logout` - Logout (client-side)

### OAuth

- `POST /oauth/initiate` - Initiate OAuth flow
- `GET /oauth/callback` - Handle OAuth callback
- `GET /oauth/tokens` - Get user OAuth tokens
- `POST /oauth/refresh` - Refresh OAuth token
- `DELETE /oauth/revoke` - Revoke OAuth token

## Guards and Decorators

### Guards

- `JwtAuthGuard` - Validates JWT tokens
- `FirebaseAuthGuard` - Validates Firebase tokens
- `TenantGuard` - Ensures tenant context

### Decorators

- `@Public()` - Mark routes as public (skip authentication)
- `@RequireTenant()` - Require tenant context
- `@CurrentUser()` - Inject authenticated user
- `@CurrentTenant()` - Inject tenant information
- `@GetTenantContext()` - Inject full tenant context

## OAuth Scopes

The module supports the following OAuth scopes for Google services:

- `GTM_READ` - Google Tag Manager read access
- `GTM_EDIT` - Google Tag Manager edit access
- `ADS_READ` - Google Ads read access
- `ADS_WRITE` - Google Ads write access
- `ANALYTICS_READ` - Google Analytics read access

## Tenant Context

The tenant context middleware automatically extracts tenant information from:

1. JWT token payload (`tenantId` field)
2. Request headers (`x-tenant-id`)
3. Query parameters (`tenantId`)
4. Subdomain (if using subdomain-based tenancy)

## Error Handling

The module includes comprehensive error handling:

- Invalid Firebase tokens → `UnauthorizedException`
- Expired OAuth tokens → Automatic refresh
- Missing tenant context → `ForbiddenException`
- Invalid OAuth codes → `BadRequestException`

## Security Considerations

- Firebase tokens are verified server-side
- JWT tokens include tenant information
- OAuth tokens are encrypted in database
- Refresh tokens are securely stored
- Tenant isolation is enforced at middleware level

## Database Schema

The module extends the base User model with:

```prisma
model User {
  firebaseId  String?  @unique
  tenantId    String?
  tenant      Tenant?  @relation(fields: [tenantId], references: [id])
  oauthTokens OAuthToken[]
}

model Tenant {
  id       String  @id @default(cuid())
  name     String
  domain   String  @unique
  isActive Boolean @default(true)
  users    User[]
  oauthTokens OAuthToken[]
}

model OAuthToken {
  provider     String
  scope        String
  accessToken  String
  refreshToken String?
  expiresAt    DateTime?
  userId       String
  tenantId     String
}
```