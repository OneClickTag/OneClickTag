import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateContactPageContentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessHours?: string;

  @ApiPropertyOptional({ description: 'Social links JSON array' })
  @IsOptional()
  @IsObject()
  socialLinks?: any;

  @ApiPropertyOptional({ description: 'FAQs JSON array' })
  @IsOptional()
  @IsObject()
  faqs?: any;

  @ApiPropertyOptional({ description: 'Form settings JSON object' })
  @IsOptional()
  @IsObject()
  formSettings?: any;

  @ApiPropertyOptional({ description: 'Custom content JSON object' })
  @IsOptional()
  @IsObject()
  customContent?: any;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class UpdateContactPageContentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessHours?: string;

  @ApiPropertyOptional({ description: 'Social links JSON array' })
  @IsOptional()
  socialLinks?: any;

  @ApiPropertyOptional({ description: 'FAQs JSON array' })
  @IsOptional()
  faqs?: any;

  @ApiPropertyOptional({ description: 'Form settings JSON object' })
  @IsOptional()
  formSettings?: any;

  @ApiPropertyOptional({ description: 'Custom content JSON object' })
  @IsOptional()
  customContent?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class ToggleContactPageActiveDto {
  @ApiProperty()
  @IsBoolean()
  @Type(() => Boolean)
  isActive: boolean;
}
