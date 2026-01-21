import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { ApiAuditService } from '../services/api-audit.service';

@ApiTags('Compliance - API Audit Logs')
@Controller('compliance/audit-logs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiAuditController {
  constructor(private readonly apiAuditService: ApiAuditService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all API audit logs',
    description: 'Retrieves all API audit logs for the current tenant with pagination and filtering.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of records per page',
    type: Number,
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'service',
    required: false,
    description: 'Filter by service name',
  })
  @ApiQuery({
    name: 'method',
    required: false,
    description: 'Filter by HTTP method (GET, POST, PUT, DELETE)',
  })
  @ApiQuery({
    name: 'statusCode',
    required: false,
    description: 'Filter by exact status code',
    type: Number,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for filtering (ISO 8601 format)',
    type: String,
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for filtering (ISO 8601 format)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        logs: { type: 'array' },
        total: { type: 'number' },
        skip: { type: 'number' },
        take: { type: 'number' },
      },
    },
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('userId') userId?: string,
    @Query('service') service?: string,
    @Query('method') httpMethod?: string,
    @Query('statusCode', new ParseIntPipe({ optional: true })) statusCode?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit;
    return this.apiAuditService.findAll(user.tenantId, {
      skip,
      take,
      userId,
      apiService: service,
      httpMethod,
      minStatus: statusCode,
      maxStatus: statusCode,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get audit log by ID',
    description: 'Retrieves a specific API audit log by ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Audit log ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit log found',
  })
  @ApiResponse({
    status: 404,
    description: 'Audit log not found',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.apiAuditService.findById(id, user.tenantId);
  }
}
