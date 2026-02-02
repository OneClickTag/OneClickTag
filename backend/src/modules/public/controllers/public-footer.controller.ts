import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { FooterService } from '../../admin/services/footer.service';

@ApiTags('Public - Footer')
@Controller('v1/footer')
export class PublicFooterController {
  constructor(private readonly footerService: FooterService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get active footer content' })
  @ApiResponse({ status: 200, description: 'Footer content retrieved successfully' })
  async getFooter() {
    return this.footerService.findActive();
  }
}
