import { IsString, IsOptional, IsArray, IsEnum, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OAuthProvider {
  GOOGLE = 'google',
}

export enum OAuthScope {
  GTM_READ = 'gtm_read',
  GTM_EDIT = 'gtm_edit',
  ADS_READ = 'ads_read',
  ADS_WRITE = 'ads_write',
  ANALYTICS_READ = 'analytics_read',
}

export class InitiateOAuthDto {
  @ApiProperty({ 
    description: 'OAuth provider',
    enum: OAuthProvider 
  })
  @IsEnum(OAuthProvider)
  provider: OAuthProvider;

  @ApiProperty({ 
    description: 'OAuth scopes requested',
    enum: OAuthScope,
    isArray: true 
  })
  @IsArray()
  @IsEnum(OAuthScope, { each: true })
  scopes: OAuthScope[];

  @ApiPropertyOptional({ description: 'Redirect URL after OAuth completion' })
  @IsOptional()
  @IsUrl()
  redirectUrl?: string;

  @ApiPropertyOptional({ description: 'State parameter for OAuth flow' })
  @IsOptional()
  @IsString()
  state?: string;
}

export class OAuthCallbackDto {
  @ApiProperty({ description: 'Authorization code from OAuth provider' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'State parameter from OAuth flow' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Error from OAuth provider' })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional({ description: 'Error description from OAuth provider' })
  @IsOptional()
  @IsString()
  error_description?: string;
}

export class OAuthTokenDto {
  @ApiProperty({ description: 'OAuth provider' })
  provider: string;

  @ApiProperty({ description: 'OAuth scope' })
  scope: string;

  @ApiProperty({ description: 'Token expiration date' })
  expiresAt?: Date;

  @ApiProperty({ description: 'Token creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Token last update date' })
  updatedAt: Date;

  @ApiProperty({ description: 'Whether token is valid/not expired' })
  isValid: boolean;
}

export class RevokeOAuthTokenDto {
  @ApiProperty({ 
    description: 'OAuth provider',
    enum: OAuthProvider 
  })
  @IsEnum(OAuthProvider)
  provider: OAuthProvider;

  @ApiProperty({ 
    description: 'OAuth scope',
    enum: OAuthScope 
  })
  @IsEnum(OAuthScope)
  scope: OAuthScope;
}

export class OAuthAuthUrlResponseDto {
  @ApiProperty({ description: 'OAuth authorization URL' })
  authUrl: string;

  @ApiProperty({ description: 'State parameter for OAuth flow' })
  state: string;
}

export class OAuthTokenResponseDto {
  @ApiProperty({ description: 'Success message' })
  message: string;

  @ApiProperty({ description: 'OAuth token information' })
  token: OAuthTokenDto;
}