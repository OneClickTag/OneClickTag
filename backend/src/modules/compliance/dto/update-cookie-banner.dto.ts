import { IsString, IsBoolean, IsInt, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCookieBannerDto {
  @ApiProperty({ example: 'We value your privacy', required: false })
  @IsString()
  @IsOptional()
  headingText?: string;

  @ApiProperty({ example: 'We use cookies to enhance your experience...', required: false })
  @IsString()
  @IsOptional()
  bodyText?: string;

  @ApiProperty({ example: 'Accept All', required: false })
  @IsString()
  @IsOptional()
  acceptAllButtonText?: string;

  @ApiProperty({ example: 'Reject All', required: false })
  @IsString()
  @IsOptional()
  rejectAllButtonText?: string;

  @ApiProperty({ example: 'Customize', required: false })
  @IsString()
  @IsOptional()
  customizeButtonText?: string;

  @ApiProperty({ example: 'Save Preferences', required: false })
  @IsString()
  @IsOptional()
  savePreferencesText?: string;

  @ApiProperty({ example: 'bottom', required: false })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiProperty({ example: '#ffffff', required: false })
  @IsString()
  @IsOptional()
  backgroundColor?: string;

  @ApiProperty({ example: '#000000', required: false })
  @IsString()
  @IsOptional()
  textColor?: string;

  @ApiProperty({ example: '#10b981', required: false })
  @IsString()
  @IsOptional()
  acceptButtonColor?: string;

  @ApiProperty({ example: '#ef4444', required: false })
  @IsString()
  @IsOptional()
  rejectButtonColor?: string;

  @ApiProperty({ example: '#6b7280', required: false })
  @IsString()
  @IsOptional()
  customizeButtonColor?: string;

  @ApiProperty({ example: 365, required: false })
  @IsInt()
  @Min(1)
  @Max(395)
  @IsOptional()
  consentExpiryDays?: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  showOnEveryPage?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  blockCookiesUntilConsent?: boolean;

  @ApiProperty({ example: '/privacy', required: false })
  @IsString()
  @IsOptional()
  privacyPolicyUrl?: string;

  @ApiProperty({ example: '/cookie-policy', required: false })
  @IsString()
  @IsOptional()
  cookiePolicyUrl?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
