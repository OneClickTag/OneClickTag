import { IsString, IsEmail, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateComplianceSettingsDto {
  @ApiProperty({ example: 'OneClickTag Inc.' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ example: '123 Main St, San Francisco, CA 94102' })
  @IsString()
  @IsNotEmpty()
  companyAddress: string;

  @ApiProperty({ example: '+1-555-0100', required: false })
  @IsString()
  @IsOptional()
  companyPhone?: string;

  @ApiProperty({ example: 'contact@oneclicktag.com' })
  @IsEmail()
  @IsNotEmpty()
  companyEmail: string;

  @ApiProperty({ example: 'Jane Doe', required: false })
  @IsString()
  @IsOptional()
  dpoName?: string;

  @ApiProperty({ example: 'dpo@oneclicktag.com', required: false })
  @IsEmail()
  @IsOptional()
  dpoEmail?: string;

  @ApiProperty({ example: '+1-555-0101', required: false })
  @IsString()
  @IsOptional()
  dpoPhone?: string;

  @ApiProperty({ example: '1-800-555-0100', required: false })
  @IsString()
  @IsOptional()
  ccpaTollFreeNumber?: string;

  @ApiProperty({ example: 'api@oneclicktag.com', required: false })
  @IsEmail()
  @IsOptional()
  apiContactEmail?: string;

  @ApiProperty({ example: 'privacy@oneclicktag.com', required: false })
  @IsEmail()
  @IsOptional()
  privacyContactEmail?: string;
}
