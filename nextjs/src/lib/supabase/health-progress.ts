/**
 * Health Progress Broadcast - sends real-time health check results via Supabase Realtime channels.
 * Uses broadcast (not table subscriptions) to avoid RLS complexity.
 * Follows the same pattern as batch-progress.ts.
 */

import { supabaseServer } from './server';

export interface HealthProgressEvent {
  type: 'health_checked';
  timestamp: string;
  data: {
    customerId: string;
    totalChecked: number;
    healthy: number;
    issues: number;
    trackingIssues: Array<{
      trackingId: string;
      trackingName: string;
      health: string;
    }>;
  };
}

/**
 * Broadcast a health check result to channel `health:{customerId}`.
 * Non-blocking — errors are logged but don't throw.
 */
export async function broadcastHealthProgress(
  customerId: string,
  event: HealthProgressEvent,
): Promise<void> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return;
    }

    const channel = supabaseServer.channel(`health:${customerId}`);
    await channel.send({
      type: 'broadcast',
      event: 'health_checked',
      payload: event,
    });
    // Unsubscribe after sending to avoid leaking channels on server
    supabaseServer.removeChannel(channel);
  } catch (err) {
    console.warn(`[HealthProgress] Failed to broadcast for customer ${customerId}:`, err);
  }
}
