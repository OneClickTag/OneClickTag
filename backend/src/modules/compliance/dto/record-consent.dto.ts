import { IsBoolean, IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecordConsentDto {
  @ApiProperty({
    example: 'cuid1234567890',
    description: 'Tenant ID (embedded in cookie banner script on tenant\'s website)',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ example: 'anonymous-uuid', required: false })
  @IsString()
  @IsOptional()
  anonymousId?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  necessaryCookies: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  analyticsCookies: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  marketingCookies: boolean;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  newsletterConsent?: boolean;

  @ApiProperty({ example: '192.168.1.1', required: false })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiProperty({ example: 'Mozilla/5.0...', required: false })
  @IsString()
  @IsOptional()
  userAgent?: string;
}
