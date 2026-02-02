import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsBoolean } from 'class-validator';

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

  // Basic SEO
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'Meta title template, e.g., "%s | OneClickTag"' })
  @IsOptional()
  @IsString()
  metaTitleTemplate?: string;

  // Open Graph Settings
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogSiteName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogLocale?: string;

  // Twitter Card Settings
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitterCard?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitterTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitterDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitterImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitterSite?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitterCreator?: string;

  // Robots & Indexing
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  robotsIndex?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  robotsFollow?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  robotsNoArchive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  robotsNoSnippet?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  robotsNoImageIndex?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  googleVerification?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bingVerification?: string;

  // Canonical URL Settings
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  forceTrailingSlash?: boolean;

  // Schema.org / JSON-LD Settings
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  schemaType?: string;

  @ApiPropertyOptional({ description: 'Full JSON-LD schema object' })
  @IsOptional()
  @IsObject()
  schemaData?: any;

  // Legacy field
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

  // Basic SEO
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'Meta title template, e.g., "%s | OneClickTag"' })
  @IsOptional()
  @IsString()
  metaTitleTemplate?: string;

  // Open Graph Settings
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogSiteName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogLocale?: string;

  // Twitter Card Settings
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitterCard?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitterTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitterDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitterImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitterSite?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitterCreator?: string;

  // Robots & Indexing
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  robotsIndex?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  robotsFollow?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  robotsNoArchive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  robotsNoSnippet?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  robotsNoImageIndex?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  googleVerification?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bingVerification?: string;

  // Canonical URL Settings
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  forceTrailingSlash?: boolean;

  // Schema.org / JSON-LD Settings
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  schemaType?: string;

  @ApiPropertyOptional({ description: 'Full JSON-LD schema object' })
  @IsOptional()
  @IsObject()
  schemaData?: any;

  // Legacy field
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
