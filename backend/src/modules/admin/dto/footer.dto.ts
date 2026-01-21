import { IsString, IsOptional, IsBoolean, IsArray, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class SocialLinkDto {
  @IsString()
  platform: string;

  @IsString()
  url: string;

  @IsString()
  icon: string;
}

export class FooterLinkDto {
  @IsString()
  label: string;

  @IsString()
  url: string;
}

export class FooterSectionDto {
  @IsString()
  title: string;

  @IsArray()
  @Type(() => FooterLinkDto)
  links: FooterLinkDto[];
}

export class CreateFooterContentDto {
  @IsString()
  @IsOptional()
  brandName?: string;

  @IsString()
  @IsOptional()
  brandDescription?: string;

  @IsArray()
  @IsOptional()
  @Type(() => SocialLinkDto)
  socialLinks?: SocialLinkDto[];

  @IsArray()
  @IsOptional()
  @Type(() => FooterSectionDto)
  sections?: FooterSectionDto[];

  @IsString()
  @IsOptional()
  copyrightText?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateFooterContentDto {
  @IsString()
  @IsOptional()
  brandName?: string;

  @IsString()
  @IsOptional()
  brandDescription?: string;

  @IsArray()
  @IsOptional()
  @Type(() => SocialLinkDto)
  socialLinks?: SocialLinkDto[];

  @IsArray()
  @IsOptional()
  @Type(() => FooterSectionDto)
  sections?: FooterSectionDto[];

  @IsString()
  @IsOptional()
  copyrightText?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
