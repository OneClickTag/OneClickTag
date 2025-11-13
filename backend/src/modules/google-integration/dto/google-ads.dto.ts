import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  IsDateString,
  IsNotEmpty,
  Min,
  Max,
  ValidateNested,
  IsUrl,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  CampaignStatus,
  AdvertisingChannelType,
  BiddingStrategyType,
  ConversionActionCategory,
  ConversionActionStatus,
  ConversionActionType,
  ConversionCountingType,
  AttributionModel,
} from '../types/google-ads.types';

export class GoogleAdsAccountDto {
  @ApiProperty({ description: 'Google Ads account ID' })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiPropertyOptional({ description: 'Developer token for API access' })
  @IsOptional()
  @IsString()
  developerToken?: string;

  @ApiPropertyOptional({ description: 'OAuth refresh token' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class CreateCampaignDto {
  @ApiProperty({
    description: 'Campaign name',
    example: 'Summer Sale Campaign',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Campaign status',
    enum: CampaignStatus,
    default: CampaignStatus.PAUSED,
  })
  @IsEnum(CampaignStatus)
  status: CampaignStatus;

  @ApiProperty({
    description: 'Advertising channel type',
    enum: AdvertisingChannelType,
  })
  @IsEnum(AdvertisingChannelType)
  advertisingChannelType: AdvertisingChannelType;

  @ApiProperty({
    description: 'Bidding strategy type',
    enum: BiddingStrategyType,
  })
  @IsEnum(BiddingStrategyType)
  biddingStrategyType: BiddingStrategyType;

  @ApiProperty({
    description: 'Daily budget in micro amount (e.g., 10000000 for $10)',
    minimum: 10000,
  })
  @IsNumber()
  @Min(10000)
  dailyBudgetMicros: number;

  @ApiPropertyOptional({
    description: 'Campaign start date (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Campaign end date (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Target CPA in micro amount (for TARGET_CPA bidding)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  targetCpaMicros?: number;

  @ApiPropertyOptional({
    description: 'Target ROAS (for TARGET_ROAS bidding)',
    minimum: 0.01,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1000)
  targetRoas?: number;

  @ApiPropertyOptional({
    description: 'Networks to target',
    type: [String],
    example: ['SEARCH', 'SEARCH_PARTNERS'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  networkSettings?: string[];
}

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {}

export class CreateConversionActionDto {
  @ApiProperty({
    description: 'Conversion action name',
    example: 'Purchase Conversion',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Conversion action category',
    enum: ConversionActionCategory,
  })
  @IsEnum(ConversionActionCategory)
  category: ConversionActionCategory;

  @ApiProperty({
    description: 'Conversion action status',
    enum: ConversionActionStatus,
    default: ConversionActionStatus.ENABLED,
  })
  @IsEnum(ConversionActionStatus)
  status: ConversionActionStatus;

  @ApiProperty({
    description: 'Conversion action type',
    enum: ConversionActionType,
  })
  @IsEnum(ConversionActionType)
  type: ConversionActionType;

  @ApiProperty({
    description: 'Conversion counting type',
    enum: ConversionCountingType,
    default: ConversionCountingType.ONE_PER_CLICK,
  })
  @IsEnum(ConversionCountingType)
  countingType: ConversionCountingType;

  @ApiPropertyOptional({
    description: 'Default conversion value in micro amount',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultValue?: number;

  @ApiPropertyOptional({
    description: 'Default conversion currency code',
    example: 'USD',
    minLength: 3,
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'Currency code must be 3 uppercase letters' })
  defaultCurrency?: string;

  @ApiPropertyOptional({
    description: 'Click-through lookback window in days',
    minimum: 1,
    maximum: 90,
    default: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(90)
  clickThroughLookbackWindowDays?: number;

  @ApiPropertyOptional({
    description: 'View-through lookback window in days',
    minimum: 1,
    maximum: 30,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  viewThroughLookbackWindowDays?: number;

  @ApiPropertyOptional({
    description: 'Attribution model',
    enum: AttributionModel,
    default: AttributionModel.GOOGLE_ADS_LAST_CLICK,
  })
  @IsOptional()
  @IsEnum(AttributionModel)
  attributionModel?: AttributionModel;

  @ApiPropertyOptional({
    description: 'Include in conversions column',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeInConversionsMetric?: boolean;
}

export class UpdateConversionActionDto extends PartialType(CreateConversionActionDto) {}

export class GTMLinkingDto {
  @ApiProperty({
    description: 'GTM Container ID',
    example: 'GTM-XXXXXXX',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^GTM-[A-Z0-9]{7,}$/, { message: 'Invalid GTM Container ID format' })
  containerId: string;

  @ApiPropertyOptional({
    description: 'GTM tag name for the conversion',
    example: 'Purchase Conversion Tag',
  })
  @IsOptional()
  @IsString()
  tagName?: string;

  @ApiPropertyOptional({
    description: 'Trigger conditions for the conversion',
    type: [String],
    example: ['Page URL', 'contains', 'thank-you'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  triggerConditions?: string[];

  @ApiPropertyOptional({
    description: 'Custom parameters for the conversion event',
  })
  @IsOptional()
  customParameters?: Record<string, any>;
}

export class ConversionActionResponseDto {
  @ApiProperty({ description: 'Conversion action resource name' })
  resourceName: string;

  @ApiProperty({ description: 'Conversion action ID' })
  id: string;

  @ApiProperty({ description: 'Conversion action name' })
  name: string;

  @ApiProperty({ description: 'Conversion action category' })
  category: string;

  @ApiProperty({ description: 'Conversion action status' })
  status: string;

  @ApiProperty({ description: 'Conversion action type' })
  type: string;

  @ApiProperty({ description: 'Click-through lookback window days' })
  clickThroughLookbackWindowDays: number;

  @ApiProperty({ description: 'View-through lookback window days' })
  viewThroughLookbackWindowDays: number;

  @ApiPropertyOptional({ description: 'GTM conversion tag information' })
  gtmTag?: {
    conversionId: string;
    conversionLabel: string;
    globalSiteTag: string;
    eventSnippet: string;
  };

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class CampaignResponseDto {
  @ApiProperty({ description: 'Campaign resource name' })
  resourceName: string;

  @ApiProperty({ description: 'Campaign ID' })
  id: string;

  @ApiProperty({ description: 'Campaign name' })
  name: string;

  @ApiProperty({ description: 'Campaign status' })
  status: string;

  @ApiProperty({ description: 'Advertising channel type' })
  advertisingChannelType: string;

  @ApiProperty({ description: 'Bidding strategy type' })
  biddingStrategyType: string;

  @ApiProperty({ description: 'Daily budget in micro amount' })
  dailyBudgetMicros: number;

  @ApiPropertyOptional({ description: 'Campaign start date' })
  startDate?: string;

  @ApiPropertyOptional({ description: 'Campaign end date' })
  endDate?: string;

  @ApiProperty({ description: 'Serving status' })
  servingStatus: string;

  @ApiPropertyOptional({ description: 'Optimization score (0-1)' })
  optimizationScore?: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class GoogleAdsQueryDto {
  @ApiProperty({
    description: 'Google Ads Query Language (GAQL) query',
    example: 'SELECT campaign.id, campaign.name, metrics.impressions FROM campaign WHERE campaign.status = "ENABLED"',
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({
    description: 'Customer IDs to query (if not specified, uses authenticated customer)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customerIds?: string[];

  @ApiPropertyOptional({
    description: 'Number of results per page',
    minimum: 1,
    maximum: 10000,
    default: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  pageSize?: number;

  @ApiPropertyOptional({
    description: 'Page token for pagination',
  })
  @IsOptional()
  @IsString()
  pageToken?: string;
}

export class GoogleAdsErrorDto {
  @ApiProperty({ description: 'Error code' })
  errorCode: string;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiPropertyOptional({ description: 'Error trigger' })
  trigger?: string;

  @ApiPropertyOptional({ description: 'Error location' })
  location?: string;

  @ApiPropertyOptional({ description: 'Additional error details' })
  details?: any;
}

export class QuotaErrorDto extends GoogleAdsErrorDto {
  @ApiProperty({ description: 'Quota error type' })
  quotaErrorType: string;

  @ApiPropertyOptional({ description: 'Rate name' })
  rateName?: string;

  @ApiPropertyOptional({ description: 'Rate scope' })
  rateScope?: string;

  @ApiPropertyOptional({ description: 'Retry after seconds' })
  retryAfterSeconds?: number;
}

export class GoogleAdsMetricsDto {
  @ApiPropertyOptional({ description: 'Date range for metrics (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for metrics (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Metrics to include',
    type: [String],
    example: ['impressions', 'clicks', 'conversions', 'cost'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metrics?: string[];

  @ApiPropertyOptional({
    description: 'Segments to group by',
    type: [String],
    example: ['date', 'device'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  segments?: string[];
}