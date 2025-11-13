/**
 * Client-side SSE reconnection utility
 * This file provides a JavaScript/TypeScript utility for frontend applications
 * to handle SSE connections with automatic reconnection logic
 */

export interface SSEClientOptions {
  url: string;
  reconnect?: boolean;
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  timeout?: number;
  headers?: Record<string, string>;
  eventFilters?: string[];
  onOpen?: () => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: Event) => void;
  onReconnecting?: (attempt: number, delay: number) => void;
  onReconnected?: () => void;
  onMaxRetriesReached?: () => void;
}

export interface SSEReconnectionConfig {
  enabled: boolean;
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isManualClose = false;
  private lastEventId: string | null = null;

  private readonly defaultOptions: Required<SSEClientOptions> = {
    url: '',
    reconnect: true,
    maxRetries: 10,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 1.5,
    timeout: 30000,
    headers: {},
    eventFilters: [],
    onOpen: () => {},
    onMessage: () => {},
    onError: () => {},
    onReconnecting: () => {},
    onReconnected: () => {},
    onMaxRetriesReached: () => {},
  };

  private options: Required<SSEClientOptions>;

  constructor(options: SSEClientOptions) {
    this.options = { ...this.defaultOptions, ...options };
    this.connect();
  }

  /**
   * Establish SSE connection
   */
  private connect(): void {
    if (this.eventSource) {
      this.eventSource.close();
    }

    try {
      // Build URL with filters if provided
      const url = new URL(this.options.url);
      if (this.options.eventFilters.length > 0) {
        url.searchParams.set('filters', this.options.eventFilters.join(','));
      }

      // Add last event ID for resume
      if (this.lastEventId) {
        url.searchParams.set('lastEventId', this.lastEventId);
      }

      this.eventSource = new EventSource(url.toString());

      this.eventSource.onopen = (event) => {
        console.log('SSE connection established');
        this.reconnectAttempts = 0;
        this.isManualClose = false;
        this.options.onOpen();

        // Notify reconnection if this wasn't the first connection
        if (this.reconnectAttempts > 0) {
          this.options.onReconnected();
        }
      };

      this.eventSource.onmessage = (event) => {
        // Store last event ID for potential reconnection
        if (event.lastEventId) {
          this.lastEventId = event.lastEventId;
        }

        this.options.onMessage(event);
      };

      this.eventSource.onerror = (event) => {
        console.error('SSE connection error:', event);
        this.options.onError(event);

        // Only attempt reconnection if not manually closed and reconnection is enabled
        if (!this.isManualClose && this.options.reconnect) {
          this.scheduleReconnect();
        }
      };

      // Add specific event listeners
      this.addEventListeners();

    } catch (error) {
      console.error('Failed to establish SSE connection:', error);
      if (this.options.reconnect && !this.isManualClose) {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Add specific event listeners
   */
  private addEventListeners(): void {
    if (!this.eventSource) return;

    // Customer events
    this.eventSource.addEventListener('customer.created', this.options.onMessage);
    this.eventSource.addEventListener('customer.updated', this.options.onMessage);
    this.eventSource.addEventListener('customer.deleted', this.options.onMessage);
    this.eventSource.addEventListener('customer.bulk_import.progress', this.options.onMessage);
    this.eventSource.addEventListener('customer.bulk_import.completed', this.options.onMessage);

    // Campaign events
    this.eventSource.addEventListener('campaign.created', this.options.onMessage);
    this.eventSource.addEventListener('campaign.updated', this.options.onMessage);
    this.eventSource.addEventListener('campaign.status_changed', this.options.onMessage);
    this.eventSource.addEventListener('campaign.metrics_updated', this.options.onMessage);
    this.eventSource.addEventListener('campaign.deleted', this.options.onMessage);

    // GTM events
    this.eventSource.addEventListener('gtm.sync.started', this.options.onMessage);
    this.eventSource.addEventListener('gtm.sync.progress', this.options.onMessage);
    this.eventSource.addEventListener('gtm.sync.completed', this.options.onMessage);
    this.eventSource.addEventListener('gtm.sync.failed', this.options.onMessage);
    this.eventSource.addEventListener('gtm.tag.created', this.options.onMessage);
    this.eventSource.addEventListener('gtm.tag.updated', this.options.onMessage);
    this.eventSource.addEventListener('gtm.tag.deleted', this.options.onMessage);

    // Job events
    this.eventSource.addEventListener('job.started', this.options.onMessage);
    this.eventSource.addEventListener('job.progress', this.options.onMessage);
    this.eventSource.addEventListener('job.completed', this.options.onMessage);
    this.eventSource.addEventListener('job.failed', this.options.onMessage);

    // Error events
    this.eventSource.addEventListener('error.api_limit_exceeded', this.options.onMessage);
    this.eventSource.addEventListener('error.authentication_failed', this.options.onMessage);
    this.eventSource.addEventListener('error.permission_denied', this.options.onMessage);
    this.eventSource.addEventListener('error.system_error', this.options.onMessage);
    this.eventSource.addEventListener('error.validation_failed', this.options.onMessage);

    // System events
    this.eventSource.addEventListener('system.maintenance', this.options.onMessage);
    this.eventSource.addEventListener('system.notification', this.options.onMessage);
    this.eventSource.addEventListener('heartbeat', this.handleHeartbeat.bind(this));
  }

  /**
   * Handle heartbeat events
   */
  private handleHeartbeat(event: MessageEvent): void {
    console.debug('Received heartbeat:', event.data);
    // Heartbeat received, connection is alive
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxRetries) {
      console.error(`Max reconnection attempts (${this.options.maxRetries}) reached`);
      this.options.onMaxRetriesReached();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.options.baseDelay * Math.pow(this.options.backoffMultiplier, this.reconnectAttempts - 1),
      this.options.maxDelay,
    );

    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    this.options.onReconnecting(this.reconnectAttempts, delay);

    this.reconnectTimeout = setTimeout(() => {
      if (!this.isManualClose) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Update event filters
   */
  updateFilters(filters: string[]): void {
    this.options.eventFilters = filters;
    
    // Reconnect with new filters
    if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
      this.close();
      setTimeout(() => this.connect(), 100);
    }
  }

  /**
   * Add event filter
   */
  addFilter(filter: string): void {
    if (!this.options.eventFilters.includes(filter)) {
      this.options.eventFilters.push(filter);
      this.updateFilters(this.options.eventFilters);
    }
  }

  /**
   * Remove event filter
   */
  removeFilter(filter: string): void {
    const index = this.options.eventFilters.indexOf(filter);
    if (index > -1) {
      this.options.eventFilters.splice(index, 1);
      this.updateFilters(this.options.eventFilters);
    }
  }

  /**
   * Get current connection state
   */
  getState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED;
  }

  /**
   * Check if connection is open
   */
  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  /**
   * Close connection
   */
  close(): void {
    this.isManualClose = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    console.log('SSE connection closed manually');
  }

  /**
   * Reconnect manually
   */
  reconnect(): void {
    this.isManualClose = false;
    this.reconnectAttempts = 0;
    this.connect();
  }
}

/**
 * Create SSE client with default configuration
 */
export function createSSEClient(
  url: string,
  options: Partial<SSEClientOptions> = {},
): SSEClient {
  return new SSEClient({ url, ...options });
}

/**
 * Event type constants for filtering
 */
export const SSE_EVENT_TYPES = {
  // Customer events
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_DELETED: 'customer.deleted',
  CUSTOMER_BULK_IMPORT_PROGRESS: 'customer.bulk_import.progress',
  CUSTOMER_BULK_IMPORT_COMPLETED: 'customer.bulk_import.completed',
  
  // Campaign events
  CAMPAIGN_CREATED: 'campaign.created',
  CAMPAIGN_UPDATED: 'campaign.updated',
  CAMPAIGN_STATUS_CHANGED: 'campaign.status_changed',
  CAMPAIGN_METRICS_UPDATED: 'campaign.metrics_updated',
  CAMPAIGN_DELETED: 'campaign.deleted',
  
  // GTM sync events
  GTM_SYNC_STARTED: 'gtm.sync.started',
  GTM_SYNC_PROGRESS: 'gtm.sync.progress',
  GTM_SYNC_COMPLETED: 'gtm.sync.completed',
  GTM_SYNC_FAILED: 'gtm.sync.failed',
  GTM_TAG_CREATED: 'gtm.tag.created',
  GTM_TAG_UPDATED: 'gtm.tag.updated',
  GTM_TAG_DELETED: 'gtm.tag.deleted',
  
  // Job events
  JOB_STARTED: 'job.started',
  JOB_PROGRESS: 'job.progress',
  JOB_COMPLETED: 'job.completed',
  JOB_FAILED: 'job.failed',
  
  // Error events
  ERROR_API_LIMIT_EXCEEDED: 'error.api_limit_exceeded',
  ERROR_AUTHENTICATION_FAILED: 'error.authentication_failed',
  ERROR_PERMISSION_DENIED: 'error.permission_denied',
  ERROR_SYSTEM_ERROR: 'error.system_error',
  ERROR_VALIDATION_FAILED: 'error.validation_failed',
  
  // System events
  SYSTEM_MAINTENANCE: 'system.maintenance',
  SYSTEM_NOTIFICATION: 'system.notification',
  HEARTBEAT: 'heartbeat',
} as const;

/**
 * Example usage:
 * 
 * const sseClient = createSSEClient('http://localhost:3000/api/v1/events/stream', {
 *   reconnect: true,
 *   maxRetries: 5,
 *   eventFilters: [SSE_EVENT_TYPES.CUSTOMER_CREATED, SSE_EVENT_TYPES.CAMPAIGN_STATUS_CHANGED],
 *   headers: {
 *     'Authorization': 'Bearer your-token-here'
 *   },
 *   onMessage: (event) => {
 *     console.log('Received event:', event.type, JSON.parse(event.data));
 *   },
 *   onReconnecting: (attempt, delay) => {
 *     console.log(`Reconnecting attempt ${attempt} in ${delay}ms`);
 *   },
 *   onError: (error) => {
 *     console.error('SSE error:', error);
 *   }
 * });
 * 
 * // Update filters dynamically
 * sseClient.updateFilters([SSE_EVENT_TYPES.GTM_SYNC_PROGRESS]);
 * 
 * // Close connection
 * sseClient.close();
 */