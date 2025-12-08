import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { ContentPagesService } from '../../admin/services/content-pages.service';

@ApiTags('Public - Content')
@Controller('v1/content')
export class PublicContentController {
  constructor(private readonly contentPagesService: ContentPagesService) {}

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get published content page by slug' })
  @ApiResponse({ status: 200, description: 'Content page retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Content page not found or not published' })
  async findBySlug(@Param('slug') slug: string) {
    return this.contentPagesService.findBySlug(slug);
  }
}
