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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { CookieManagementService } from '../services/cookie-management.service';
import { CreateCookieDto } from '../dto/create-cookie.dto';
import { UpdateCookieDto } from '../dto/update-cookie.dto';

@ApiTags('Compliance - Cookies')
@Controller('compliance/cookies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CookiesController {
  constructor(
    private readonly cookieManagementService: CookieManagementService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all cookies',
    description: 'Retrieves all cookies for the current tenant, optionally filtered by category.',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filter by cookie category ID',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of records per page (default: 10)',
    type: Number,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for cookie name or provider',
  })
  @ApiResponse({
    status: 200,
    description: 'Cookies retrieved successfully',
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);

    return this.cookieManagementService.findAllCookies(
      user.tenantId,
      categoryId,
      pageNum,
      limitNum,
      search,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get cookie by ID',
    description: 'Retrieves a specific cookie by ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Cookie ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Cookie found',
  })
  @ApiResponse({
    status: 404,
    description: 'Cookie not found',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cookieManagementService.findCookieById(id, user.tenantId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new cookie',
    description: 'Creates a new cookie entry for the current tenant.',
  })
  @ApiResponse({
    status: 201,
    description: 'Cookie created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid cookie data provided',
  })
  @ApiResponse({
    status: 404,
    description: 'Cookie category not found',
  })
  async create(
    @Body() createCookieDto: CreateCookieDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cookieManagementService.createCookie(
      user.tenantId,
      createCookieDto,
    );
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update cookie',
    description: 'Updates an existing cookie.',
  })
  @ApiParam({
    name: 'id',
    description: 'Cookie ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Cookie updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Cookie not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid cookie data provided',
  })
  async update(
    @Param('id') id: string,
    @Body() updateCookieDto: UpdateCookieDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cookieManagementService.updateCookie(
      id,
      user.tenantId,
      updateCookieDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete cookie',
    description: 'Deletes a cookie entry.',
  })
  @ApiParam({
    name: 'id',
    description: 'Cookie ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Cookie deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Cookie not found',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.cookieManagementService.deleteCookie(id, user.tenantId);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Bulk delete cookies',
    description: 'Deletes multiple cookies by IDs.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of cookie IDs to delete',
        },
      },
    },
  })
  @ApiResponse({
    status: 204,
    description: 'Cookies deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'One or more cookies not found',
  })
  async bulkDelete(
    @Body('ids') ids: string[],
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.cookieManagementService.deleteMultipleCookies(ids, user.tenantId);
  }
}
