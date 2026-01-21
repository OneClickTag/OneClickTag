import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { CookieConsentService } from '../services/cookie-consent.service';
import { UpdateCookieBannerDto } from '../dto/update-cookie-banner.dto';
import { RecordConsentDto } from '../dto/record-consent.dto';

@ApiTags('Compliance - Cookie Consent')
@Controller('compliance/consent')
export class CookieConsentController {
  constructor(private readonly cookieConsentService: CookieConsentService) {}

  // ========================================
  // ADMIN ENDPOINTS (Protected)
  // ========================================

  @Get('banner')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get cookie banner configuration',
    description: 'Retrieves cookie consent banner configuration for the current tenant.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cookie banner configuration retrieved successfully',
  })
  async getBannerConfig(@CurrentUser() user: AuthenticatedUser) {
    return this.cookieConsentService.findBanner(user.tenantId);
  }

  @Put('banner')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update cookie banner configuration',
    description: 'Creates or updates cookie consent banner configuration.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cookie banner configuration updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid banner configuration data provided',
  })
  async updateBannerConfig(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCookieBannerDto,
  ) {
    return this.cookieConsentService.createOrUpdateBanner(user.tenantId, dto);
  }

  @Get('records')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all consent records',
    description: 'Retrieves all cookie consent records for the current tenant with pagination.',
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
    name: 'anonymousId',
    required: false,
    description: 'Filter by anonymous ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Consent records retrieved successfully',
  })
  async getAllConsents(
    @CurrentUser() user: AuthenticatedUser,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('userId') userId?: string,
    @Query('anonymousId') anonymousId?: string,
  ) {
    return this.cookieConsentService.getAllConsents(user.tenantId, {
      skip,
      take,
      userId,
      anonymousId,
    });
  }

  // ========================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ========================================

  @Post('record')
  @ApiTags('Public - Cookie Consent')
  @ApiOperation({
    summary: 'Record user cookie consent (public endpoint)',
    description: 'Records a user\'s cookie consent choices. This is a public endpoint used by the cookie banner on client websites.',
  })
  @ApiResponse({
    status: 201,
    description: 'Cookie consent recorded successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid consent data provided',
  })
  async recordConsent(
    @Body() dto: RecordConsentDto,
    @Req() req: any,
  ) {
    // Extract tenant ID from a header (e.g., X-Tenant-ID) or from request context
    // For now, we'll need to get tenantId from the request
    // This assumes the client sends tenantId in the body or we have another way to identify the tenant
    const tenantId = req.headers['x-tenant-id'] || req.body.tenantId;

    if (!tenantId) {
      throw new Error('Tenant ID is required for public consent recording');
    }

    // Extract IP and user agent from request
    const ipAddress = dto.ipAddress || req.ip || req.headers['x-forwarded-for'];
    const userAgent = dto.userAgent || req.headers['user-agent'];

    return this.cookieConsentService.recordConsent(tenantId, {
      ...dto,
      ipAddress,
      userAgent,
    });
  }

  @Get('user-consent')
  @ApiTags('Public - Cookie Consent')
  @ApiOperation({
    summary: 'Get user consent status (public endpoint)',
    description: 'Retrieves a user\'s most recent cookie consent record. Used to check existing consent.',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'User ID',
  })
  @ApiQuery({
    name: 'anonymousId',
    required: false,
    description: 'Anonymous user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'User consent retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'No consent record found',
  })
  async getUserConsent(
    @Req() req: any,
    @Query('userId') userId?: string,
    @Query('anonymousId') anonymousId?: string,
  ) {
    const tenantId = req.headers['x-tenant-id'] || req.query.tenantId;

    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    return this.cookieConsentService.findUserConsent(
      tenantId,
      userId,
      anonymousId,
    );
  }
}
