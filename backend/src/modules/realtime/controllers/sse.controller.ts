import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Res,
  Req,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import { SSEService } from '../services/sse.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EarlyAccessGuard } from '../../auth/guards/early-access.guard';
import { TenantContext } from '../../tenant/decorators/tenant-context.decorator';
import {
  SSEStats,
  EventFilter,
  SSEConnectionOptions,
} from '../interfaces/sse.interface';

@ApiTags('Real-time Events (SSE)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EarlyAccessGuard)
@Controller('v1/events')
export class SSEController {
  private readonly logger = new Logger(SSEController.name);

  constructor(private readonly sseService: SSEService) {}

  @Get('stream')
  @ApiOperation({ 
    summary: 'Establish SSE connection',
    description: 'Establish a Server-Sent Events connection for real-time updates. This endpoint keeps the connection open and streams events.'
  })
  @ApiQuery({ 
    name: 'filters', 
    required: false, 
    type: String,
    description: 'Comma-separated list of event types to filter (e.g., "customer.created,campaign.updated")'
  })
  @ApiQuery({ 
    name: 'heartbeat', 
    required: false, 
    type: Number,
    description: 'Heartbeat interval in milliseconds (default: 30000)'
  })
  @ApiResponse({
    status: 200,
    description: 'SSE stream established',
    headers: {
      'Content-Type': { description: 'text/event-stream' },
      'Cache-Control': { description: 'no-cache' },
      'Connection': { description: 'keep-alive' },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async establishConnection(
    @TenantContext() tenantId: string,
    @Req() request: Request,
    @Res() response: Response,
    @Query('filters') filters?: string,
    @Query('heartbeat') heartbeatInterval?: number,
  ): Promise<void> {
    const userId = (request as any).user?.id; // User ID from JWT payload

    this.logger.log(`Establishing SSE connection for tenant: ${tenantId}, user: ${userId}`);

    const options: Partial<SSEConnectionOptions> = {};
    
    if (filters) {
      options.eventFilters = filters.split(',').map(f => f.trim());
    }
    
    if (heartbeatInterval) {
      options.heartbeatInterval = Math.max(5000, Math.min(300000, heartbeatInterval)); // Between 5s and 5min
    }

    try {
      const connectionId = this.sseService.createConnection(
        tenantId,
        response,
        userId,
        options,
      );

      this.logger.log(`SSE connection established: ${connectionId}`);
    } catch (error) {
      this.logger.error(`Failed to establish SSE connection: ${error.message}`);
      response.status(500).json({ error: 'Failed to establish connection' });
    }
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get SSE statistics',
    description: 'Get real-time statistics about SSE connections and events'
  })
  @ApiResponse({
    status: 200,
    description: 'SSE statistics',
    type: Object,
  })
  async getStats(): Promise<SSEStats> {
    this.logger.log('Getting SSE statistics');
    return this.sseService.getStats();
  }

  @Get('connections')
  @ApiOperation({ 
    summary: 'Get tenant connections',
    description: 'Get information about current SSE connections for the tenant'
  })
  @ApiResponse({
    status: 200,
    description: 'List of tenant connections',
    type: Array,
  })
  async getTenantConnections(
    @TenantContext() tenantId: string,
  ): Promise<any[]> {
    this.logger.log(`Getting connections for tenant: ${tenantId}`);
    
    const connections = this.sseService.getTenantConnections(tenantId);
    
    // Return safe connection info (without response object)
    return connections.map(conn => ({
      id: conn.id,
      userId: conn.userId,
      isActive: conn.isActive,
      connectedAt: conn.connectedAt,
      lastHeartbeat: conn.lastHeartbeat,
      eventFilters: conn.eventFilters,
      metadata: conn.metadata,
    }));
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Send test event',
    description: 'Send a test event to all connections in the tenant (for development/testing)'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        eventType: { type: 'string', example: 'system.notification' },
        data: { type: 'object', example: { message: 'Test notification' } },
      },
      required: ['eventType', 'data'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Test event sent',
    schema: {
      type: 'object',
      properties: {
        sent: { type: 'number' },
        eventId: { type: 'string' },
      },
    },
  })
  async sendTestEvent(
    @TenantContext() tenantId: string,
    @Body() body: { eventType: string; data: any },
  ): Promise<{ sent: number; eventId: string }> {
    this.logger.log(`Sending test event to tenant: ${tenantId}`);

    const eventId = `test-${Date.now()}`;
    const sent = this.sseService.broadcastToTenant(tenantId, {
      id: eventId,
      event: body.eventType,
      data: body.data,
      timestamp: new Date(),
      tenantId,
    });

    return { sent, eventId };
  }

  @Post('broadcast')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Broadcast event to tenant',
    description: 'Broadcast a custom event to all connections in the tenant'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        eventType: { type: 'string' },
        data: { type: 'object' },
        userId: { type: 'string', description: 'Optional: send to specific user only' },
        filter: {
          type: 'object',
          properties: {
            eventTypes: { type: 'array', items: { type: 'string' } },
            customerId: { type: 'string' },
            adsAccountId: { type: 'string' },
            campaignId: { type: 'string' },
          },
        },
      },
      required: ['eventType', 'data'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Event broadcasted',
    schema: {
      type: 'object',
      properties: {
        sent: { type: 'number' },
        eventId: { type: 'string' },
      },
    },
  })
  async broadcastEvent(
    @TenantContext() tenantId: string,
    @Body() body: { 
      eventType: string; 
      data: any; 
      userId?: string;
      filter?: EventFilter;
    },
  ): Promise<{ sent: number; eventId: string }> {
    this.logger.log(`Broadcasting event ${body.eventType} to tenant: ${tenantId}`);

    const eventId = `broadcast-${Date.now()}`;
    const event = {
      id: eventId,
      event: body.eventType,
      data: body.data,
      timestamp: new Date(),
      tenantId,
      userId: body.userId,
    };

    let sent: number;

    if (body.filter) {
      sent = this.sseService.sendEventWithFilter(event, body.filter);
    } else if (body.userId) {
      // Send to specific user
      sent = this.sseService.broadcastToTenant(tenantId, event);
    } else {
      // Send to all tenant connections
      sent = this.sseService.broadcastToTenant(tenantId, event);
    }

    return { sent, eventId };
  }

  @Post('connections/:connectionId/filters')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Update connection filters',
    description: 'Update event filters for a specific connection'
  })
  @ApiParam({ name: 'connectionId', description: 'Connection ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        filters: {
          type: 'array',
          items: { type: 'string' },
          example: ['customer.created', 'campaign.updated', 'gtm.sync.*'],
        },
      },
      required: ['filters'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Filters updated',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  })
  async updateConnectionFilters(
    @Param('connectionId') connectionId: string,
    @Body() body: { filters: string[] },
  ): Promise<{ success: boolean }> {
    this.logger.log(`Updating filters for connection: ${connectionId}`);

    const success = this.sseService.updateConnectionFilters(connectionId, body.filters);
    return { success };
  }

  @Delete('connections/:connectionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Close connection',
    description: 'Manually close a specific SSE connection'
  })
  @ApiParam({ name: 'connectionId', description: 'Connection ID' })
  @ApiResponse({
    status: 204,
    description: 'Connection closed',
  })
  @ApiResponse({
    status: 404,
    description: 'Connection not found',
  })
  async closeConnection(
    @Param('connectionId') connectionId: string,
  ): Promise<void> {
    this.logger.log(`Closing connection: ${connectionId}`);
    this.sseService.removeConnection(connectionId);
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'SSE health check',
    description: 'Check the health of the SSE service'
  })
  @ApiResponse({
    status: 200,
    description: 'SSE service health',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string' },
        connections: { type: 'number' },
        uptime: { type: 'number' },
      },
    },
  })
  async healthCheck(): Promise<any> {
    const stats = this.sseService.getStats();
    
    return {
      status: 'healthy',
      timestamp: new Date(),
      connections: stats.activeConnections,
      uptime: stats.uptime,
      averageLatency: stats.averageLatency,
    };
  }
}