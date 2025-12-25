import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsEnum, IsArray, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';

export class CreateQuestionDto {
  @ApiProperty({ example: 'What is your primary use case?', description: 'Question text' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question: string;

  @ApiProperty({
    enum: QuestionType,
    example: 'RADIO',
    description: 'Question type'
  })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiPropertyOptional({
    type: [String],
    example: ['E-commerce', 'Lead Gen', 'SaaS', 'Other'],
    description: 'Options for RADIO/CHECKBOX types'
  })
  @IsOptional()
  @IsArray()
  options?: string[];

  @ApiPropertyOptional({ example: 'Enter your answer here...' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeholder?: string;

  @ApiPropertyOptional({ example: 0, description: 'Display order' })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiPropertyOptional({ example: true, description: 'Is answer required?' })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Is question active?' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'behavior', description: 'Question category' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;
}
