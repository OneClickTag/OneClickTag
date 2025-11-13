import { IsString, IsEmail, IsOptional, IsUrl, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FirebaseAuthDto {
  @ApiProperty({ description: 'Firebase ID token' })
  @IsString()
  idToken: string;

  @ApiPropertyOptional({ description: 'Tenant ID for multi-tenant applications' })
  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class JwtAuthDto {
  @ApiProperty({ description: 'JWT access token' })
  @IsString()
  accessToken: string;

  @ApiPropertyOptional({ description: 'JWT refresh token' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class CreateTenantDto {
  @ApiProperty({ description: 'Tenant name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Tenant domain/subdomain' })
  @IsString()
  domain: string;

  @ApiPropertyOptional({ description: 'Tenant settings as JSON' })
  @IsOptional()
  settings?: any;
}

export class UpdateTenantDto {
  @ApiPropertyOptional({ description: 'Tenant name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Tenant domain/subdomain' })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional({ description: 'Tenant settings as JSON' })
  @IsOptional()
  settings?: any;

  @ApiPropertyOptional({ description: 'Whether tenant is active' })
  @IsOptional()
  isActive?: boolean;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'JWT refresh token' })
  refreshToken: string;

  @ApiProperty({ description: 'User information' })
  user: {
    id: string;
    email: string;
    name: string;
    tenantId?: string;
  };

  @ApiPropertyOptional({ description: 'Tenant information if applicable' })
  tenant?: {
    id: string;
    name: string;
    domain: string;
    isActive: boolean;
  };
}