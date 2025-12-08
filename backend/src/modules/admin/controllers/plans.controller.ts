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
import { PlansService } from '../services/plans.service';
import { CreatePlanDto, UpdatePlanDto, TogglePlanActiveDto } from '../dto/plan.dto';

@ApiTags('Admin - Plans')
@Controller('v1/admin/plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@AdminOnly()
@ApiBearerAuth()
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'Get all plans' })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  async findAll(@Query('activeOnly') activeOnly?: boolean) {
    return this.plansService.findAll(activeOnly === true);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get plan by ID' })
  @ApiResponse({ status: 200, description: 'Plan retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create plan' })
  @ApiResponse({ status: 201, description: 'Plan created successfully' })
  async create(@Body() createPlanDto: CreatePlanDto) {
    return this.plansService.create(createPlanDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update plan' })
  @ApiResponse({ status: 200, description: 'Plan updated successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async update(@Param('id') id: string, @Body() updatePlanDto: UpdatePlanDto) {
    return this.plansService.update(id, updatePlanDto);
  }

  @Put(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle plan active status' })
  @ApiResponse({ status: 200, description: 'Plan status updated successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async toggleActive(@Param('id') id: string, @Body() toggleDto: TogglePlanActiveDto) {
    return this.plansService.toggleActive(id, toggleDto.isActive);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete plan' })
  @ApiResponse({ status: 200, description: 'Plan deleted successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async delete(@Param('id') id: string) {
    return this.plansService.delete(id);
  }

  @Put('reorder')
  @ApiOperation({ summary: 'Reorder plans' })
  @ApiResponse({ status: 200, description: 'Plans reordered successfully' })
  async reorder(@Body() plans: { id: string; order: number }[]) {
    return this.plansService.reorder(plans);
  }
}
