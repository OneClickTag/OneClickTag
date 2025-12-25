import { IsString, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QuestionnaireAnswerDto {
  @ApiProperty({ example: 'cm1234567890', description: 'Question ID' })
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({
    example: 'Google Ads and Facebook Ads',
    description: 'Answer (can be string, number, or array)'
  })
  @IsNotEmpty()
  answer: any; // JSON - can be string, number, array
}

export class SubmitQuestionnaireDto {
  @ApiProperty({
    type: [QuestionnaireAnswerDto],
    description: 'Array of question-answer pairs'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionnaireAnswerDto)
  responses: QuestionnaireAnswerDto[];
}
