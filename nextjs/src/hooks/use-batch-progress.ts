'use client';

/**
 * useBatchProgress - Subscribes to Supabase Realtime channel for live batch progress.
 * Follows the same pattern as use-scan-progress.ts.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { BatchProgressEvent } from '@/lib/supabase/batch-progress';

export interface JobProgress {
  jobId: string;
  trackingId: string;
  trackingName: string;
  status: string;
  step: string | null;
  error: string | null;
  nextRetryAt: string | null;
}

export interface BatchProgressState {
  status: 'idle' | 'processing' | 'paused' | 'completed';
  completed: number;
  failed: number;
  total: number;
  pauseReason: string | null;
  resumeAfter: string | null;
  jobs: Map<string, JobProgress>;
  isConnected: boolean;
}

const INITIAL_STATE: BatchProgressState = {
  status: 'idle',
  completed: 0,
  failed: 0,
  total: 0,
  pauseReason: null,
  resumeAfter: null,
  jobs: new Map(),
  isConnected: false,
};

export function useBatchProgress(batchId: string | null): BatchProgressState {
  const [state, setState] = useState<BatchProgressState>(INITIAL_STATE);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    setState((prev) => ({ ...prev, isConnected: false }));
  }, []);

  useEffect(() => {
    if (!batchId) {
      cleanup();
      setState(INITIAL_STATE);
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return;
    }

    let channel: RealtimeChannel;

    const setupChannel = async () => {
      const { supabase } = await import('@/lib/supabase/client');

      channel = supabase.channel(`batch:${batchId}`);
      channelRef.current = channel;

      channel
        .on('broadcast', { event: 'batch_progress' }, ({ payload }) => {
          const event = payload as BatchProgressEvent;

          setState((prev) => {
            const jobs = new Map(prev.jobs);

            // Update job-level state if jobId is present
            if (event.data.jobId) {
              const existing = jobs.get(event.data.jobId);
              jobs.set(event.data.jobId, {
                jobId: event.data.jobId,
                trackingId: event.data.trackingId || existing?.trackingId || '',
                trackingName: event.data.trackingName || existing?.trackingName || '',
                status: eventTypeToJobStatus(event.type),
                step: event.data.step || null,
                error: event.data.error || null,
                nextRetryAt: event.data.nextRetryAt || null,
              });
            }

            switch (event.type) {
              case 'job_processing':
                return {
                  ...prev,
                  status: 'processing',
                  completed: event.data.completed,
                  failed: event.data.failed,
                  total: event.data.total,
                  jobs,
                };

              case 'job_completed':
                return {
                  ...prev,
                  status: 'processing',
                  completed: event.data.completed,
                  failed: event.data.failed,
                  total: event.data.total,
                  jobs,
                };

              case 'job_failed':
                return {
                  ...prev,
                  completed: event.data.completed,
                  failed: event.data.failed,
                  total: event.data.total,
                  jobs,
                };

              case 'job_retrying':
                return {
                  ...prev,
                  completed: event.data.completed,
                  failed: event.data.failed,
                  total: event.data.total,
                  jobs,
                };

              case 'batch_paused':
                return {
                  ...prev,
                  status: 'paused',
                  pauseReason: event.data.pauseReason || null,
                  resumeAfter: event.data.resumeAfter || null,
                  completed: event.data.completed,
                  failed: event.data.failed,
                  total: event.data.total,
                  jobs,
                };

              case 'batch_resumed':
                return {
                  ...prev,
                  status: 'processing',
                  pauseReason: null,
                  resumeAfter: null,
                  completed: event.data.completed,
                  failed: event.data.failed,
                  total: event.data.total,
                  jobs,
                };

              case 'batch_completed':
                return {
                  ...prev,
                  status: 'completed',
                  pauseReason: null,
                  resumeAfter: null,
                  completed: event.data.completed,
                  failed: event.data.failed,
                  total: event.data.total,
                  jobs,
                };

              default:
                return prev;
            }
          });
        })
        .subscribe((status) => {
          setState((prev) => ({
            ...prev,
            isConnected: status === 'SUBSCRIBED',
          }));
        });
    };

    setupChannel();

    return () => {
      cleanup();
    };
  }, [batchId, cleanup]);

  return state;
}

function eventTypeToJobStatus(type: string): string {
  switch (type) {
    case 'job_processing':
      return 'PROCESSING';
    case 'job_completed':
      return 'COMPLETED';
    case 'job_failed':
      return 'FAILED';
    case 'job_retrying':
      return 'RETRYING';
    case 'batch_paused':
      return 'PAUSED';
    default:
      return 'QUEUED';
  }
}
