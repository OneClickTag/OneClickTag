import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { PlansService } from '../../admin/services/plans.service';

@ApiTags('Public - Plans')
@Controller('v1/plans')
export class PublicPlansController {
  constructor(private readonly plansService: PlansService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all active plans' })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  async findAll() {
    return this.plansService.findAll(true); // Only active plans
  }
}
