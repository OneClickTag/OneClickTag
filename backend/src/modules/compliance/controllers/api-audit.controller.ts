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
    name: 'skip',
    required: false,
    description: 'Number of records to skip',
    type: Number,
  })
  @ApiQuery({
    name: 'take',
    required: false,
    description: 'Number of records to return',
    type: Number,
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'customerId',
    required: false,
    description: 'Filter by customer ID',
  })
  @ApiQuery({
    name: 'apiService',
    required: false,
    description: 'Filter by API service (e.g., GOOGLE_ADS, GTM)',
  })
  @ApiQuery({
    name: 'httpMethod',
    required: false,
    description: 'Filter by HTTP method (GET, POST, PUT, DELETE)',
  })
  @ApiQuery({
    name: 'minStatus',
    required: false,
    description: 'Minimum response status code (e.g., 400 for errors)',
    type: Number,
  })
  @ApiQuery({
    name: 'maxStatus',
    required: false,
    description: 'Maximum response status code (e.g., 499 for client errors)',
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
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('userId') userId?: string,
    @Query('customerId') customerId?: string,
    @Query('apiService') apiService?: string,
    @Query('httpMethod') httpMethod?: string,
    @Query('minStatus', new ParseIntPipe({ optional: true })) minStatus?: number,
    @Query('maxStatus', new ParseIntPipe({ optional: true })) maxStatus?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.apiAuditService.findAll(user.tenantId, {
      skip,
      take,
      userId,
      customerId,
      apiService,
      httpMethod,
      minStatus,
      maxStatus,
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
