import {
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { CustomerStatus } from './customer.dto';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum CustomerSortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  FIRST_NAME = 'firstName',
  LAST_NAME = 'lastName',
  EMAIL = 'email',
  COMPANY = 'company',
  STATUS = 'status',
}

export class CustomerQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Search term (searches across name, email, company)',
    example: 'john doe',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by customer status',
    enum: CustomerStatus,
  })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({
    description: 'Filter by company name',
    example: 'Acme Corp',
  })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({
    description: 'Filter by tags (comma-separated)',
    example: 'vip,premium',
  })
  @IsOptional()
  @Transform(({ value }) => 
    typeof value === 'string' ? value.split(',').map(tag => tag.trim()) : value
  )
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Filter customers with Google account connected',
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasGoogleAccount?: boolean;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: CustomerSortField,
    default: CustomerSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(CustomerSortField)
  sortBy?: CustomerSortField = CustomerSortField.CREATED_AT;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({
    description: 'Include Google Ads accounts in response',
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  includeGoogleAds?: boolean = false;

  @ApiPropertyOptional({
    description: 'Date range filter - created after (ISO 8601)',
    example: '2023-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  createdAfter?: string;

  @ApiPropertyOptional({
    description: 'Date range filter - created before (ISO 8601)',
    example: '2023-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsString()
  createdBefore?: string;
}

export class PaginatedCustomerResponseDto {
  @ApiPropertyOptional({ description: 'Array of customers', type: [Object] })
  data: any[];

  @ApiPropertyOptional({ description: 'Pagination metadata' })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  @ApiPropertyOptional({ description: 'Applied filters' })
  filters: {
    search?: string;
    status?: CustomerStatus;
    company?: string;
    tags?: string[];
    hasGoogleAccount?: boolean;
    createdAfter?: string;
    createdBefore?: string;
  };

  @ApiPropertyOptional({ description: 'Applied sorting' })
  sort: {
    field: CustomerSortField;
    order: SortOrder;
  };
}