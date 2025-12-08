import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { SiteSettingsService } from '../../admin/services/site-settings.service';

@ApiTags('Public - Site Settings')
@Controller('v1/site-settings')
export class PublicSiteSettingsController {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  @Public()
  @Get('global')
  @ApiOperation({ summary: 'Get global site settings' })
  @ApiResponse({ status: 200, description: 'Site settings retrieved successfully' })
  async getGlobalSettings() {
    return this.siteSettingsService.getGlobalSettings();
  }
}
