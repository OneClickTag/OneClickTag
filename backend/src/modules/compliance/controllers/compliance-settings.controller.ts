import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { ComplianceSettingsService } from '../services/compliance-settings.service';
import { CreateComplianceSettingsDto } from '../dto/create-compliance-settings.dto';
import { UpdateComplianceSettingsDto } from '../dto/update-compliance-settings.dto';

@ApiTags('Compliance - Settings')
@Controller('compliance/settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ComplianceSettingsController {
  constructor(
    private readonly complianceSettingsService: ComplianceSettingsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get compliance settings for tenant',
    description: 'Retrieves GDPR and CCPA compliance settings for the current tenant.',
  })
  @ApiResponse({
    status: 200,
    description: 'Compliance settings retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Compliance settings not found for tenant',
  })
  async getSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.complianceSettingsService.findByTenant(user.tenantId);
  }

  @Put()
  @ApiOperation({
    summary: 'Create or update compliance settings',
    description: 'Creates or updates GDPR and CCPA compliance settings for the current tenant.',
  })
  @ApiResponse({
    status: 200,
    description: 'Compliance settings updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid compliance settings data provided',
  })
  async updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateComplianceSettingsDto | UpdateComplianceSettingsDto,
  ) {
    return this.complianceSettingsService.createOrUpdate(
      user.tenantId,
      dto,
      user.id,
    );
  }
}
