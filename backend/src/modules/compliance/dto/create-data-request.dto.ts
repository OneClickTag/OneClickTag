import { IsEnum, IsEmail, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DataRequestType } from '@prisma/client';

export class CreateDataRequestDto {
  @ApiProperty({ enum: DataRequestType })
  @IsEnum(DataRequestType)
  requestType: DataRequestType;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'I would like to request a copy of all my personal data', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
