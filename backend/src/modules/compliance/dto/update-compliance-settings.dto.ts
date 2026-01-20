import { PartialType } from '@nestjs/swagger';
import { CreateComplianceSettingsDto } from './create-compliance-settings.dto';

export class UpdateComplianceSettingsDto extends PartialType(CreateComplianceSettingsDto) {}
