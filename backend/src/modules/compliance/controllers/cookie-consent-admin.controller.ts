import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
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

@ApiTags('Compliance - Cookie Consent')
@Controller('compliance/consent')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CookieConsentAdminController {
  constructor(private readonly cookieConsentService: CookieConsentService) {}

  @Get('banner')
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
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
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
}
