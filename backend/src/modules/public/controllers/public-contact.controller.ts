import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { ContactPageService } from '../../admin/services/contact-page.service';

@ApiTags('Public - Contact Page')
@Controller('v1/contact')
export class PublicContactController {
  constructor(private readonly contactPageService: ContactPageService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get active contact page content' })
  @ApiResponse({ status: 200, description: 'Contact page content retrieved successfully' })
  async getContactPage() {
    return this.contactPageService.getActiveContactPage();
  }
}
