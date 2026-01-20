import { PartialType } from '@nestjs/swagger';
import { CreateCookieDto } from './create-cookie.dto';

export class UpdateCookieDto extends PartialType(CreateCookieDto) {}
