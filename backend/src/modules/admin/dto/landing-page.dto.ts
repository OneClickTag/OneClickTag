import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLandingPageContentDto {
  @ApiProperty({ description: 'Unique key for the section (hero, features, etc.)' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'JSON content for the section' })
  @IsObject()
  content: any;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class UpdateLandingPageContentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional({ description: 'JSON content for the section' })
  @IsOptional()
  @IsObject()
  content?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class ToggleActiveDto {
  @ApiProperty()
  @IsBoolean()
  @Type(() => Boolean)
  isActive: boolean;
}
