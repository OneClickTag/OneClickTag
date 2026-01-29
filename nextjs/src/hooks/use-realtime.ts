'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';

interface TrackingUpdate {
  id: string;
  name: string;
  status: string;
  lastError?: string;
  lastSyncAt?: string;
}

interface SSEMessage {
  type: 'connected' | 'tracking_update' | 'error';
  customerId?: string;
  tracking?: TrackingUpdate;
  message?: string;
}

export function useRealtimeTrackings(customerId: string | null) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<TrackingUpdate | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(async () => {
    if (!customerId) return;

    const token = await getToken();
    if (!token) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Note: EventSource doesn't support custom headers, so we use a query param
    // In production, you might want to use a different approach or a library
    const url = `/api/realtime/${customerId}?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: SSEMessage = JSON.parse(event.data);

        if (data.type === 'tracking_update' && data.tracking) {
          setLastUpdate(data.tracking);

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['tracking', data.tracking.id] });
          queryClient.invalidateQueries({ queryKey: ['trackings', { customerId }] });
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      // Attempt to reconnect after 5 seconds
      setTimeout(() => connect(), 5000);
    };

    eventSourceRef.current = eventSource;
  }, [customerId, getToken, queryClient]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected,
    lastUpdate,
    reconnect: connect,
  };
}
