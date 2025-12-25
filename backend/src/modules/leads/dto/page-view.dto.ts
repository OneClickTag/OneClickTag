import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePageViewDto {
  @ApiPropertyOptional({ example: 'cm1234567890', description: 'Lead ID if known' })
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiProperty({ example: 'session_abc123', description: 'Anonymous session ID' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ example: '/early-access', description: 'Page path' })
  @IsString()
  @IsNotEmpty()
  path: string;

  @ApiPropertyOptional({ example: 'https://google.com' })
  @IsOptional()
  @IsString()
  referrer?: string;
}
