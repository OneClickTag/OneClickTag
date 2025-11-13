import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { OAuthService } from '../services/oauth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CurrentTenant } from '../decorators/current-tenant.decorator';
import { AuthenticatedUser } from '../strategies/jwt.strategy';
import {
  InitiateOAuthDto,
  OAuthCallbackDto,
  RevokeOAuthTokenDto,
  OAuthAuthUrlResponseDto,
  OAuthTokenResponseDto,
  OAuthTokenDto,
  OAuthScope,
  OAuthProvider,
} from '../dto';
import { randomUUID } from 'crypto';

const SCOPE_MAPPING = {
  [OAuthScope.GTM_READ]: ['https://www.googleapis.com/auth/tagmanager.readonly'],
  [OAuthScope.GTM_EDIT]: [
    'https://www.googleapis.com/auth/tagmanager.readonly',
    'https://www.googleapis.com/auth/tagmanager.edit.containers',
  ],
  [OAuthScope.ADS_READ]: ['https://www.googleapis.com/auth/adwords'],
  [OAuthScope.ADS_WRITE]: ['https://www.googleapis.com/auth/adwords'],
  [OAuthScope.ANALYTICS_READ]: ['https://www.googleapis.com/auth/analytics.readonly'],
};

@ApiTags('OAuth')
@Controller('oauth')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OAuthController {
  constructor(private oauthService: OAuthService) {}

  @Post('initiate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate OAuth flow' })
  @ApiResponse({
    status: 200,
    description: 'OAuth authorization URL generated',
    type: OAuthAuthUrlResponseDto,
  })
  @ApiBody({ type: InitiateOAuthDto })
  async initiateOAuth(
    @CurrentUser() user: AuthenticatedUser,
    @Body() initiateOAuthDto: InitiateOAuthDto,
  ): Promise<OAuthAuthUrlResponseDto> {
    const { provider, scopes, state } = initiateOAuthDto;

    if (provider !== OAuthProvider.GOOGLE) {
      throw new BadRequestException('Only Google OAuth is currently supported');
    }

    // Map our internal scopes to Google scopes
    const googleScopes = scopes.flatMap(scope => SCOPE_MAPPING[scope] || []);
    
    // Add basic scopes
    googleScopes.push('email', 'profile');

    const stateParam = state || randomUUID();
    const authUrl = this.oauthService.getAuthUrl(stateParam, googleScopes);

    return {
      authUrl,
      state: stateParam,
    };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Handle OAuth callback' })
  @ApiResponse({
    status: 200,
    description: 'OAuth callback processed successfully',
    type: OAuthTokenResponseDto,
  })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'error', required: false })
  @ApiQuery({ name: 'error_description', required: false })
  async handleOAuthCallback(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant('id') tenantId: string,
    @Query() query: OAuthCallbackDto,
  ): Promise<OAuthTokenResponseDto> {
    const { code, error, error_description } = query;

    if (error) {
      throw new BadRequestException(`OAuth error: ${error} - ${error_description}`);
    }

    if (!code) {
      throw new BadRequestException('Authorization code is required');
    }

    if (!tenantId) {
      throw new BadRequestException('Tenant context is required for OAuth');
    }

    // Exchange code for tokens
    const tokens = await this.oauthService.exchangeCodeForTokens(code);

    // Determine scope based on token scopes
    // This is a simplified approach - in practice, you might want to store the requested scopes
    const scope = tokens.scope.includes('tagmanager') ? 'gtm' : 'ads';

    // Store tokens
    await this.oauthService.storeOAuthTokens(
      user.id,
      tenantId,
      'google',
      scope,
      {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope,
      },
    );

    return {
      message: 'OAuth tokens stored successfully',
      token: {
        provider: 'google',
        scope,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        isValid: true,
      },
    };
  }

  @Get('tokens')
  @ApiOperation({ summary: 'Get user OAuth tokens' })
  @ApiResponse({
    status: 200,
    description: 'OAuth tokens retrieved successfully',
    type: [OAuthTokenDto],
  })
  async getUserTokens(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant('id') tenantId: string,
  ): Promise<OAuthTokenDto[]> {
    const tokens = await this.oauthService.getUserOAuthTokens(user.id, tenantId);

    return tokens.map(token => ({
      ...token,
      isValid: !token.expiresAt || token.expiresAt > new Date(),
    }));
  }

  @Delete('revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke OAuth token' })
  @ApiResponse({
    status: 200,
    description: 'OAuth token revoked successfully',
  })
  @ApiBody({ type: RevokeOAuthTokenDto })
  async revokeOAuthToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() revokeOAuthTokenDto: RevokeOAuthTokenDto,
  ) {
    const { provider, scope } = revokeOAuthTokenDto;

    await this.oauthService.revokeOAuthTokens(
      user.id,
      provider,
      scope,
    );

    return { message: 'OAuth token revoked successfully' };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh OAuth token' })
  @ApiResponse({
    status: 200,
    description: 'OAuth token refreshed successfully',
    type: OAuthTokenResponseDto,
  })
  @ApiBody({ type: RevokeOAuthTokenDto })
  async refreshOAuthToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() refreshTokenDto: RevokeOAuthTokenDto,
  ): Promise<OAuthTokenResponseDto> {
    const { provider, scope } = refreshTokenDto;

    const refreshedTokens = await this.oauthService.refreshOAuthTokens(
      user.id,
      provider,
      scope,
    );

    if (!refreshedTokens) {
      throw new BadRequestException('Failed to refresh OAuth token');
    }

    return {
      message: 'OAuth token refreshed successfully',
      token: {
        provider,
        scope: refreshedTokens.scope,
        expiresAt: refreshedTokens.expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        isValid: true,
      },
    };
  }
}