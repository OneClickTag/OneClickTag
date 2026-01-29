import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Full health check' })
  @ApiResponse({ status: 200, description: 'Health check passed' })
  @ApiResponse({ status: 503, description: 'Health check failed' })
  async check(@Res() res: Response) {
    const [database, googleApi] = await Promise.allSettled([
      this.healthService.checkDatabase(),
      this.healthService.checkGoogleApi(),
    ]);

    const isHealthy =
      database.status === 'fulfilled' &&
      database.value.status === 'up' &&
      googleApi.status === 'fulfilled' &&
      googleApi.value.status === 'up';

    const response = {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      checks: {
        database:
          database.status === 'fulfilled'
            ? database.value
            : { status: 'down', error: (database as PromiseRejectedResult).reason?.message },
        googleApi:
          googleApi.status === 'fulfilled'
            ? googleApi.value
            : { status: 'down', error: (googleApi as PromiseRejectedResult).reason?.message },
      },
    };

    return res.status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json(response);
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiResponse({ status: 200, description: 'Application is ready' })
  @ApiResponse({ status: 503, description: 'Application is not ready' })
  async readiness(@Res() res: Response) {
    const database = await this.healthService.checkDatabase();

    const response = {
      status: database.status === 'up' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      checks: { database },
    };

    return res
      .status(database.status === 'up' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json(response);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Application metrics' })
  @ApiResponse({ status: 200, description: 'Application metrics' })
  getMetrics() {
    return this.healthService.getMetrics();
  }
}
