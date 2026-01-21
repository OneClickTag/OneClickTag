import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { CookieManagementService } from '../services/cookie-management.service';
import { CreateCookieCategoryDto } from '../dto/create-cookie-category.dto';
import { UpdateCookieCategoryDto } from '../dto/update-cookie-category.dto';

@ApiTags('Compliance - Cookie Categories')
@Controller('compliance/cookie-categories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CookieCategoriesController {
  constructor(
    private readonly cookieManagementService: CookieManagementService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all cookie categories',
    description: 'Retrieves all cookie categories for the current tenant.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cookie categories retrieved successfully',
  })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.cookieManagementService.findAllCategories(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get cookie category by ID',
    description: 'Retrieves a specific cookie category by ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Cookie category ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Cookie category found',
  })
  @ApiResponse({
    status: 404,
    description: 'Cookie category not found',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cookieManagementService.findCategoryById(id, user.tenantId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new cookie category',
    description: 'Creates a new cookie category for the current tenant.',
  })
  @ApiResponse({
    status: 201,
    description: 'Cookie category created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid cookie category data provided',
  })
  async create(
    @Body() createCookieCategoryDto: CreateCookieCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cookieManagementService.createCategory(
      user.tenantId,
      createCookieCategoryDto,
    );
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update cookie category',
    description: 'Updates an existing cookie category.',
  })
  @ApiParam({
    name: 'id',
    description: 'Cookie category ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Cookie category updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Cookie category not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid cookie category data provided',
  })
  async update(
    @Param('id') id: string,
    @Body() updateCookieCategoryDto: UpdateCookieCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cookieManagementService.updateCategory(
      id,
      user.tenantId,
      updateCookieCategoryDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete cookie category',
    description: 'Deletes a cookie category and all associated cookies.',
  })
  @ApiParam({
    name: 'id',
    description: 'Cookie category ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Cookie category deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Cookie category not found',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.cookieManagementService.deleteCategory(id, user.tenantId);
  }
}
