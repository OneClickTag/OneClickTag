import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  ValidateNested,
  ArrayNotEmpty,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED',
}

export class CreateCustomerDto {
  @ApiProperty({
    description: 'Customer email address',
    example: 'john.doe@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Customer first name',
    example: 'John',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @ApiProperty({
    description: 'Customer last name',
    example: 'Doe',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @ApiPropertyOptional({
    description: 'Company name',
    example: 'Acme Corporation',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  company?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+1-555-123-4567',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[\+]?[1-9][\d]{0,15}$/, {
    message: 'Phone number must be a valid international format',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Customer status',
    enum: CustomerStatus,
    default: CustomerStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({
    description: 'Customer tags',
    example: ['vip', 'premium', 'enterprise'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Additional notes about the customer',
    example: 'High-value customer, prefers email communication',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Custom fields as key-value pairs',
    example: { industry: 'Technology', segment: 'Enterprise' },
  })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}

export class CustomerResponseDto {
  @ApiProperty({ description: 'Customer ID' })
  id: string;

  @ApiProperty({ description: 'Customer email' })
  email: string;

  @ApiProperty({ description: 'First name' })
  firstName: string;

  @ApiProperty({ description: 'Last name' })
  lastName: string;

  @ApiProperty({ description: 'Full name' })
  fullName: string;

  @ApiPropertyOptional({ description: 'Company name' })
  company?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  phone?: string;

  @ApiProperty({ description: 'Customer status', enum: CustomerStatus })
  status: CustomerStatus;

  @ApiProperty({ description: 'Customer tags', type: [String] })
  tags: string[];

  @ApiPropertyOptional({ description: 'Notes' })
  notes?: string;

  @ApiPropertyOptional({ description: 'Custom fields' })
  customFields?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Google account ID if connected' })
  googleAccountId?: string;

  @ApiPropertyOptional({ description: 'Google email if connected' })
  googleEmail?: string;

  @ApiPropertyOptional({ description: 'Google connection details' })
  googleAccount?: {
    connected: boolean;
    email?: string;
    connectedAt?: string;
    hasGTMAccess?: boolean;
    hasGA4Access?: boolean;
    hasAdsAccess?: boolean;
    gtmError?: string | null;
    ga4Error?: string | null;
    adsError?: string | null;
    gtmAccountId?: string | null;
    gtmContainerId?: string | null;
    ga4PropertyCount?: number;
    adsAccountCount?: number;
  };

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Created by user ID' })
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Updated by user ID' })
  updatedBy?: string;

  @ApiPropertyOptional({ description: 'Google Ads accounts' })
  googleAdsAccounts?: GoogleAdsAccountDto[];
}

export class GoogleAdsAccountDto {
  @ApiProperty({ description: 'Account ID' })
  id: string;

  @ApiProperty({ description: 'Google account ID' })
  googleAccountId: string;

  @ApiProperty({ description: 'Google Ads account ID' })
  accountId: string;

  @ApiProperty({ description: 'Account name' })
  accountName: string;

  @ApiProperty({ description: 'Account currency' })
  currency: string;

  @ApiProperty({ description: 'Account timezone' })
  timeZone: string;

  @ApiProperty({ description: 'Whether account is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class BulkCreateCustomerDto {
  @ApiProperty({
    description: 'Array of customers to create',
    type: [CreateCustomerDto],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateCustomerDto)
  customers: CreateCustomerDto[];
}

export class BulkUpdateCustomerDto {
  @ApiProperty({
    description: 'Array of customer updates',
    type: [Object],
    example: [
      { id: 'customer1', data: { status: 'INACTIVE' } },
      { id: 'customer2', data: { company: 'New Company' } },
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  updates: Array<{
    id: string;
    data: UpdateCustomerDto;
  }>;
}

export class BulkDeleteCustomerDto {
  @ApiProperty({
    description: 'Array of customer IDs to delete',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID(4, { each: true })
  customerIds: string[];
}

export class BulkOperationResultDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success: boolean;

  @ApiProperty({ description: 'Customer ID' })
  customerId: string;

  @ApiPropertyOptional({ description: 'Result data (if successful)' })
  result?: CustomerResponseDto;

  @ApiPropertyOptional({ description: 'Error message (if failed)' })
  error?: string;
}

export class ConnectGoogleAccountDto {
  @ApiProperty({
    description: 'Google OAuth authorization code',
    example: '4/0AX4XfWjQ...',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({
    description: 'Redirect URI used in OAuth flow',
    example: 'http://localhost:3000/oauth/callback',
  })
  @IsOptional()
  @IsString()
  redirectUri?: string;
}