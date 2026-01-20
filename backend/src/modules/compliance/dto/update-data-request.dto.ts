import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RequestStatus } from '@prisma/client';

export class UpdateDataRequestDto {
  @ApiProperty({ enum: RequestStatus, required: false })
  @IsEnum(RequestStatus)
  @IsOptional()
  status?: RequestStatus;

  @ApiProperty({ example: 'Your data export is ready for download', required: false })
  @IsString()
  @IsOptional()
  responseMessage?: string;

  @ApiProperty({ example: 'https://s3.amazonaws.com/exports/user-data.json', required: false })
  @IsString()
  @IsOptional()
  dataExportUrl?: string;

  @ApiProperty({ example: 'admin-user-id', required: false })
  @IsString()
  @IsOptional()
  assignedTo?: string;
}
