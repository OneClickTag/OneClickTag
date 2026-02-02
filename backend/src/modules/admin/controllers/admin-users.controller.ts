import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdminOnly } from '../../auth/decorators/roles.decorator';
import { AdminUsersService } from '../services/admin-users.service';
import { CreateUserDto, UpdateUserDto, BatchDeleteUsersDto, BatchUpdateRoleDto, UserQueryDto } from '../dto/admin-user.dto';

@ApiTags('Admin - Users')
@Controller('v1/admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@AdminOnly()
@ApiBearerAuth()
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll(@Query() query: UserQueryDto) {
    return this.adminUsersService.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or email already exists' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.adminUsersService.create(createUserDto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats() {
    return this.adminUsersService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    return this.adminUsersService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.adminUsersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async delete(@Param('id') id: string) {
    return this.adminUsersService.delete(id);
  }

  @Post('batch-delete')
  @ApiOperation({ summary: 'Batch delete users' })
  @ApiResponse({ status: 200, description: 'Users deleted successfully' })
  async batchDelete(@Body() batchDeleteDto: BatchDeleteUsersDto) {
    return this.adminUsersService.batchDelete(batchDeleteDto.userIds);
  }

  @Post('batch-update-role')
  @ApiOperation({ summary: 'Batch update user roles' })
  @ApiResponse({ status: 200, description: 'User roles updated successfully' })
  async batchUpdateRole(@Body() batchUpdateRoleDto: BatchUpdateRoleDto) {
    return this.adminUsersService.batchUpdateRole(
      batchUpdateRoleDto.userIds,
      batchUpdateRoleDto.role,
    );
  }
}
