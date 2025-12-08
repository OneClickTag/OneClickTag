import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdminOnly } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { LandingPageService } from '../services/landing-page.service';
import {
  CreateLandingPageContentDto,
  UpdateLandingPageContentDto,
  ToggleActiveDto,
} from '../dto/landing-page.dto';

@ApiTags('Admin - Landing Page')
@Controller('v1/admin/landing-page')
@UseGuards(JwtAuthGuard, RolesGuard)
@AdminOnly()
@ApiBearerAuth()
export class LandingPageController {
  constructor(private readonly landingPageService: LandingPageService) {}

  @Get()
  @ApiOperation({ summary: 'Get all landing page sections' })
  @ApiResponse({ status: 200, description: 'Landing page sections retrieved successfully' })
  async findAll(@Query('active') active?: boolean) {
    return this.landingPageService.findAll(active);
  }

  @Get('by-key/:key')
  @ApiOperation({ summary: 'Get landing page section by key' })
  @ApiResponse({ status: 200, description: 'Landing page section retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Landing page section not found' })
  async findByKey(@Param('key') key: string) {
    return this.landingPageService.findByKey(key);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get landing page section by ID' })
  @ApiResponse({ status: 200, description: 'Landing page section retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Landing page section not found' })
  async findOne(@Param('id') id: string) {
    return this.landingPageService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create landing page section' })
  @ApiResponse({ status: 201, description: 'Landing page section created successfully' })
  async create(
    @Body() createLandingPageContentDto: CreateLandingPageContentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.landingPageService.create(createLandingPageContentDto, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update landing page section' })
  @ApiResponse({ status: 200, description: 'Landing page section updated successfully' })
  @ApiResponse({ status: 404, description: 'Landing page section not found' })
  async update(
    @Param('id') id: string,
    @Body() updateLandingPageContentDto: UpdateLandingPageContentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.landingPageService.update(id, updateLandingPageContentDto, user.id);
  }

  @Put(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle landing page section active status' })
  @ApiResponse({ status: 200, description: 'Landing page section status toggled successfully' })
  @ApiResponse({ status: 404, description: 'Landing page section not found' })
  async toggleActive(@Param('id') id: string, @Body() toggleDto: ToggleActiveDto) {
    return this.landingPageService.toggleActive(id, toggleDto.isActive);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete landing page section' })
  @ApiResponse({ status: 200, description: 'Landing page section deleted successfully' })
  @ApiResponse({ status: 404, description: 'Landing page section not found' })
  async delete(@Param('id') id: string) {
    return this.landingPageService.delete(id);
  }
}
