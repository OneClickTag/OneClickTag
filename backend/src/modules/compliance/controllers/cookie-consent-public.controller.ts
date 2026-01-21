import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  BadRequestException,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { CookieConsentService } from '../services/cookie-consent.service';
import { RecordConsentDto } from '../dto/record-consent.dto';

@ApiTags('Public - Cookie Consent')
@Controller('public/consent')
export class CookieConsentPublicController {
  constructor(private readonly cookieConsentService: CookieConsentService) {}

  @Get('banner')
  @ApiOperation({
    summary: 'Get cookie banner configuration (public endpoint)',
    description: 'Retrieves cookie consent banner configuration for display to end users. This is a public endpoint used by the cookie banner script.',
  })
  @ApiQuery({
    name: 'tenantId',
    required: true,
    description: 'Tenant ID (embedded in cookie banner script)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Cookie banner configuration retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'No banner configuration found for this tenant',
  })
  async getBannerConfig(@Query('tenantId') tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    return this.cookieConsentService.findBanner(tenantId);
  }

  @Post('record')
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
    // tenantId comes from DTO (embedded in cookie banner script on tenant's website)
    // TODO: Add signature validation to prevent tenant ID spoofing
    // Future: Implement signed tokens or domain-based tenant identification for enhanced security

    // Extract IP and user agent from request
    const ipAddress = dto.ipAddress || req.ip || req.headers['x-forwarded-for'];
    const userAgent = dto.userAgent || req.headers['user-agent'];

    return this.cookieConsentService.recordConsent(dto.tenantId, {
      ...dto,
      ipAddress,
      userAgent,
    });
  }

  @Get('user-consent')
  @ApiOperation({
    summary: 'Get user consent status (public endpoint)',
    description: 'Retrieves a user\'s most recent cookie consent record. Used to check existing consent.',
  })
  @ApiQuery({
    name: 'tenantId',
    required: true,
    description: 'Tenant ID (embedded in cookie banner script)',
    type: String,
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
    @Query('tenantId') tenantId: string,
    @Query('userId') userId?: string,
    @Query('anonymousId') anonymousId?: string,
  ) {
    // tenantId comes from query parameter (embedded in cookie banner script)
    // TODO: Add signature validation to prevent tenant ID spoofing
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    return this.cookieConsentService.findUserConsent(
      tenantId,
      userId,
      anonymousId,
    );
  }
}
