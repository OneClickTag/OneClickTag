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
  HttpCode,
  HttpStatus,
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
import { DataRequestService } from '../services/data-request.service';
import { CreateDataRequestDto } from '../dto/create-data-request.dto';
import { UpdateDataRequestDto } from '../dto/update-data-request.dto';
import { RequestStatus } from '@prisma/client';

@ApiTags('Compliance - Data Requests')
@Controller('compliance/data-requests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DataRequestsController {
  constructor(private readonly dataRequestService: DataRequestService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all data access requests',
    description: 'Retrieves all GDPR data access requests for the current tenant with pagination and filtering.',
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
    name: 'status',
    required: false,
    description: 'Filter by request status',
    enum: RequestStatus,
  })
  @ApiQuery({
    name: 'requestType',
    required: false,
    description: 'Filter by request type',
    enum: RequestType,
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Data requests retrieved successfully',
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: RequestStatus,
    @Query('requestType') requestType?: RequestType,
    @Query('userId') userId?: string,
  ) {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit;
    return this.dataRequestService.findAll(user.tenantId, {
      skip,
      take,
      status,
      requestType,
      userId,
    });
  }

  @Get('export/:userId')
  @ApiOperation({
    summary: 'Export user data (GDPR Article 20)',
    description: 'Exports all data associated with a user in compliance with GDPR right to data portability.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to export data for',
  })
  @ApiResponse({
    status: 200,
    description: 'User data exported successfully',
    schema: {
      type: 'object',
      properties: {
        exportedAt: { type: 'string', format: 'date-time' },
        userData: {
          type: 'object',
          properties: {
            profile: { type: 'object' },
            cookieConsents: { type: 'array' },
            dataAccessRequests: { type: 'array' },
            apiActivityLogs: { type: 'array' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async exportUserData(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dataRequestService.exportUserData(userId, user.tenantId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get data request by ID',
    description: 'Retrieves a specific data access request by ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Data request ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Data request found',
  })
  @ApiResponse({
    status: 404,
    description: 'Data request not found',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dataRequestService.findById(id, user.tenantId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new data access request',
    description: 'Creates a new GDPR data access request for the current tenant.',
  })
  @ApiResponse({
    status: 201,
    description: 'Data request created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data request data provided',
  })
  async create(
    @Body() createDataRequestDto: CreateDataRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dataRequestService.create(
      user.tenantId,
      createDataRequestDto,
      user.id,
    );
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update data request',
    description: 'Updates an existing data access request.',
  })
  @ApiParam({
    name: 'id',
    description: 'Data request ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Data request updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Data request not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data request data provided',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDataRequestDto: UpdateDataRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dataRequestService.update(
      id,
      user.tenantId,
      updateDataRequestDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete data request',
    description: 'Deletes a data access request.',
  })
  @ApiParam({
    name: 'id',
    description: 'Data request ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Data request deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Data request not found',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.dataRequestService.delete(id, user.tenantId);
  }
}
