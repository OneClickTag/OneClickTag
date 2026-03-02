/**
 * Batch Progress Broadcast - sends real-time batch progress via Supabase Realtime channels.
 * Uses broadcast (not table subscriptions) to avoid RLS complexity.
 * Follows the same pattern as scan-progress.ts.
 */

import { supabaseServer } from './server';

export type BatchProgressEventType =
  | 'job_processing'
  | 'job_completed'
  | 'job_failed'
  | 'job_retrying'
  | 'batch_paused'
  | 'batch_resumed'
  | 'batch_completed';

export interface BatchProgressEvent {
  type: BatchProgressEventType;
  timestamp: string;
  data: {
    jobId?: string;
    trackingId?: string;
    trackingName?: string;
    step?: string; // 'ads_sync' | 'gtm_sync'
    error?: string;
    nextRetryAt?: string;
    pauseReason?: string;
    resumeAfter?: string;
    // Aggregate counters — included in every event
    completed: number;
    failed: number;
    total: number;
  };
}

/**
 * Broadcast a batch progress event to channel `batch:{batchId}`.
 * Non-blocking — errors are logged but don't throw.
 */
export async function broadcastBatchProgress(
  batchId: string,
  event: BatchProgressEvent,
): Promise<void> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return;
    }

    const channel = supabaseServer.channel(`batch:${batchId}`);
    await channel.send({
      type: 'broadcast',
      event: 'batch_progress',
      payload: event,
    });
    // Unsubscribe after sending to avoid leaking channels on server
    supabaseServer.removeChannel(channel);
  } catch (err) {
    console.warn(`[BatchProgress] Failed to broadcast for batch ${batchId}:`, err);
  }
}
