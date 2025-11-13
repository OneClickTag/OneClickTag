import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { JobMonitoringService } from '../services/job-monitoring.service';
import { Auth0Middleware } from '../../modules/auth/middleware/auth0.middleware';
import { TenantContext } from '../../modules/tenant/decorators/tenant-context.decorator';
import {
  JobQueues,
  JobStatus,
  QueueStats,
  JobMonitoringData,
} from '../interfaces/job.interface';

@ApiTags('Job Monitoring')
@ApiBearerAuth()
@ApiSecurity('Auth0')
@UseGuards(Auth0Middleware)
@Controller('api/v1/jobs')
export class JobMonitoringController {
  private readonly logger = new Logger(JobMonitoringController.name);

  constructor(private readonly jobMonitoringService: JobMonitoringService) {}

  @Get('dashboard')
  @ApiOperation({ 
    summary: 'Get job dashboard overview',
    description: 'Get overview of all queues with statistics and health status'
  })
  @ApiResponse({
    status: 200,
    description: 'Job dashboard data',
    type: Object,
  })
  async getDashboard(): Promise<{
    stats: QueueStats[];
    health: {
      healthy: boolean;
      issues: string[];
      stats: QueueStats[];
    };
  }> {
    this.logger.log('Getting job dashboard overview');

    const [stats, health] = await Promise.all([
      this.jobMonitoringService.getAllQueueStats(),
      this.jobMonitoringService.getQueueHealth(),
    ]);

    return {
      stats,
      health,
    };
  }

  @Get('queues')
  @ApiOperation({ 
    summary: 'Get all queue statistics',
    description: 'Get statistics for all job queues'
  })
  @ApiResponse({
    status: 200,
    description: 'Queue statistics',
    type: [Object],
  })
  async getAllQueueStats(): Promise<QueueStats[]> {
    this.logger.log('Getting all queue statistics');
    return this.jobMonitoringService.getAllQueueStats();
  }

  @Get('queues/:queueName')
  @ApiOperation({ 
    summary: 'Get queue statistics',
    description: 'Get statistics for a specific queue'
  })
  @ApiParam({ 
    name: 'queueName', 
    enum: JobQueues,
    description: 'Queue name'
  })
  @ApiResponse({
    status: 200,
    description: 'Queue statistics',
    type: Object,
  })
  async getQueueStats(@Param('queueName') queueName: JobQueues): Promise<QueueStats> {
    this.logger.log(`Getting statistics for queue: ${queueName}`);
    return this.jobMonitoringService.getQueueStats(queueName);
  }

  @Get('queues/:queueName/jobs')
  @ApiOperation({ 
    summary: 'Get queue jobs',
    description: 'Get jobs for a specific queue with filtering and pagination'
  })
  @ApiParam({ 
    name: 'queueName', 
    enum: JobQueues,
    description: 'Queue name'
  })
  @ApiQuery({ 
    name: 'status', 
    enum: JobStatus,
    required: false,
    description: 'Filter by job status'
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number,
    description: 'Maximum number of jobs to return (default: 50)'
  })
  @ApiQuery({ 
    name: 'offset', 
    required: false, 
    type: Number,
    description: 'Offset for pagination (default: 0)'
  })
  @ApiResponse({
    status: 200,
    description: 'List of jobs',
    type: [Object],
  })
  async getQueueJobs(
    @Param('queueName') queueName: JobQueues,
    @Query('status') status?: JobStatus,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ): Promise<JobMonitoringData[]> {
    this.logger.log(`Getting jobs for queue: ${queueName}, status: ${status || 'all'}`);
    return this.jobMonitoringService.getQueueJobs(queueName, status, Number(limit), Number(offset));
  }

  @Get('queues/:queueName/jobs/:jobId')
  @ApiOperation({ 
    summary: 'Get job details',
    description: 'Get detailed information about a specific job'
  })
  @ApiParam({ 
    name: 'queueName', 
    enum: JobQueues,
    description: 'Queue name'
  })
  @ApiParam({ 
    name: 'jobId', 
    description: 'Job ID'
  })
  @ApiResponse({
    status: 200,
    description: 'Job details',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  async getJob(
    @Param('queueName') queueName: JobQueues,
    @Param('jobId') jobId: string,
  ): Promise<JobMonitoringData> {
    this.logger.log(`Getting job details: ${jobId} from queue: ${queueName}`);
    
    const job = await this.jobMonitoringService.getJob(queueName, jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    return job;
  }

  @Delete('queues/:queueName/jobs/:jobId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Cancel job',
    description: 'Cancel a specific job'
  })
  @ApiParam({ 
    name: 'queueName', 
    enum: JobQueues,
    description: 'Queue name'
  })
  @ApiParam({ 
    name: 'jobId', 
    description: 'Job ID'
  })
  @ApiResponse({
    status: 204,
    description: 'Job cancelled successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  async cancelJob(
    @Param('queueName') queueName: JobQueues,
    @Param('jobId') jobId: string,
  ): Promise<void> {
    this.logger.log(`Cancelling job: ${jobId} from queue: ${queueName}`);
    
    const success = await this.jobMonitoringService.cancelJob(queueName, jobId);
    if (!success) {
      throw new Error('Job not found or could not be cancelled');
    }
  }

  @Post('queues/:queueName/jobs/:jobId/retry')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Retry job',
    description: 'Retry a failed job'
  })
  @ApiParam({ 
    name: 'queueName', 
    enum: JobQueues,
    description: 'Queue name'
  })
  @ApiParam({ 
    name: 'jobId', 
    description: 'Job ID'
  })
  @ApiResponse({
    status: 204,
    description: 'Job retried successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  async retryJob(
    @Param('queueName') queueName: JobQueues,
    @Param('jobId') jobId: string,
  ): Promise<void> {
    this.logger.log(`Retrying job: ${jobId} from queue: ${queueName}`);
    
    const success = await this.jobMonitoringService.retryJob(queueName, jobId);
    if (!success) {
      throw new Error('Job not found or could not be retried');
    }
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Get queue health status',
    description: 'Get health status of all job queues'
  })
  @ApiResponse({
    status: 200,
    description: 'Queue health status',
    type: Object,
  })
  async getQueueHealth(): Promise<{
    healthy: boolean;
    issues: string[];
    stats: QueueStats[];
  }> {
    this.logger.log('Getting queue health status');
    return this.jobMonitoringService.getQueueHealth();
  }

  @Post('cleanup')
  @ApiOperation({ 
    summary: 'Clean old jobs',
    description: 'Clean old completed jobs from all queues'
  })
  @ApiQuery({ 
    name: 'olderThanHours', 
    required: false, 
    type: Number,
    description: 'Remove jobs older than specified hours (default: 24)'
  })
  @ApiResponse({
    status: 200,
    description: 'Cleanup results',
    type: Object,
  })
  async cleanOldJobs(
    @Query('olderThanHours') olderThanHours = 24,
  ): Promise<{ cleaned: number; queues: string[] }> {
    this.logger.log(`Cleaning jobs older than ${olderThanHours} hours`);
    return this.jobMonitoringService.cleanOldJobs(Number(olderThanHours));
  }

  @Get('tenant/:tenantId')
  @ApiOperation({ 
    summary: 'Get tenant jobs',
    description: 'Get jobs for a specific tenant across all queues'
  })
  @ApiParam({ 
    name: 'tenantId', 
    description: 'Tenant ID'
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number,
    description: 'Maximum number of jobs to return (default: 50)'
  })
  @ApiResponse({
    status: 200,
    description: 'List of tenant jobs',
    type: [Object],
  })
  async getTenantJobs(
    @Param('tenantId') tenantId: string,
    @Query('limit') limit = 50,
  ): Promise<JobMonitoringData[]> {
    this.logger.log(`Getting jobs for tenant: ${tenantId}`);
    return this.jobMonitoringService.getTenantJobs(tenantId, Number(limit));
  }

  @Get('my-jobs')
  @ApiOperation({ 
    summary: 'Get current tenant jobs',
    description: 'Get jobs for the current tenant (from context)'
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number,
    description: 'Maximum number of jobs to return (default: 50)'
  })
  @ApiResponse({
    status: 200,
    description: 'List of current tenant jobs',
    type: [Object],
  })
  async getMyJobs(
    @TenantContext() tenantId: string,
    @Query('limit') limit = 50,
  ): Promise<JobMonitoringData[]> {
    this.logger.log(`Getting jobs for current tenant: ${tenantId}`);
    return this.jobMonitoringService.getTenantJobs(tenantId, Number(limit));
  }
}