import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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

@ApiTags('Compliance - User Consents')
@Controller('compliance/user-consents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserConsentsController {
  constructor(private readonly cookieConsentService: CookieConsentService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all user cookie consents for tenant',
    description: 'Retrieves all cookie consent records with optional filtering by consent type.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-indexed)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' })
  @ApiQuery({ name: 'analyticsCookies', required: false, type: Boolean, description: 'Filter by analytics cookies consent' })
  @ApiQuery({ name: 'marketingCookies', required: false, type: Boolean, description: 'Filter by marketing cookies consent' })
  @ApiQuery({ name: 'newsletterConsent', required: false, type: Boolean, description: 'Filter by newsletter consent' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by user email or anonymous ID' })
  @ApiResponse({
    status: 200,
    description: 'User consents retrieved successfully',
  })
  async getUserConsents(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('analyticsCookies') analyticsCookies?: string,
    @Query('marketingCookies') marketingCookies?: string,
    @Query('newsletterConsent') newsletterConsent?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = Math.min(parseInt(limit || '20', 10), 100);
    const skip = (pageNum - 1) * limitNum;

    return this.cookieConsentService.getAllConsentsWithFilters(user.tenantId, {
      skip,
      take: limitNum,
      analyticsCookies: analyticsCookies === 'true' ? true : analyticsCookies === 'false' ? false : undefined,
      marketingCookies: marketingCookies === 'true' ? true : marketingCookies === 'false' ? false : undefined,
      newsletterConsent: newsletterConsent === 'true' ? true : newsletterConsent === 'false' ? false : undefined,
      search,
    });
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get consent statistics for tenant',
    description: 'Retrieves aggregated statistics about cookie consents.',
  })
  @ApiResponse({
    status: 200,
    description: 'Consent statistics retrieved successfully',
  })
  async getConsentStats(@CurrentUser() user: AuthenticatedUser) {
    return this.cookieConsentService.getConsentStats(user.tenantId);
  }
}
