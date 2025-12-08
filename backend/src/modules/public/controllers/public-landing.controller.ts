import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { LandingPageService } from '../../admin/services/landing-page.service';

@ApiTags('Public - Landing Page')
@Controller('v1/landing')
export class PublicLandingController {
  constructor(private readonly landingPageService: LandingPageService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all active landing page sections' })
  @ApiResponse({ status: 200, description: 'Landing page sections retrieved successfully' })
  async findAll() {
    return this.landingPageService.findAll(true); // Only active sections
  }

  @Public()
  @Get(':key')
  @ApiOperation({ summary: 'Get landing page section by key' })
  @ApiResponse({ status: 200, description: 'Landing page section retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Section not found or not active' })
  async findByKey(@Param('key') key: string) {
    return this.landingPageService.findByKey(key);
  }
}
