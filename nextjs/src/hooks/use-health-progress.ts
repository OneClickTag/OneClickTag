'use client';

/**
 * useHealthProgress - Subscribes to Supabase Realtime channel for live health check results.
 * When a health check completes, invalidates the trackings query to refresh UI.
 * Follows the same pattern as use-batch-progress.ts.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useHealthProgress(customerId: string | null): void {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!customerId) {
      cleanup();
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

      channel = supabase.channel(`health:${customerId}`);
      channelRef.current = channel;

      channel
        .on('broadcast', { event: 'health_checked' }, () => {
          // Invalidate trackings query to refresh health status in UI
          queryClient.invalidateQueries({ queryKey: ['trackings', { customerId }] });
          queryClient.invalidateQueries({ queryKey: ['trackings'] });
        })
        .subscribe();
    };

    setupChannel();

    return () => {
      cleanup();
    };
  }, [customerId, cleanup, queryClient]);
}
