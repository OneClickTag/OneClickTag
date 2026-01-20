import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCookieDto {
  @ApiProperty({ example: 'cookie-category-id' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ example: '_ga' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Google Analytics' })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({ example: 'Used to distinguish users for analytics purposes' })
  @IsString()
  @IsNotEmpty()
  purpose: string;

  @ApiProperty({ example: '2 years' })
  @IsString()
  @IsNotEmpty()
  duration: string;

  @ApiProperty({ example: 'HTTP', required: false })
  @IsString()
  @IsOptional()
  type?: string;
}
