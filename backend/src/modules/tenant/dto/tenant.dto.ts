import { IsString, IsOptional, IsBoolean, IsObject, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateTenantDto {
  @ApiProperty({ 
    description: 'Tenant name',
    example: 'Acme Corporation',
    minLength: 2,
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ 
    description: 'Tenant domain/subdomain (lowercase, alphanumeric and hyphens only)',
    example: 'acme-corp',
    minLength: 2,
    maxLength: 50
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
    message: 'Domain must be lowercase, start and end with alphanumeric characters, and contain only letters, numbers, and hyphens'
  })
  @Transform(({ value }) => value.toLowerCase())
  domain: string;

  @ApiPropertyOptional({ 
    description: 'Tenant settings as JSON object',
    example: { theme: 'dark', features: ['analytics', 'reporting'] }
  })
  @IsOptional()
  @IsObject()
  settings?: any;

  @ApiPropertyOptional({ 
    description: 'Whether tenant is active',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTenantDto extends PartialType(CreateTenantDto) {}

export class TenantResponseDto {
  @ApiProperty({ description: 'Tenant ID' })
  id: string;

  @ApiProperty({ description: 'Tenant name' })
  name: string;

  @ApiProperty({ description: 'Tenant domain' })
  domain: string;

  @ApiProperty({ description: 'Tenant settings' })
  settings: any;

  @ApiProperty({ description: 'Whether tenant is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Tenant statistics' })
  _count?: {
    users: number;
    oauthTokens: number;
  };
}

export class TenantStatsDto {
  @ApiProperty({ description: 'Tenant ID' })
  tenantId: string;

  @ApiProperty({ description: 'Number of users in tenant' })
  userCount: number;

  @ApiProperty({ description: 'Number of OAuth tokens in tenant' })
  oauthTokenCount: number;

  @ApiProperty({ description: 'Last updated timestamp' })
  lastUpdated: Date;
}

export class BulkTenantUpdateDto {
  @ApiProperty({ 
    description: 'Array of tenant updates',
    type: [Object],
    example: [
      { id: 'tenant1', data: { name: 'New Name' } },
      { id: 'tenant2', data: { isActive: false } }
    ]
  })
  updates: Array<{
    id: string;
    data: UpdateTenantDto;
  }>;
}

export class BulkTenantUpdateResultDto {
  @ApiProperty({ description: 'Whether the update was successful' })
  success: boolean;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId: string;

  @ApiPropertyOptional({ description: 'Updated tenant data (if successful)' })
  result?: TenantResponseDto;

  @ApiPropertyOptional({ description: 'Error message (if failed)' })
  error?: string;
}