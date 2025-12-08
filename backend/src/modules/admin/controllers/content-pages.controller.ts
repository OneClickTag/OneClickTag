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
import { ContentPagesService } from '../services/content-pages.service';
import {
  CreateContentPageDto,
  UpdateContentPageDto,
  PublishContentPageDto,
} from '../dto/content-page.dto';

@ApiTags('Admin - Content Pages')
@Controller('v1/admin/content')
@UseGuards(JwtAuthGuard, RolesGuard)
@AdminOnly()
@ApiBearerAuth()
export class ContentPagesController {
  constructor(private readonly contentPagesService: ContentPagesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all content pages' })
  @ApiResponse({ status: 200, description: 'Content pages retrieved successfully' })
  async findAll(@Query('published') published?: boolean) {
    return this.contentPagesService.findAll(published);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get content page by ID' })
  @ApiResponse({ status: 200, description: 'Content page retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Content page not found' })
  async findOne(@Param('id') id: string) {
    return this.contentPagesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create content page' })
  @ApiResponse({ status: 201, description: 'Content page created successfully' })
  async create(
    @Body() createContentPageDto: CreateContentPageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contentPagesService.create(createContentPageDto, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update content page' })
  @ApiResponse({ status: 200, description: 'Content page updated successfully' })
  @ApiResponse({ status: 404, description: 'Content page not found' })
  async update(
    @Param('id') id: string,
    @Body() updateContentPageDto: UpdateContentPageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contentPagesService.update(id, updateContentPageDto, user.id);
  }

  @Put(':id/publish')
  @ApiOperation({ summary: 'Publish or unpublish content page' })
  @ApiResponse({ status: 200, description: 'Content page publish status updated' })
  @ApiResponse({ status: 404, description: 'Content page not found' })
  async publish(@Param('id') id: string, @Body() publishDto: PublishContentPageDto) {
    return this.contentPagesService.publish(id, publishDto.isPublished);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete content page' })
  @ApiResponse({ status: 200, description: 'Content page deleted successfully' })
  @ApiResponse({ status: 404, description: 'Content page not found' })
  async delete(@Param('id') id: string) {
    return this.contentPagesService.delete(id);
  }

  @Put('reorder')
  @ApiOperation({ summary: 'Reorder content pages' })
  @ApiResponse({ status: 200, description: 'Content pages reordered successfully' })
  async reorder(@Body() pages: { id: string; order: number }[]) {
    return this.contentPagesService.reorder(pages);
  }
}
