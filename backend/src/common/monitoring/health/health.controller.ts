import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HttpHealthIndicator,
  HealthCheck,
  HealthCheckResult,
} from '@nestjs/terminus';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private healthService: HealthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get application health status' })
  @ApiResponse({ status: 200, description: 'Health check passed' })
  @ApiResponse({ status: 503, description: 'Health check failed' })
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Database connectivity
      () => this.healthService.checkDatabase('database'),
      
      // Redis connectivity (if using Redis for jobs)
      () => this.healthService.checkRedis('redis'),
      
      // External API dependencies
      () => this.http.pingCheck('google-api', 'https://www.googleapis.com'),
    ]);
  }

  @Get('ready')
  @ApiOperation({ summary: 'Check if application is ready to serve traffic' })
  @ApiResponse({ status: 200, description: 'Application is ready' })
  @ApiResponse({ status: 503, description: 'Application is not ready' })
  @HealthCheck()
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.healthService.checkDatabase('database'),
      () => this.healthService.checkApplicationState('app-state'),
    ]);
  }

  @Get('live')
  @ApiOperation({ summary: 'Check if application is alive' })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  liveness(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get basic application metrics' })
  @ApiResponse({ status: 200, description: 'Application metrics' })
  async metrics() {
    return this.healthService.getMetrics();
  }
}