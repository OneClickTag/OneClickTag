import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  SSEConnection,
  SSEEvent,
  SSEEventType,
  SSEConnectionOptions,
  SSEStats,
  EventFilter,
} from '../interfaces/sse.interface';

@Injectable()
export class SSEService implements OnModuleDestroy {
  private readonly logger = new Logger(SSEService.name);
  private connections = new Map<string, SSEConnection>();
  private tenantConnections = new Map<string, Set<string>>();
  private eventsSentToday = 0;
  private totalLatency = 0;
  private latencyCount = 0;
  private startTime = Date.now();
  private heartbeatInterval: NodeJS.Timeout;

  private readonly defaultOptions: SSEConnectionOptions = {
    heartbeatInterval: 30000, // 30 seconds
    connectionTimeout: 300000, // 5 minutes
    maxConnections: 1000,
    compression: true,
  };

  constructor(private configService: ConfigService) {
    this.startHeartbeat();
  }

  onModuleDestroy() {
    this.closeAllConnections();
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }

  /**
   * Create a new SSE connection
   */
  createConnection(
    tenantId: string,
    response: Response,
    userId?: string,
    options: Partial<SSEConnectionOptions> = {},
  ): string {
    const connectionId = uuidv4();
    const mergedOptions = { ...this.defaultOptions, ...options };

    // Check connection limits
    if (this.connections.size >= mergedOptions.maxConnections!) {
      this.logger.warn(`Maximum connections limit reached: ${mergedOptions.maxConnections}`);
      throw new Error('Maximum connections limit reached');
    }

    // Setup SSE headers
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    // Create connection object
    const connection: SSEConnection = {
      id: connectionId,
      tenantId,
      userId,
      response,
      isActive: true,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      eventFilters: options.eventFilters || [],
    };

    // Store connection
    this.connections.set(connectionId, connection);

    // Track by tenant
    if (!this.tenantConnections.has(tenantId)) {
      this.tenantConnections.set(tenantId, new Set());
    }
    this.tenantConnections.get(tenantId)!.add(connectionId);

    // Setup connection cleanup on client disconnect
    response.on('close', () => {
      this.removeConnection(connectionId);
    });

    response.on('error', (error) => {
      this.logger.error(`SSE connection error for ${connectionId}: ${error.message}`);
      this.removeConnection(connectionId);
    });

    // Send initial connection established event
    this.sendEventToConnection(connectionId, {
      event: SSEEventType.CONNECTION_ESTABLISHED,
      data: {
        connectionId,
        timestamp: new Date(),
        heartbeatInterval: mergedOptions.heartbeatInterval,
      },
      timestamp: new Date(),
      tenantId,
      userId,
    });

    this.logger.log(`SSE connection established: ${connectionId} for tenant: ${tenantId}`);
    return connectionId;
  }

  /**
   * Remove a connection
   */
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    // Mark as inactive
    connection.isActive = false;

    // Remove from tenant tracking
    const tenantConnections = this.tenantConnections.get(connection.tenantId);
    if (tenantConnections) {
      tenantConnections.delete(connectionId);
      if (tenantConnections.size === 0) {
        this.tenantConnections.delete(connection.tenantId);
      }
    }

    // Remove from main connections
    this.connections.delete(connectionId);

    // Close response if still open
    try {
      if (!connection.response.destroyed) {
        connection.response.end();
      }
    } catch (error) {
      // Response already closed
    }

    this.logger.log(`SSE connection removed: ${connectionId}`);
  }

  /**
   * Send event to specific connection
   */
  sendEventToConnection(connectionId: string, event: SSEEvent): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isActive) {
      return false;
    }

    // Check if event passes filters
    if (!this.eventPassesFilters(event, connection.eventFilters)) {
      return false;
    }

    try {
      const startTime = Date.now();
      
      const eventData = this.formatSSEEvent(event);
      connection.response.write(eventData);

      // Update latency tracking
      const latency = Date.now() - startTime;
      this.totalLatency += latency;
      this.latencyCount++;

      // Update last heartbeat if this is a heartbeat event
      if (event.event === SSEEventType.HEARTBEAT) {
        connection.lastHeartbeat = new Date();
      }

      this.eventsSentToday++;
      return true;
    } catch (error) {
      this.logger.error(`Failed to send event to connection ${connectionId}: ${error.message}`);
      this.removeConnection(connectionId);
      return false;
    }
  }

  /**
   * Broadcast event to all connections in a tenant
   */
  broadcastToTenant(tenantId: string, event: SSEEvent): number {
    const tenantConnections = this.tenantConnections.get(tenantId);
    if (!tenantConnections) {
      return 0;
    }

    let successCount = 0;
    for (const connectionId of tenantConnections) {
      if (this.sendEventToConnection(connectionId, event)) {
        successCount++;
      }
    }

    this.logger.debug(`Broadcasted event ${event.event} to ${successCount} connections in tenant ${tenantId}`);
    return successCount;
  }

  /**
   * Broadcast event to all connections
   */
  broadcastToAll(event: SSEEvent): number {
    let successCount = 0;
    for (const connectionId of this.connections.keys()) {
      if (this.sendEventToConnection(connectionId, event)) {
        successCount++;
      }
    }

    this.logger.debug(`Broadcasted event ${event.event} to ${successCount} total connections`);
    return successCount;
  }

  /**
   * Send event with filtering
   */
  sendEventWithFilter(event: SSEEvent, filter: EventFilter): number {
    let successCount = 0;

    for (const [connectionId, connection] of this.connections) {
      // Apply tenant filter
      if (event.tenantId && connection.tenantId !== event.tenantId) {
        continue;
      }

      // Apply user filter
      if (event.userId && connection.userId !== event.userId) {
        continue;
      }

      // Apply custom filters
      if (!this.eventMatchesFilter(event, filter)) {
        continue;
      }

      if (this.sendEventToConnection(connectionId, event)) {
        successCount++;
      }
    }

    this.logger.debug(`Sent filtered event ${event.event} to ${successCount} connections`);
    return successCount;
  }

  /**
   * Get connection statistics
   */
  getStats(): SSEStats {
    const averageLatency = this.latencyCount > 0 ? this.totalLatency / this.latencyCount : 0;
    const uptime = Date.now() - this.startTime;

    const connectionsByTenant: Record<string, number> = {};
    for (const [tenantId, connections] of this.tenantConnections) {
      connectionsByTenant[tenantId] = connections.size;
    }

    return {
      totalConnections: this.connections.size,
      activeConnections: Array.from(this.connections.values()).filter(c => c.isActive).length,
      connectionsByTenant,
      eventsSentToday: this.eventsSentToday,
      averageLatency,
      uptime,
    };
  }

  /**
   * Get connections for a tenant
   */
  getTenantConnections(tenantId: string): SSEConnection[] {
    const tenantConnectionIds = this.tenantConnections.get(tenantId);
    if (!tenantConnectionIds) {
      return [];
    }

    return Array.from(tenantConnectionIds)
      .map(id => this.connections.get(id))
      .filter(conn => conn && conn.isActive) as SSEConnection[];
  }

  /**
   * Update event filters for a connection
   */
  updateConnectionFilters(connectionId: string, filters: string[]): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    connection.eventFilters = filters;
    this.logger.debug(`Updated filters for connection ${connectionId}: ${filters.join(', ')}`);
    return true;
  }

  /**
   * Close all connections
   */
  closeAllConnections(): void {
    this.logger.log('Closing all SSE connections');
    
    for (const connectionId of this.connections.keys()) {
      this.removeConnection(connectionId);
    }

    this.connections.clear();
    this.tenantConnections.clear();
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
      this.cleanupStaleConnections();
    }, this.defaultOptions.heartbeatInterval!);
  }

  /**
   * Send heartbeat to all connections
   */
  private sendHeartbeat(): void {
    const heartbeatEvent: SSEEvent = {
      event: SSEEventType.HEARTBEAT,
      data: { timestamp: new Date() },
      timestamp: new Date(),
      tenantId: '', // Will be overridden per connection
    };

    for (const [connectionId, connection] of this.connections) {
      if (connection.isActive) {
        this.sendEventToConnection(connectionId, {
          ...heartbeatEvent,
          tenantId: connection.tenantId,
          userId: connection.userId,
        });
      }
    }
  }

  /**
   * Clean up stale connections
   */
  private cleanupStaleConnections(): void {
    const timeout = this.defaultOptions.connectionTimeout!;
    const now = Date.now();

    for (const [connectionId, connection] of this.connections) {
      const timeSinceHeartbeat = now - connection.lastHeartbeat.getTime();
      
      if (timeSinceHeartbeat > timeout) {
        this.logger.warn(`Removing stale connection: ${connectionId} (${timeSinceHeartbeat}ms since last heartbeat)`);
        this.removeConnection(connectionId);
      }
    }
  }

  /**
   * Format SSE event for transmission
   */
  private formatSSEEvent(event: SSEEvent): string {
    let formatted = '';

    if (event.id) {
      formatted += `id: ${event.id}\n`;
    }

    formatted += `event: ${event.event}\n`;
    formatted += `data: ${JSON.stringify({
      ...event.data,
      timestamp: event.timestamp,
      tenantId: event.tenantId,
      userId: event.userId,
      metadata: event.metadata,
    })}\n`;

    if (event.retry) {
      formatted += `retry: ${event.retry}\n`;
    }

    formatted += '\n';
    return formatted;
  }

  /**
   * Check if event passes connection filters
   */
  private eventPassesFilters(event: SSEEvent, filters: string[]): boolean {
    if (filters.length === 0) {
      return true; // No filters means all events pass
    }

    return filters.includes(event.event) || filters.includes('*');
  }

  /**
   * Check if event matches custom filter
   */
  private eventMatchesFilter(event: SSEEvent, filter: EventFilter): boolean {
    // Event type filter
    if (filter.eventTypes && !filter.eventTypes.includes(event.event as SSEEventType)) {
      return false;
    }

    // Resource-specific filters
    if (filter.customerId && event.data.customerId !== filter.customerId) {
      return false;
    }

    if (filter.adsAccountId && event.data.adsAccountId !== filter.adsAccountId) {
      return false;
    }

    if (filter.campaignId && event.data.campaignId !== filter.campaignId) {
      return false;
    }

    // Job type filter
    if (filter.jobTypes && !filter.jobTypes.includes(event.data.jobType)) {
      return false;
    }

    // Error severity filter
    if (filter.errorSeverities && !filter.errorSeverities.includes(event.data.severity)) {
      return false;
    }

    return true;
  }
}