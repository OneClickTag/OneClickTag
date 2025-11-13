import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Decorator to automatically emit SSE events after method execution
 */
export const EmitSSEEvent = (
  eventType: string,
  dataExtractor?: (result: any, args: any[]) => any,
) => {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      // Get the SSE service from the module context
      // This assumes the service has access to SSE services
      try {
        const eventData = dataExtractor ? dataExtractor(result, args) : result;
        
        // Emit the event (implementation depends on the specific service)
        if (this.emitSSEEvent) {
          await this.emitSSEEvent(eventType, eventData);
        }
      } catch (error) {
        console.error(`Failed to emit SSE event ${eventType}:`, error);
        // Don't fail the original operation if SSE emission fails
      }

      return result;
    };

    return descriptor;
  };
};

/**
 * Decorator to extract tenant context for SSE events
 */
export const TenantSSEContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return {
      tenantId: request.tenantId,
      userId: request.user?.sub,
      triggeredBy: request.user?.email || request.user?.sub,
    };
  },
);

/**
 * Method decorator to automatically emit customer events
 */
export const EmitCustomerEvent = (action: 'created' | 'updated' | 'deleted') => {
  return EmitSSEEvent(`customer.${action}`, (result, args) => ({
    customerId: result.id,
    action,
    customer: result,
    changes: action === 'updated' ? args[1] : undefined,
  }));
};

/**
 * Method decorator to automatically emit campaign events
 */
export const EmitCampaignEvent = (action: 'created' | 'updated' | 'deleted' | 'status_changed') => {
  return EmitSSEEvent(`campaign.${action}`, (result, args) => ({
    campaignId: result.id,
    adsAccountId: args[1], // Assuming adsAccountId is second parameter
    customerId: args[0], // Assuming customerId is first parameter
    action,
    campaign: result,
  }));
};

/**
 * Method decorator to automatically emit GTM events
 */
export const EmitGTMEvent = (action: 'sync_started' | 'sync_progress' | 'sync_completed' | 'sync_failed') => {
  return EmitSSEEvent(`gtm.${action}`, (result, args) => ({
    jobId: result.jobId || args[0],
    customerId: args[0],
    adsAccountId: args[1],
    conversionActionId: args[2],
    gtmContainerId: args[3],
    syncType: args[4],
    result: action.includes('completed') ? result : undefined,
    error: action.includes('failed') ? result.error : undefined,
  }));
};

/**
 * Method decorator to automatically emit job events
 */
export const EmitJobEvent = (action: 'started' | 'progress' | 'completed' | 'failed') => {
  return EmitSSEEvent(`job.${action}`, (result, args) => ({
    jobId: result.jobId || args[0],
    jobType: result.jobType || args[1],
    queueName: result.queueName || args[2],
    status: action,
    progress: result.progress,
    result: action === 'completed' ? result : undefined,
    error: action === 'failed' ? result.error : undefined,
  }));
};

/**
 * Metadata keys for reflection
 */
export const SSE_EVENT_METADATA = 'sse_event';
export const SSE_EVENT_TYPE_METADATA = 'sse_event_type';
export const SSE_DATA_EXTRACTOR_METADATA = 'sse_data_extractor';