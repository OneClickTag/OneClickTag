import { Injectable, Logger } from '@nestjs/common';
import { SSEService } from './sse.service';
import {
  SSEEventType,
  ErrorNotificationEventData,
  EventFilter,
} from '../interfaces/sse.interface';

@Injectable()
export class ErrorEventsService {
  private readonly logger = new Logger(ErrorEventsService.name);

  constructor(private readonly sseService: SSEService) {}

  /**
   * Emit API limit exceeded error
   */
  async emitApiLimitExceeded(
    tenantId: string,
    apiType: string,
    limitType: string,
    details: {
      currentUsage?: number;
      limit?: number;
      resetTime?: Date;
      endpoint?: string;
    },
    affectedResource?: {
      type: string;
      id: string;
      name?: string;
    },
    userId?: string,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting API limit exceeded error for ${apiType} in tenant: ${tenantId}`);

    const eventData: ErrorNotificationEventData = {
      errorId: `api-limit-${Date.now()}`,
      errorType: 'API_LIMIT_EXCEEDED',
      message: `${apiType} API limit exceeded for ${limitType}`,
      details: {
        apiType,
        limitType,
        ...details,
      },
      affectedResource,
      severity: 'high',
      actionRequired: true,
      suggestedActions: [
        'Wait for limit reset',
        'Upgrade API plan if available',
        'Optimize API usage patterns',
        'Implement request batching',
      ],
      retryable: true,
    };

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.ERROR_API_LIMIT_EXCEEDED,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      userId,
      metadata: {
        resourceType: 'error',
        action: 'api_limit_exceeded',
        apiType,
        severity: 'high',
      },
    });

    this.logger.debug(`API limit exceeded error sent to ${sent} connections`);
  }

  /**
   * Emit authentication failed error
   */
  async emitAuthenticationFailed(
    tenantId: string,
    authType: string,
    provider: string,
    details: {
      reason?: string;
      endpoint?: string;
      tokenExpired?: boolean;
      refreshFailed?: boolean;
    },
    affectedResource?: {
      type: string;
      id: string;
      name?: string;
    },
    userId?: string,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting authentication failed error for ${provider} in tenant: ${tenantId}`);

    const eventData: ErrorNotificationEventData = {
      errorId: `auth-failed-${Date.now()}`,
      errorType: 'AUTHENTICATION_FAILED',
      message: `Authentication failed for ${provider} (${authType})`,
      details: {
        authType,
        provider,
        ...details,
      },
      affectedResource,
      severity: 'critical',
      actionRequired: true,
      suggestedActions: [
        'Re-authenticate with the provider',
        'Check OAuth token validity',
        'Verify account permissions',
        'Contact support if issue persists',
      ],
      retryable: true,
    };

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.ERROR_AUTHENTICATION_FAILED,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      userId,
      metadata: {
        resourceType: 'error',
        action: 'authentication_failed',
        provider,
        severity: 'critical',
      },
    });

    this.logger.debug(`Authentication failed error sent to ${sent} connections`);
  }

  /**
   * Emit permission denied error
   */
  async emitPermissionDenied(
    tenantId: string,
    operation: string,
    resourceType: string,
    details: {
      requiredPermission?: string;
      userRole?: string;
      resourceId?: string;
    },
    affectedResource?: {
      type: string;
      id: string;
      name?: string;
    },
    userId?: string,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting permission denied error for ${operation} on ${resourceType} in tenant: ${tenantId}`);

    const eventData: ErrorNotificationEventData = {
      errorId: `permission-denied-${Date.now()}`,
      errorType: 'PERMISSION_DENIED',
      message: `Permission denied for ${operation} on ${resourceType}`,
      details: {
        operation,
        resourceType,
        ...details,
      },
      affectedResource,
      severity: 'medium',
      actionRequired: true,
      suggestedActions: [
        'Check user permissions',
        'Contact administrator for access',
        'Verify resource ownership',
        'Review role assignments',
      ],
      retryable: false,
    };

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.ERROR_PERMISSION_DENIED,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      userId,
      metadata: {
        resourceType: 'error',
        action: 'permission_denied',
        operation,
        targetResourceType: resourceType,
        severity: 'medium',
      },
    });

    this.logger.debug(`Permission denied error sent to ${sent} connections`);
  }

  /**
   * Emit system error
   */
  async emitSystemError(
    tenantId: string,
    component: string,
    errorCode: string,
    message: string,
    details: {
      stackTrace?: string;
      requestId?: string;
      correlationId?: string;
      timestamp?: Date;
    },
    affectedResource?: {
      type: string;
      id: string;
      name?: string;
    },
    severity: 'low' | 'medium' | 'high' | 'critical' = 'high',
    userId?: string,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting system error ${errorCode} in ${component} for tenant: ${tenantId}`);

    const eventData: ErrorNotificationEventData = {
      errorId: `system-error-${Date.now()}`,
      errorType: 'SYSTEM_ERROR',
      message: `System error in ${component}: ${message}`,
      details: {
        component,
        errorCode,
        originalMessage: message,
        ...details,
      },
      affectedResource,
      severity,
      actionRequired: severity === 'critical' || severity === 'high',
      suggestedActions: severity === 'critical' 
        ? [
            'Contact support immediately',
            'Check system status page',
            'Retry operation later',
            'Use backup procedures if available',
          ]
        : [
            'Retry the operation',
            'Check for service updates',
            'Review system logs',
            'Contact support if issue persists',
          ],
      retryable: severity !== 'critical',
    };

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.ERROR_SYSTEM_ERROR,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      userId,
      metadata: {
        resourceType: 'error',
        action: 'system_error',
        component,
        errorCode,
        severity,
      },
    });

    this.logger.debug(`System error sent to ${sent} connections`);
  }

  /**
   * Emit validation failed error
   */
  async emitValidationFailed(
    tenantId: string,
    operation: string,
    validationErrors: Array<{
      field: string;
      message: string;
      value?: any;
      constraint?: string;
    }>,
    details: {
      requestId?: string;
      endpoint?: string;
      payload?: any;
    },
    affectedResource?: {
      type: string;
      id: string;
      name?: string;
    },
    userId?: string,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting validation failed error for ${operation} in tenant: ${tenantId}`);

    const eventData: ErrorNotificationEventData = {
      errorId: `validation-failed-${Date.now()}`,
      errorType: 'VALIDATION_FAILED',
      message: `Validation failed for ${operation}`,
      details: {
        operation,
        validationErrors,
        errorCount: validationErrors.length,
        ...details,
      },
      affectedResource,
      severity: 'low',
      actionRequired: true,
      suggestedActions: [
        'Review input data format',
        'Check required fields',
        'Validate data types',
        'Refer to API documentation',
      ],
      retryable: true,
    };

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.ERROR_VALIDATION_FAILED,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      userId,
      metadata: {
        resourceType: 'error',
        action: 'validation_failed',
        operation,
        errorCount: validationErrors.length,
        severity: 'low',
      },
    });

    this.logger.debug(`Validation failed error sent to ${sent} connections`);
  }

  /**
   * Emit job failure error
   */
  async emitJobFailed(
    tenantId: string,
    jobId: string,
    jobType: string,
    queueName: string,
    error: string,
    details: {
      attempts?: number;
      maxAttempts?: number;
      duration?: number;
      retryable?: boolean;
      jobData?: any;
    },
    affectedResource?: {
      type: string;
      id: string;
      name?: string;
    },
    userId?: string,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting job failed error: ${jobId} (${jobType}) in tenant: ${tenantId}`);

    const eventData: ErrorNotificationEventData = {
      errorId: `job-failed-${jobId}`,
      errorType: 'JOB_FAILED',
      message: `Job ${jobType} failed: ${error}`,
      details: {
        jobId,
        jobType,
        queueName,
        error,
        ...details,
      },
      affectedResource,
      severity: details.retryable ? 'medium' : 'high',
      actionRequired: !details.retryable,
      suggestedActions: details.retryable
        ? [
            'Job will be automatically retried',
            'Monitor retry attempts',
            'Check job logs for details',
          ]
        : [
            'Review job configuration',
            'Check input data validity',
            'Manually retry if appropriate',
            'Contact support if issue persists',
          ],
      retryable: details.retryable || false,
    };

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: SSEEventType.JOB_FAILED,
      data: eventData,
      timestamp: new Date(),
      tenantId,
      userId,
      metadata: {
        resourceType: 'error',
        action: 'job_failed',
        jobType,
        queueName,
        severity: details.retryable ? 'medium' : 'high',
      },
    });

    this.logger.debug(`Job failed error sent to ${sent} connections`);
  }

  /**
   * Emit error resolved notification
   */
  async emitErrorResolved(
    tenantId: string,
    originalErrorId: string,
    errorType: string,
    resolution: {
      method: 'automatic' | 'manual' | 'retry';
      details?: string;
      resolvedBy?: string;
      resolvedAt: Date;
    },
    affectedResource?: {
      type: string;
      id: string;
      name?: string;
    },
    userId?: string,
    triggeredBy?: string,
  ): Promise<void> {
    this.logger.log(`Emitting error resolved notification: ${originalErrorId} in tenant: ${tenantId}`);

    const sent = this.sseService.broadcastToTenant(tenantId, {
      event: 'error.resolved',
      data: {
        originalErrorId,
        errorType,
        resolution,
        affectedResource,
        triggeredBy,
      },
      timestamp: new Date(),
      tenantId,
      userId,
      metadata: {
        resourceType: 'error',
        action: 'error_resolved',
        errorType,
        resolutionMethod: resolution.method,
      },
    });

    this.logger.debug(`Error resolved notification sent to ${sent} connections`);
  }

  /**
   * Emit filtered error notifications based on severity
   */
  async emitFilteredError(
    tenantId: string,
    errorData: ErrorNotificationEventData,
    filter: {
      minSeverity?: 'low' | 'medium' | 'high' | 'critical';
      errorTypes?: string[];
      resourceTypes?: string[];
      userIds?: string[];
    },
    userId?: string,
  ): Promise<void> {
    this.logger.log(`Emitting filtered error notification: ${errorData.errorId} in tenant: ${tenantId}`);

    const eventFilter: EventFilter = {
      errorSeverities: filter.minSeverity ? this.getSeverityLevels(filter.minSeverity) : undefined,
    };

    const sent = this.sseService.sendEventWithFilter({
      event: 'error.notification',
      data: errorData,
      timestamp: new Date(),
      tenantId,
      userId,
      metadata: {
        resourceType: 'error',
        action: 'filtered_notification',
        severity: errorData.severity,
        filtered: true,
      },
    }, eventFilter);

    this.logger.debug(`Filtered error notification sent to ${sent} connections`);
  }

  /**
   * Get severity levels for filtering
   */
  private getSeverityLevels(minSeverity: string): string[] {
    const severityOrder = ['low', 'medium', 'high', 'critical'];
    const minIndex = severityOrder.indexOf(minSeverity);
    return severityOrder.slice(minIndex);
  }
}