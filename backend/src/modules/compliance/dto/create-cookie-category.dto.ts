import { IsEnum, IsString, IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CookieConsentCategory } from '@prisma/client';

export class CreateCookieCategoryDto {
  @ApiProperty({ enum: CookieConsentCategory })
  @IsEnum(CookieConsentCategory)
  category: CookieConsentCategory;

  @ApiProperty({ example: 'Strictly Necessary Cookies' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'These cookies are essential for the website to function properly.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isRequired: boolean;
}
