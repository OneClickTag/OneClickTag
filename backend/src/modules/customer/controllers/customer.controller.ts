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
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
  UseInterceptors,
  Logger,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../tenant/guards/tenant.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { UserId } from '../../tenant/decorators/tenant-context.decorator';
import { CustomerService } from '../services/customer.service';
import { GoogleIntegrationService } from '../services/google-integration.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerResponseDto,
  CustomerQueryDto,
  PaginatedCustomerResponseDto,
  BulkCreateCustomerDto,
  BulkUpdateCustomerDto,
  BulkDeleteCustomerDto,
  BulkOperationResultDto,
  ConnectGoogleAccountDto,
} from '../dto';
import {
  CustomerNotFoundException,
  CustomerEmailConflictException,
  CustomerGoogleAccountException,
  InvalidCustomerDataException,
} from '../exceptions/customer.exceptions';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomerController {
  private readonly logger = new Logger(CustomerController.name);

  constructor(
    private readonly customerService: CustomerService,
    private readonly googleIntegrationService: GoogleIntegrationService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new customer',
    description:
      'Creates a new customer within the current tenant scope. Email must be unique within the tenant.',
  })
  @ApiCreatedResponse({
    description: 'Customer created successfully',
    type: CustomerResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid customer data provided',
  })
  @ApiConflictResponse({
    description: 'Customer with this email already exists in the tenant',
  })
  @ApiBody({ type: CreateCustomerDto })
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<CustomerResponseDto> {
    this.logger.log(
      `Creating customer: ${createCustomerDto.email} for user: ${user.id}, tenant: ${user.tenantId}`
    );

    if (!user.tenantId) {
      throw new Error('User must have a tenant assigned');
    }

    return this.customerService.createWithTenant(
      createCustomerDto,
      user.id,
      user.tenantId
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get paginated list of customers',
    description:
      'Retrieves a paginated list of customers with optional search, filtering, and sorting capabilities.',
  })
  @ApiOkResponse({
    description: 'Customers retrieved successfully',
    type: PaginatedCustomerResponseDto,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (1-based)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page (max 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for name, email, or company',
    example: 'john doe',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by customer status',
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED'],
  })
  @ApiQuery({
    name: 'company',
    required: false,
    description: 'Filter by company name',
    example: 'Acme Corp',
  })
  @ApiQuery({
    name: 'tags',
    required: false,
    description: 'Filter by tags (comma-separated)',
    example: 'vip,premium',
  })
  @ApiQuery({
    name: 'hasGoogleAccount',
    required: false,
    description: 'Filter customers with/without Google account',
    type: Boolean,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort field',
    enum: [
      'createdAt',
      'updatedAt',
      'firstName',
      'lastName',
      'email',
      'company',
      'status',
    ],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order',
    enum: ['asc', 'desc'],
  })
  @ApiQuery({
    name: 'includeGoogleAds',
    required: false,
    description: 'Include Google Ads accounts in response',
    type: Boolean,
  })
  async findAll(
    @Query(new ValidationPipe({ transform: true })) query: CustomerQueryDto
  ): Promise<PaginatedCustomerResponseDto> {
    this.logger.log(`Fetching customers with query: ${JSON.stringify(query)}`);
    return this.customerService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get customer statistics',
    description: 'Retrieves customer statistics for the current tenant.',
  })
  @ApiOkResponse({
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', description: 'Total number of customers' },
        byStatus: {
          type: 'object',
          properties: {
            active: { type: 'number' },
            inactive: { type: 'number' },
            suspended: { type: 'number' },
          },
        },
        withGoogleAccount: {
          type: 'number',
          description: 'Customers with Google account connected',
        },
        withoutGoogleAccount: {
          type: 'number',
          description: 'Customers without Google account',
        },
        recentlyCreated: {
          type: 'number',
          description: 'Customers created in the last 30 days',
        },
        tenantId: { type: 'string' },
        lastUpdated: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getStats() {
    this.logger.log('Fetching customer statistics');
    return this.customerService.getStats();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get customer by ID',
    description:
      'Retrieves a specific customer by ID within the current tenant scope.',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'includeGoogleAds',
    required: false,
    description: 'Include Google Ads accounts in response',
    type: Boolean,
  })
  @ApiOkResponse({
    description: 'Customer found',
    type: CustomerResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Customer not found',
  })
  async findOne(
    @Param('id') id: string,
    @Query('includeGoogleAds') includeGoogleAds?: boolean
  ): Promise<CustomerResponseDto> {
    this.logger.log(`Fetching customer: ${id}`);
    return this.customerService.findOne(id, includeGoogleAds);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update customer',
    description: 'Updates a customer within the current tenant scope.',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Customer updated successfully',
    type: CustomerResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid customer data provided',
  })
  @ApiNotFoundResponse({
    description: 'Customer not found',
  })
  @ApiConflictResponse({
    description: 'Email already exists for another customer',
  })
  @ApiBody({ type: UpdateCustomerDto })
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<CustomerResponseDto> {
    this.logger.log(`Updating customer: ${id}`);
    return this.customerService.update(id, updateCustomerDto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete customer',
    description:
      'Deletes a customer and all associated data within the current tenant scope.',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
    format: 'uuid',
  })
  @ApiNoContentResponse({
    description: 'Customer deleted successfully',
  })
  @ApiNotFoundResponse({
    description: 'Customer not found',
  })
  async remove(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting customer: ${id}`);
    return this.customerService.remove(id);
  }

  // Bulk Operations
  @Post('bulk/create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Bulk create customers',
    description:
      'Creates multiple customers in a single operation. Returns results for each customer.',
  })
  @ApiCreatedResponse({
    description: 'Bulk create operation completed',
    type: [BulkOperationResultDto],
  })
  @ApiBody({ type: BulkCreateCustomerDto })
  async bulkCreate(
    @Body() bulkCreateDto: BulkCreateCustomerDto,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<BulkOperationResultDto[]> {
    this.logger.log(
      `Bulk creating ${bulkCreateDto.customers.length} customers`
    );
    return this.customerService.bulkCreate(bulkCreateDto, user.id);
  }

  @Put('bulk/update')
  @ApiOperation({
    summary: 'Bulk update customers',
    description:
      'Updates multiple customers in a single operation. Returns results for each customer.',
  })
  @ApiOkResponse({
    description: 'Bulk update operation completed',
    type: [BulkOperationResultDto],
  })
  @ApiBody({ type: BulkUpdateCustomerDto })
  async bulkUpdate(
    @Body() bulkUpdateDto: BulkUpdateCustomerDto,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<BulkOperationResultDto[]> {
    this.logger.log(`Bulk updating ${bulkUpdateDto.updates.length} customers`);
    return this.customerService.bulkUpdate(bulkUpdateDto, user.id);
  }

  @Delete('bulk/delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk delete customers',
    description:
      'Deletes multiple customers in a single operation. Returns results for each customer.',
  })
  @ApiOkResponse({
    description: 'Bulk delete operation completed',
    type: [BulkOperationResultDto],
  })
  @ApiBody({ type: BulkDeleteCustomerDto })
  async bulkDelete(
    @Body() bulkDeleteDto: BulkDeleteCustomerDto
  ): Promise<BulkOperationResultDto[]> {
    this.logger.log(
      `Bulk deleting ${bulkDeleteDto.customerIds.length} customers`
    );
    return this.customerService.bulkDelete(bulkDeleteDto);
  }

  // Google Integration
  @Get(':id/google/status')
  @ApiOperation({
    summary: 'Get Google connection status',
    description: 'Check the Google connection status and available scopes for a customer.',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
  })
  @ApiOkResponse({
    description: 'Google connection status retrieved',
    schema: {
      type: 'object',
      properties: {
        connected: { type: 'boolean' },
        hasAdsAccess: { type: 'boolean' },
        hasGTMAccess: { type: 'boolean' },
        googleEmail: { type: 'string', nullable: true },
        connectedAt: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  async getGoogleConnectionStatus(@Param('id') id: string) {
    this.logger.log(`Checking Google connection status for customer: ${id}`);
    return this.googleIntegrationService.getConnectionStatus(id);
  }

  @Get(':id/google/auth-url')
  @ApiOperation({
    summary: 'Get Google OAuth authorization URL',
    description:
      "Generates a Google OAuth URL for connecting a customer's Google account.",
  })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
    schema: {
      type: 'string',
      pattern: '^c[a-z0-9]{24,32}$', // CUID regex pattern (adjust if needed)
      example: 'cmf332x0n0002ti2mb86y25xt',
    },
  })
  @ApiOkResponse({
    description: 'Google auth URL generated',
    schema: {
      type: 'object',
      properties: {
        authUrl: {
          type: 'string',
          description: 'Google OAuth authorization URL',
        },
        customerId: { type: 'string', description: 'Customer ID' },
      },
    },
  })
  async getGoogleAuthUrl(@Param('id') id: string) {
    this.logger.log(`Generating Google auth URL for customer: ${id}`);
    const authUrl = this.googleIntegrationService.getGoogleAuthUrl(id);
    return { authUrl, customerId: id };
  }

  @Post(':id/google/connect')
  @ApiOperation({
    summary: 'Connect Google account',
    description:
      "Connects a customer's Google account using OAuth authorization code.",
  })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Google account connected successfully',
    type: CustomerResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid authorization code or connection failed',
  })
  @ApiNotFoundResponse({
    description: 'Customer not found',
  })
  @ApiBody({ type: ConnectGoogleAccountDto })
  async connectGoogleAccount(
    @Param('id') id: string,
    @Body() connectDto: ConnectGoogleAccountDto
  ): Promise<CustomerResponseDto> {
    this.logger.log(`Connecting Google account for customer: ${id}`);
    return this.googleIntegrationService.connectGoogleAccount(id, connectDto);
  }

  @Delete(':id/google/disconnect')
  @ApiOperation({
    summary: 'Disconnect Google account',
    description:
      "Disconnects a customer's Google account and removes all associated data.",
  })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Google account disconnected successfully',
    type: CustomerResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Customer not found',
  })
  @ApiBadRequestResponse({
    description: 'Customer does not have a connected Google account',
  })
  async disconnectGoogleAccount(
    @Param('id') id: string
  ): Promise<CustomerResponseDto> {
    this.logger.log(`Disconnecting Google account for customer: ${id}`);
    return this.googleIntegrationService.disconnectGoogleAccount(id);
  }

  @Post(':id/google/sync-ads')
  @ApiOperation({
    summary: 'Sync Google Ads accounts',
    description:
      'Synchronizes Google Ads accounts for a customer with connected Google account.',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Google Ads accounts synced successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          accountId: { type: 'string' },
          accountName: { type: 'string' },
          currency: { type: 'string' },
          timeZone: { type: 'string' },
          isActive: { type: 'boolean' },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Customer not found',
  })
  @ApiBadRequestResponse({
    description: 'Customer does not have a connected Google account',
  })
  async syncGoogleAdsAccounts(@Param('id') id: string) {
    this.logger.log(`Syncing Google Ads accounts for customer: ${id}`);
    return this.googleIntegrationService.syncGoogleAdsAccounts(id);
  }

  @Get(':id/google/ads-accounts')
  @ApiOperation({
    summary: 'Get Google Ads accounts',
    description:
      'Retrieves all Google Ads accounts associated with a customer.',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Google Ads accounts retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          googleAccountId: { type: 'string' },
          accountId: { type: 'string' },
          accountName: { type: 'string' },
          currency: { type: 'string' },
          timeZone: { type: 'string' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getGoogleAdsAccounts(@Param('id') id: string) {
    this.logger.log(`Fetching Google Ads accounts for customer: ${id}`);
    return this.googleIntegrationService.getGoogleAdsAccounts(id);
  }

  @Post(':id/tracking/create')
  @ApiOperation({
    summary: 'Create tracking configuration',
    description: 'Creates a complete tracking setup with GTM trigger, tag, and Google Ads conversion action.',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
  })
  @ApiOkResponse({
    description: 'Tracking configuration created successfully',
    schema: {
      type: 'object',
      properties: {
        trackingId: { type: 'string' },
        gtmTriggerId: { type: 'string' },
        gtmTagId: { type: 'string' },
        conversionActionId: { type: 'string' },
        status: { type: 'string' },
        message: { type: 'string' },
      },
    },
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Tracking name' },
        type: { type: 'string', enum: ['button_click', 'page_view', 'form_submit', 'link_click', 'element_visibility'] },
        selector: { type: 'string', description: 'CSS selector or URL pattern' },
        description: { type: 'string', description: 'Optional description' },
      },
      required: ['name', 'type', 'selector'],
    },
  })
  async createTracking(
    @Param('id') id: string,
    @Body() trackingData: {
      name: string;
      type: string;
      selector: string;
      description?: string;
    },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.logger.log(`Creating tracking configuration for customer: ${id}`);
    return this.googleIntegrationService.createCompleteTracking(id, trackingData, user.id);
  }

  @Sse(':id/google/connection-progress')
  @ApiOperation({
    summary: 'Get real-time Google connection progress (SSE)',
    description: 'Server-Sent Events endpoint that streams real-time progress updates during Google account connection.',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
  })
  @ApiOkResponse({
    description: 'SSE stream of connection progress events',
    schema: {
      type: 'object',
      properties: {
        step: {
          type: 'string',
          enum: ['oauth', 'tokens', 'ads', 'ga4', 'gtm', 'complete', 'error'],
          description: 'Current connection step'
        },
        status: {
          type: 'string',
          enum: ['pending', 'success', 'error'],
          description: 'Status of the current step'
        },
        message: { type: 'string', description: 'Human-readable message' },
        error: { type: 'string', nullable: true, description: 'Error message if status is error' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  connectionProgress(@Param('id') id: string): Observable<MessageEvent> {
    this.logger.log(`SSE connection progress requested for customer: ${id}`);
    return this.googleIntegrationService.getConnectionProgress(id);
  }
}
