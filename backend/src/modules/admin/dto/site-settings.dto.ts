import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateSiteSettingsDto {
  @ApiProperty({ description: 'Unique key for the setting (global or specific)' })
  @IsString()
  key: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  faviconUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiPropertyOptional({ description: 'Brand colors JSON object' })
  @IsOptional()
  @IsObject()
  brandColors?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  heroBackgroundUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  socialImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customCSS?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customJS?: string;
}

export class UpdateSiteSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  faviconUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiPropertyOptional({ description: 'Brand colors JSON object' })
  @IsOptional()
  @IsObject()
  brandColors?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  heroBackgroundUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  socialImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customCSS?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customJS?: string;
}
