import { PartialType } from '@nestjs/swagger';
import { CreateCookieCategoryDto } from './create-cookie-category.dto';

export class UpdateCookieCategoryDto extends PartialType(CreateCookieCategoryDto) {}
