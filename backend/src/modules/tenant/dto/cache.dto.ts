import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CacheKeyDto {
  @ApiProperty({ description: 'Cache key' })
  @IsString()
  key: string;

  @ApiPropertyOptional({ 
    description: 'TTL in seconds',
    minimum: 1,
    maximum: 86400 // 24 hours
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(86400)
  @Type(() => Number)
  ttl?: number;

  @ApiPropertyOptional({ description: 'Whether to use global cache (bypass tenant scoping)' })
  @IsOptional()
  @IsBoolean()
  global?: boolean;
}

export class CacheValueDto {
  @ApiProperty({ description: 'Cache key' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Value to cache' })
  value: any;

  @ApiPropertyOptional({ 
    description: 'TTL in seconds',
    minimum: 1,
    maximum: 86400
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(86400)
  @Type(() => Number)
  ttl?: number;

  @ApiPropertyOptional({ description: 'Whether to use global cache' })
  @IsOptional()
  @IsBoolean()
  global?: boolean;
}

export class CacheStatsDto {
  @ApiProperty({ description: 'Total number of cache entries' })
  totalEntries: number;

  @ApiProperty({ description: 'Number of entries for current tenant' })
  tenantEntries: number;

  @ApiProperty({ description: 'Number of expired entries' })
  expiredEntries: number;

  @ApiPropertyOptional({ description: 'Tenant ID for scoped stats' })
  tenantId?: string;
}

export class CacheKeysDto {
  @ApiProperty({ description: 'Array of cache keys for the tenant', type: [String] })
  keys: string[];

  @ApiPropertyOptional({ description: 'Tenant ID' })
  tenantId?: string;
}