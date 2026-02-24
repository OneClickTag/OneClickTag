'use client';

/**
 * useScanProgress - Subscribes to Supabase Realtime channel for live scan progress.
 * Replaces the legacy SSE polling approach with instant WebSocket-based updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ScanProgressEvent } from '@/lib/supabase/scan-progress';

interface ScanProgressState {
  /** URL currently being crawled */
  currentUrl: string | null;
  /** Total pages processed so far */
  pagesProcessed: number;
  /** Total URLs discovered (queued + crawled) */
  totalDiscovered: number;
  /** Current scan phase */
  phase: 'phase1' | 'phase2' | 'detecting_niche' | 'finalizing' | 'completed' | null;
  /** Recently crawled pages (newest first, max 50) */
  recentPages: Array<{
    url: string;
    title: string | null;
    pageType: string | null;
    hasForm: boolean;
    hasCTA: boolean;
    timestamp: string;
  }>;
  /** Whether a login page was detected */
  loginDetected: boolean;
  /** URL of the detected login page */
  loginUrl: string | null;
  /** Whether the connection is active */
  isConnected: boolean;
}

const INITIAL_STATE: ScanProgressState = {
  currentUrl: null,
  pagesProcessed: 0,
  totalDiscovered: 0,
  phase: null,
  recentPages: [],
  loginDetected: false,
  loginUrl: null,
  isConnected: false,
};

const MAX_RECENT_PAGES = 50;

/**
 * Subscribe to real-time scan progress via Supabase Realtime broadcast channels.
 * Auto-unsubscribes when scan completes or component unmounts.
 */
export function useScanProgress(scanId: string | null): ScanProgressState {
  const [state, setState] = useState<ScanProgressState>(INITIAL_STATE);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    setState(prev => ({ ...prev, isConnected: false }));
  }, []);

  useEffect(() => {
    if (!scanId) {
      cleanup();
      setState(INITIAL_STATE);
      return;
    }

    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return;
    }

    // Lazy import to avoid SSR issues
    let channel: RealtimeChannel;

    const setupChannel = async () => {
      const { supabase } = await import('@/lib/supabase/client');

      channel = supabase.channel(`scan:${scanId}`);
      channelRef.current = channel;

      channel
        .on('broadcast', { event: 'scan_progress' }, ({ payload }) => {
          const event = payload as ScanProgressEvent;

          setState(prev => {
            switch (event.type) {
              case 'page_crawled':
                return {
                  ...prev,
                  currentUrl: event.data.url || null,
                  pagesProcessed: event.data.pagesProcessed,
                  totalDiscovered: event.data.totalDiscovered,
                  phase: event.data.phase,
                  recentPages: [
                    {
                      url: event.data.url || '',
                      title: event.data.title || null,
                      pageType: event.data.pageType || null,
                      hasForm: event.data.hasForm || false,
                      hasCTA: event.data.hasCTA || false,
                      timestamp: event.timestamp,
                    },
                    ...prev.recentPages,
                  ].slice(0, MAX_RECENT_PAGES),
                };

              case 'login_detected':
                return {
                  ...prev,
                  loginDetected: true,
                  loginUrl: event.data.loginUrl || null,
                };

              case 'chunk_complete':
                return {
                  ...prev,
                  pagesProcessed: event.data.pagesProcessed,
                  totalDiscovered: event.data.totalDiscovered,
                  phase: event.data.phase,
                  currentUrl: null,
                };

              case 'phase_change':
                return {
                  ...prev,
                  phase: event.data.phase,
                };

              case 'completed':
                return {
                  ...prev,
                  phase: 'completed',
                  currentUrl: null,
                };

              case 'error':
                return {
                  ...prev,
                  currentUrl: null,
                };

              default:
                return prev;
            }
          });
        })
        .subscribe((status) => {
          setState(prev => ({
            ...prev,
            isConnected: status === 'SUBSCRIBED',
          }));
        });
    };

    setupChannel();

    return () => {
      cleanup();
    };
  }, [scanId, cleanup]);

  return state;
}
