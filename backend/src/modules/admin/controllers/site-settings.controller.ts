import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdminOnly } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { SiteSettingsService } from '../services/site-settings.service';
import {
  CreateSiteSettingsDto,
  UpdateSiteSettingsDto,
} from '../dto/site-settings.dto';

@ApiTags('Admin - Site Settings')
@Controller('v1/admin/site-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@AdminOnly()
@ApiBearerAuth()
export class SiteSettingsController {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all site settings' })
  @ApiResponse({ status: 200, description: 'Site settings retrieved successfully' })
  async findAll() {
    return this.siteSettingsService.findAll();
  }

  @Get('global')
  @ApiOperation({ summary: 'Get global site settings' })
  @ApiResponse({ status: 200, description: 'Global site settings retrieved successfully' })
  async getGlobalSettings() {
    return this.siteSettingsService.getGlobalSettings();
  }

  @Get('by-key/:key')
  @ApiOperation({ summary: 'Get site setting by key' })
  @ApiResponse({ status: 200, description: 'Site setting retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Site setting not found' })
  async findByKey(@Param('key') key: string) {
    return this.siteSettingsService.findByKey(key);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get site setting by ID' })
  @ApiResponse({ status: 200, description: 'Site setting retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Site setting not found' })
  async findOne(@Param('id') id: string) {
    return this.siteSettingsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create site setting' })
  @ApiResponse({ status: 201, description: 'Site setting created successfully' })
  async create(
    @Body() createSiteSettingsDto: CreateSiteSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.siteSettingsService.create(createSiteSettingsDto, user.id);
  }

  @Put('global')
  @ApiOperation({ summary: 'Update global site settings' })
  @ApiResponse({ status: 200, description: 'Global site settings updated successfully' })
  async updateGlobalSettings(
    @Body() updateSiteSettingsDto: UpdateSiteSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.siteSettingsService.updateGlobalSettings(updateSiteSettingsDto, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update site setting' })
  @ApiResponse({ status: 200, description: 'Site setting updated successfully' })
  @ApiResponse({ status: 404, description: 'Site setting not found' })
  async update(
    @Param('id') id: string,
    @Body() updateSiteSettingsDto: UpdateSiteSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.siteSettingsService.update(id, updateSiteSettingsDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete site setting' })
  @ApiResponse({ status: 200, description: 'Site setting deleted successfully' })
  @ApiResponse({ status: 404, description: 'Site setting not found' })
  async delete(@Param('id') id: string) {
    return this.siteSettingsService.delete(id);
  }
}
