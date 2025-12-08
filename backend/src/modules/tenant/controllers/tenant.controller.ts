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
  UseInterceptors,
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
import { TenantService } from '../services/tenant.service';
import { TenantCacheService } from '../services/tenant-cache.service';
import { TenantContext, TenantId } from '../decorators/tenant-context.decorator';
import { RequireTenant, BypassTenant } from '../decorators/require-tenant.decorator';
import {
  CreateTenantDto,
  UpdateTenantDto,
  TenantResponseDto,
  TenantStatsDto,
  BulkTenantUpdateDto,
  BulkTenantUpdateResultDto,
  CacheKeyDto,
  CacheValueDto,
  CacheStatsDto,
  CacheKeysDto,
} from '../dto';
import { TenantContextData as ITenantContext } from '../interfaces/tenant-context.interface';

@ApiTags('Tenants')
@Controller('v1/tenants')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TenantController {
  constructor(
    private tenantService: TenantService,
    private cacheService: TenantCacheService,
  ) {}

  // Admin endpoints (bypass tenant isolation)
  @Post()
  @BypassTenant()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new tenant (Admin)' })
  @ApiResponse({
    status: 201,
    description: 'Tenant created successfully',
    type: TenantResponseDto,
  })
  @ApiBody({ type: CreateTenantDto })
  async createTenant(@Body() createTenantDto: CreateTenantDto): Promise<TenantResponseDto> {
    return this.tenantService.createTenant(createTenantDto);
  }

  @Get()
  @BypassTenant()
  @ApiOperation({ summary: 'Get all tenants (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'List of all tenants',
    type: [TenantResponseDto],
  })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async getAllTenants(
    @Query('includeInactive') includeInactive?: boolean,
  ): Promise<TenantResponseDto[]> {
    return this.tenantService.getAllTenants(includeInactive);
  }

  @Get('admin/:tenantId')
  @BypassTenant()
  @ApiOperation({ summary: 'Get tenant by ID (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Tenant details',
    type: TenantResponseDto,
  })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  async getTenantById(@Param('tenantId') tenantId: string): Promise<TenantResponseDto> {
    return this.tenantService.getTenantById(tenantId);
  }

  @Put('admin/:tenantId')
  @BypassTenant()
  @ApiOperation({ summary: 'Update tenant by ID (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Tenant updated successfully',
    type: TenantResponseDto,
  })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiBody({ type: UpdateTenantDto })
  async updateTenantById(
    @Param('tenantId') tenantId: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.tenantService.updateTenant(tenantId, updateTenantDto);
  }

  @Delete('admin/:tenantId')
  @BypassTenant()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete tenant by ID (Admin)' })
  @ApiResponse({
    status: 204,
    description: 'Tenant deleted successfully',
  })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  async deleteTenantById(@Param('tenantId') tenantId: string): Promise<void> {
    await this.tenantService.deleteTenant(tenantId);
  }

  @Post('admin/bulk-update')
  @BypassTenant()
  @ApiOperation({ summary: 'Bulk update tenants (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Bulk update results',
    type: [BulkTenantUpdateResultDto],
  })
  @ApiBody({ type: BulkTenantUpdateDto })
  async bulkUpdateTenants(
    @Body() bulkUpdateDto: BulkTenantUpdateDto,
  ): Promise<BulkTenantUpdateResultDto[]> {
    return this.tenantService.bulkUpdateTenants(bulkUpdateDto.updates);
  }

  @Get('admin/by-status/:isActive')
  @BypassTenant()
  @ApiOperation({ summary: 'Get tenants by status (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'List of tenants with specified status',
    type: [TenantResponseDto],
  })
  @ApiParam({ name: 'isActive', description: 'Active status', type: Boolean })
  async getTenantsByStatus(@Param('isActive') isActive: string): Promise<TenantResponseDto[]> {
    return this.tenantService.getTenantsByStatus(isActive === 'true');
  }

  // Tenant-scoped endpoints
  @Get('current')
  @RequireTenant()
  @ApiOperation({ summary: 'Get current tenant details' })
  @ApiResponse({
    status: 200,
    description: 'Current tenant details',
    type: TenantResponseDto,
  })
  async getCurrentTenant(): Promise<TenantResponseDto> {
    return this.tenantService.getCurrentTenant();
  }

  @Put('current')
  @RequireTenant()
  @ApiOperation({ summary: 'Update current tenant' })
  @ApiResponse({
    status: 200,
    description: 'Tenant updated successfully',
    type: TenantResponseDto,
  })
  @ApiBody({ type: UpdateTenantDto })
  async updateCurrentTenant(
    @Body() updateTenantDto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.tenantService.updateCurrentTenant(updateTenantDto);
  }

  @Get('users')
  @RequireTenant()
  @ApiOperation({ summary: 'Get users in current tenant' })
  @ApiResponse({
    status: 200,
    description: 'List of tenant users',
  })
  async getTenantUsers(@TenantContext() context: ITenantContext) {
    return this.tenantService.getTenantUsers();
  }

  @Get('stats')
  @RequireTenant()
  @ApiOperation({ summary: 'Get current tenant statistics' })
  @ApiResponse({
    status: 200,
    description: 'Tenant statistics',
    type: TenantStatsDto,
  })
  async getTenantStats(): Promise<TenantStatsDto> {
    return this.tenantService.getTenantStats();
  }

  // Domain-based lookup (public endpoint)
  @Get('by-domain/:domain')
  @BypassTenant()
  @ApiOperation({ summary: 'Get tenant by domain (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Tenant found by domain',
    type: TenantResponseDto,
  })
  @ApiParam({ name: 'domain', description: 'Tenant domain' })
  async getTenantByDomain(@Param('domain') domain: string): Promise<TenantResponseDto> {
    return this.tenantService.getTenantByDomain(domain);
  }

  // Cache management endpoints
  @Get('cache/stats')
  @RequireTenant()
  @ApiOperation({ summary: 'Get cache statistics for current tenant' })
  @ApiResponse({
    status: 200,
    description: 'Cache statistics',
    type: CacheStatsDto,
  })
  async getCacheStats(@TenantId() tenantId: string): Promise<CacheStatsDto> {
    return this.cacheService.getStats(tenantId);
  }

  @Get('cache/keys')
  @RequireTenant()
  @ApiOperation({ summary: 'Get cache keys for current tenant' })
  @ApiResponse({
    status: 200,
    description: 'Cache keys',
    type: CacheKeysDto,
  })
  async getCacheKeys(@TenantId() tenantId: string): Promise<CacheKeysDto> {
    const keys = await this.cacheService.getKeys(tenantId);
    return { keys, tenantId };
  }

  @Get('cache/:key')
  @RequireTenant()
  @ApiOperation({ summary: 'Get value from tenant cache' })
  @ApiResponse({
    status: 200,
    description: 'Cached value',
  })
  @ApiParam({ name: 'key', description: 'Cache key' })
  async getCacheValue(@Param('key') key: string) {
    const value = await this.cacheService.get(key);
    return { key, value, found: value !== null };
  }

  @Post('cache')
  @RequireTenant()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Set value in tenant cache' })
  @ApiResponse({
    status: 201,
    description: 'Value cached successfully',
  })
  @ApiBody({ type: CacheValueDto })
  async setCacheValue(@Body() cacheValueDto: CacheValueDto) {
    const { key, value, ttl, global } = cacheValueDto;
    await this.cacheService.set(key, value, { ttl, global });
    return { message: 'Value cached successfully', key };
  }

  @Delete('cache/:key')
  @RequireTenant()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete value from tenant cache' })
  @ApiResponse({
    status: 204,
    description: 'Cache entry deleted',
  })
  @ApiParam({ name: 'key', description: 'Cache key' })
  async deleteCacheValue(@Param('key') key: string) {
    const deleted = await this.cacheService.del(key);
    return { deleted };
  }

  @Delete('cache')
  @RequireTenant()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all cache entries for current tenant' })
  @ApiResponse({
    status: 200,
    description: 'Cache cleared successfully',
  })
  async clearTenantCache(@TenantId() tenantId: string) {
    const cleared = await this.cacheService.clearTenant(tenantId);
    return { message: `Cleared ${cleared} cache entries`, cleared };
  }

  // Admin cache endpoints
  @Get('admin/cache/stats')
  @BypassTenant()
  @ApiOperation({ summary: 'Get global cache statistics (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Global cache statistics',
    type: CacheStatsDto,
  })
  async getGlobalCacheStats(): Promise<CacheStatsDto> {
    return this.cacheService.getStats();
  }

  @Delete('admin/cache')
  @BypassTenant()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all cache entries (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'All cache cleared successfully',
  })
  async clearAllCache() {
    const cleared = await this.cacheService.clearAll();
    return { message: `Cleared all ${cleared} cache entries`, cleared };
  }

  @Post('admin/cache/cleanup')
  @BypassTenant()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cleanup expired cache entries (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Cache cleanup completed',
  })
  async cleanupCache() {
    const cleaned = await this.cacheService.cleanup();
    return { message: `Cleaned up ${cleaned} expired entries`, cleaned };
  }
}