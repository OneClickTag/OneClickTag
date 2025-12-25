import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { GoogleAdsService } from '../services/google-ads.service';
import { ConversionActionsService } from '../services/conversion-actions.service';
import { Auth0Middleware } from '../../auth/middleware/auth0.middleware';
import { EarlyAccessGuard } from '../../auth/guards/early-access.guard';
import { TenantContextMiddleware } from '../../auth/middleware/tenant-context.middleware';
import { TenantContext } from '../../tenant/decorators/tenant-context.decorator';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CreateConversionActionDto,
  UpdateConversionActionDto,
  CampaignResponseDto,
  ConversionActionResponseDto,
  GoogleAdsQueryDto,
  GoogleAdsMetricsDto,
  GTMLinkingDto,
} from '../dto';
import {
  GoogleAdsAccount,
  GoogleAdsCampaign,
  ConversionAction as ConversionActionType,
} from '../types/google-ads.types';

@ApiTags('Google Ads Integration')
@ApiBearerAuth()
@ApiSecurity('Auth0')
@UseGuards(Auth0Middleware, EarlyAccessGuard)
@Controller('v1/customers/:customerId/google-ads')
export class GoogleAdsController {
  private readonly logger = new Logger(GoogleAdsController.name);

  constructor(
    private readonly googleAdsService: GoogleAdsService,
    private readonly conversionActionsService: ConversionActionsService,
  ) {}

  // ==================== ACCOUNTS ====================

  @Get('accounts')
  @ApiOperation({ 
    summary: 'Get Google Ads accounts',
    description: 'Retrieve all Google Ads accounts accessible by the authenticated customer'
  })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({
    status: 200,
    description: 'List of Google Ads accounts',
    type: [Object],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async getAccounts(
    @Param('customerId') customerId: string,
  ): Promise<GoogleAdsAccount[]> {
    this.logger.log(`Getting Google Ads accounts for customer: ${customerId}`);
    return this.googleAdsService.getCustomerAccounts(customerId);
  }

  // ==================== CAMPAIGNS ====================

  @Get('accounts/:adsAccountId/campaigns')
  @ApiOperation({ 
    summary: 'Get campaigns',
    description: 'Retrieve campaigns for a specific Google Ads account'
  })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiParam({ name: 'adsAccountId', description: 'Google Ads Account ID' })
  @ApiQuery({ name: 'includeMetrics', required: false, type: Boolean, description: 'Include campaign metrics' })
  @ApiResponse({
    status: 200,
    description: 'List of campaigns',
    type: [Object],
  })
  async getCampaigns(
    @Param('customerId') customerId: string,
    @Param('adsAccountId') adsAccountId: string,
    @Query('includeMetrics') includeMetrics?: boolean,
  ): Promise<GoogleAdsCampaign[]> {
    this.logger.log(`Getting campaigns for customer: ${customerId}, account: ${adsAccountId}`);
    return this.googleAdsService.getCampaigns(customerId, adsAccountId, includeMetrics || false);
  }

  @Post('accounts/:adsAccountId/campaigns')
  @ApiOperation({ 
    summary: 'Create campaign',
    description: 'Create a new Google Ads campaign'
  })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiParam({ name: 'adsAccountId', description: 'Google Ads Account ID' })
  @ApiBody({ type: CreateCampaignDto })
  @ApiResponse({
    status: 201,
    description: 'Campaign created successfully',
    type: CampaignResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid campaign data' })
  async createCampaign(
    @Param('customerId') customerId: string,
    @Param('adsAccountId') adsAccountId: string,
    @Body() createCampaignDto: CreateCampaignDto,
  ): Promise<CampaignResponseDto> {
    this.logger.log(`Creating campaign for customer: ${customerId}, account: ${adsAccountId}`);
    return this.googleAdsService.createCampaign(customerId, adsAccountId, createCampaignDto);
  }

  @Put('accounts/:adsAccountId/campaigns/:campaignId')
  @ApiOperation({ 
    summary: 'Update campaign',
    description: 'Update an existing Google Ads campaign'
  })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiParam({ name: 'adsAccountId', description: 'Google Ads Account ID' })
  @ApiParam({ name: 'campaignId', description: 'Campaign ID' })
  @ApiBody({ type: UpdateCampaignDto })
  @ApiResponse({
    status: 200,
    description: 'Campaign updated successfully',
    type: CampaignResponseDto,
  })
  async updateCampaign(
    @Param('customerId') customerId: string,
    @Param('adsAccountId') adsAccountId: string,
    @Param('campaignId') campaignId: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ): Promise<CampaignResponseDto> {
    this.logger.log(`Updating campaign: ${campaignId} for customer: ${customerId}`);
    return this.googleAdsService.updateCampaign(customerId, adsAccountId, campaignId, updateCampaignDto);
  }

  // ==================== CONVERSION ACTIONS ====================

  @Get('accounts/:adsAccountId/conversion-actions')
  @ApiOperation({ 
    summary: 'Get conversion actions',
    description: 'Retrieve conversion actions for a Google Ads account'
  })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiParam({ name: 'adsAccountId', description: 'Google Ads Account ID' })
  @ApiResponse({
    status: 200,
    description: 'List of conversion actions',
    type: [Object],
  })
  async getConversionActions(
    @Param('customerId') customerId: string,
    @Param('adsAccountId') adsAccountId: string,
  ): Promise<ConversionActionType[]> {
    this.logger.log(`Getting conversion actions for customer: ${customerId}, account: ${adsAccountId}`);
    return this.conversionActionsService.getConversionActions(customerId, adsAccountId);
  }

  @Post('accounts/:adsAccountId/conversion-actions')
  @ApiOperation({ 
    summary: 'Create conversion action',
    description: 'Create a new conversion action for tracking'
  })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiParam({ name: 'adsAccountId', description: 'Google Ads Account ID' })
  @ApiBody({ type: CreateConversionActionDto })
  @ApiResponse({
    status: 201,
    description: 'Conversion action created successfully',
    type: ConversionActionResponseDto,
  })
  async createConversionAction(
    @Param('customerId') customerId: string,
    @Param('adsAccountId') adsAccountId: string,
    @Body() createConversionActionDto: CreateConversionActionDto,
  ): Promise<ConversionActionResponseDto> {
    this.logger.log(`Creating conversion action for customer: ${customerId}, account: ${adsAccountId}`);
    return this.conversionActionsService.createConversionAction(
      customerId,
      adsAccountId,
      createConversionActionDto,
    );
  }

  @Put('accounts/:adsAccountId/conversion-actions/:conversionActionId')
  @ApiOperation({ 
    summary: 'Update conversion action',
    description: 'Update an existing conversion action'
  })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiParam({ name: 'adsAccountId', description: 'Google Ads Account ID' })
  @ApiParam({ name: 'conversionActionId', description: 'Conversion Action ID' })
  @ApiBody({ type: UpdateConversionActionDto })
  @ApiResponse({
    status: 200,
    description: 'Conversion action updated successfully',
    type: ConversionActionResponseDto,
  })
  async updateConversionAction(
    @Param('customerId') customerId: string,
    @Param('adsAccountId') adsAccountId: string,
    @Param('conversionActionId') conversionActionId: string,
    @Body() updateConversionActionDto: UpdateConversionActionDto,
  ): Promise<ConversionActionResponseDto> {
    this.logger.log(`Updating conversion action: ${conversionActionId} for customer: ${customerId}`);
    return this.conversionActionsService.updateConversionAction(
      customerId,
      adsAccountId,
      conversionActionId,
      updateConversionActionDto,
    );
  }

  @Delete('accounts/:adsAccountId/conversion-actions/:conversionActionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Delete conversion action',
    description: 'Delete a conversion action'
  })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiParam({ name: 'adsAccountId', description: 'Google Ads Account ID' })
  @ApiParam({ name: 'conversionActionId', description: 'Conversion Action ID' })
  @ApiResponse({ status: 204, description: 'Conversion action deleted successfully' })
  async deleteConversionAction(
    @Param('customerId') customerId: string,
    @Param('adsAccountId') adsAccountId: string,
    @Param('conversionActionId') conversionActionId: string,
  ): Promise<void> {
    this.logger.log(`Deleting conversion action: ${conversionActionId} for customer: ${customerId}`);
    return this.conversionActionsService.deleteConversionAction(
      customerId,
      adsAccountId,
      conversionActionId,
    );
  }

  // ==================== TAG SNIPPETS & GTM ====================

  @Get('accounts/:adsAccountId/conversion-actions/:conversionActionId/tag-snippets')
  @ApiOperation({ 
    summary: 'Get tag snippets',
    description: 'Get tag snippets for a conversion action'
  })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiParam({ name: 'adsAccountId', description: 'Google Ads Account ID' })
  @ApiParam({ name: 'conversionActionId', description: 'Conversion Action ID' })
  @ApiResponse({
    status: 200,
    description: 'Tag snippets retrieved successfully',
    type: Object,
  })
  async getTagSnippets(
    @Param('customerId') customerId: string,
    @Param('adsAccountId') adsAccountId: string,
    @Param('conversionActionId') conversionActionId: string,
  ): Promise<any> {
    this.logger.log(`Getting tag snippets for conversion action: ${conversionActionId}`);
    return this.conversionActionsService.getConversionActionTagSnippets(
      customerId,
      adsAccountId,
      conversionActionId,
    );
  }

  @Post('accounts/:adsAccountId/conversion-actions/:conversionActionId/link-gtm')
  @ApiOperation({ 
    summary: 'Link with GTM',
    description: 'Link conversion action with Google Tag Manager'
  })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiParam({ name: 'adsAccountId', description: 'Google Ads Account ID' })
  @ApiParam({ name: 'conversionActionId', description: 'Conversion Action ID' })
  @ApiBody({ type: GTMLinkingDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully linked with GTM',
    type: Object,
  })
  async linkWithGTM(
    @Param('customerId') customerId: string,
    @Param('adsAccountId') adsAccountId: string,
    @Param('conversionActionId') conversionActionId: string,
    @Body() gtmLinkingDto: GTMLinkingDto,
  ): Promise<{ success: boolean; gtmTagId?: string; message: string }> {
    this.logger.log(`Linking conversion action ${conversionActionId} with GTM`);
    return this.conversionActionsService.linkWithGTM(
      customerId,
      adsAccountId,
      conversionActionId,
      gtmLinkingDto,
    );
  }

  // ==================== METRICS & QUERIES ====================

  @Post('accounts/:adsAccountId/query')
  @ApiOperation({ 
    summary: 'Execute GAQL query',
    description: 'Execute a custom Google Ads Query Language (GAQL) query'
  })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiParam({ name: 'adsAccountId', description: 'Google Ads Account ID' })
  @ApiBody({ type: GoogleAdsQueryDto })
  @ApiResponse({
    status: 200,
    description: 'Query executed successfully',
    type: [Object],
  })
  async executeQuery(
    @Param('customerId') customerId: string,
    @Param('adsAccountId') adsAccountId: string,
    @Body() queryDto: GoogleAdsQueryDto,
  ): Promise<any[]> {
    this.logger.log(`Executing GAQL query for customer: ${customerId}, account: ${adsAccountId}`);
    return this.googleAdsService.executeQuery(customerId, adsAccountId, queryDto);
  }

  @Post('accounts/:adsAccountId/metrics/campaigns')
  @ApiOperation({ 
    summary: 'Get campaign metrics',
    description: 'Retrieve campaign performance metrics'
  })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiParam({ name: 'adsAccountId', description: 'Google Ads Account ID' })
  @ApiBody({ type: GoogleAdsMetricsDto })
  @ApiResponse({
    status: 200,
    description: 'Campaign metrics retrieved successfully',
    type: [Object],
  })
  async getCampaignMetrics(
    @Param('customerId') customerId: string,
    @Param('adsAccountId') adsAccountId: string,
    @Body() metricsDto: GoogleAdsMetricsDto,
  ): Promise<any[]> {
    this.logger.log(`Getting campaign metrics for customer: ${customerId}, account: ${adsAccountId}`);
    return this.googleAdsService.getCampaignMetrics(customerId, adsAccountId, metricsDto);
  }
}