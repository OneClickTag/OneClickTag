/**
 * Scan Progress Broadcast - sends real-time scan progress via Supabase Realtime channels.
 * Uses broadcast (not table subscriptions) to avoid RLS complexity.
 */

import { supabaseServer } from './server';

export type ScanProgressEventType =
  | 'page_crawled'
  | 'phase_change'
  | 'niche_detected'
  | 'login_detected'
  | 'chunk_complete'
  | 'error'
  | 'completed';

export interface ScanProgressEvent {
  type: ScanProgressEventType;
  timestamp: string;
  data: {
    url?: string;
    title?: string | null;
    pageType?: string | null;
    pagesProcessed: number;
    totalDiscovered: number;
    phase: 'phase1' | 'phase2' | 'detecting_niche' | 'finalizing' | 'completed';
    hasForm?: boolean;
    hasCTA?: boolean;
    loginUrl?: string;
    error?: string;
  };
}

/**
 * Broadcast a scan progress event to channel `scan:{scanId}`.
 * Non-blocking — errors are logged but don't throw.
 */
export async function broadcastScanProgress(
  scanId: string,
  event: ScanProgressEvent,
): Promise<void> {
  try {
    // Only broadcast if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return;
    }

    const channel = supabaseServer.channel(`scan:${scanId}`);
    await channel.send({
      type: 'broadcast',
      event: 'scan_progress',
      payload: event,
    });
    // Unsubscribe after sending to avoid leaking channels on server
    supabaseServer.removeChannel(channel);
  } catch (err) {
    console.warn(`[ScanProgress] Failed to broadcast for scan ${scanId}:`, err);
  }
}

/**
 * Helper to create a page_crawled event.
 */
export function pageCrawledEvent(
  url: string,
  title: string | null,
  pageType: string | null,
  pagesProcessed: number,
  totalDiscovered: number,
  hasForm: boolean,
  hasCTA: boolean,
): ScanProgressEvent {
  return {
    type: 'page_crawled',
    timestamp: new Date().toISOString(),
    data: {
      url,
      title,
      pageType,
      pagesProcessed,
      totalDiscovered,
      phase: 'phase1',
      hasForm,
      hasCTA,
    },
  };
}

/**
 * Helper to create a chunk_complete event.
 */
export function chunkCompleteEvent(
  pagesProcessed: number,
  totalDiscovered: number,
  phase: ScanProgressEvent['data']['phase'],
): ScanProgressEvent {
  return {
    type: 'chunk_complete',
    timestamp: new Date().toISOString(),
    data: {
      pagesProcessed,
      totalDiscovered,
      phase,
    },
  };
}
