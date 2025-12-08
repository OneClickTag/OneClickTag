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
import { ContactPageService } from '../services/contact-page.service';
import {
  CreateContactPageContentDto,
  UpdateContactPageContentDto,
  ToggleContactPageActiveDto,
} from '../dto/contact-page.dto';

@ApiTags('Admin - Contact Page')
@Controller('v1/admin/contact-page')
@UseGuards(JwtAuthGuard, RolesGuard)
@AdminOnly()
@ApiBearerAuth()
export class ContactPageController {
  constructor(private readonly contactPageService: ContactPageService) {}

  @Get()
  @ApiOperation({ summary: 'Get all contact page content' })
  @ApiResponse({ status: 200, description: 'Contact page content retrieved successfully' })
  async findAll(@Query('active') active?: boolean) {
    return this.contactPageService.findAll(active);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active contact page content' })
  @ApiResponse({ status: 200, description: 'Active contact page content retrieved successfully' })
  @ApiResponse({ status: 404, description: 'No active contact page found' })
  async getActiveContactPage() {
    return this.contactPageService.getActiveContactPage();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contact page content by ID' })
  @ApiResponse({ status: 200, description: 'Contact page content retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Contact page content not found' })
  async findOne(@Param('id') id: string) {
    return this.contactPageService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create contact page content' })
  @ApiResponse({ status: 201, description: 'Contact page content created successfully' })
  async create(
    @Body() createContactPageContentDto: CreateContactPageContentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contactPageService.create(createContactPageContentDto, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update contact page content' })
  @ApiResponse({ status: 200, description: 'Contact page content updated successfully' })
  @ApiResponse({ status: 404, description: 'Contact page content not found' })
  async update(
    @Param('id') id: string,
    @Body() updateContactPageContentDto: UpdateContactPageContentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contactPageService.update(id, updateContactPageContentDto, user.id);
  }

  @Put(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle contact page active status' })
  @ApiResponse({ status: 200, description: 'Contact page status toggled successfully' })
  @ApiResponse({ status: 404, description: 'Contact page content not found' })
  async toggleActive(@Param('id') id: string, @Body() toggleDto: ToggleContactPageActiveDto) {
    return this.contactPageService.toggleActive(id, toggleDto.isActive);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete contact page content' })
  @ApiResponse({ status: 200, description: 'Contact page content deleted successfully' })
  @ApiResponse({ status: 404, description: 'Contact page content not found' })
  async delete(@Param('id') id: string) {
    return this.contactPageService.delete(id);
  }
}
