import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SSEMessage, SyncStatus } from '../types/tracking.types';
import {
  TRACKINGS_QUERY_KEY,
  TRACKING_ANALYTICS_QUERY_KEY,
} from './useTracking';
import { tokenManager } from '../lib/api/auth/tokenManager';
import { getBaseURL } from '../lib/api/config';

interface UseSSEOptions {
  customerId?: string;
  enabled?: boolean;
  onMessage?: (message: SSEMessage) => void;
  onError?: (error: Event) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: Event) => void;
}

export const useSSE = ({
  customerId,
  enabled = true,
  onMessage,
  onError,
  onOpen,
  onClose,
}: UseSSEOptions = {}) => {
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');
  const [lastMessage, setLastMessage] = useState<SSEMessage | null>(null);
  const [syncStatuses, setSyncStatuses] = useState<Record<string, SyncStatus>>(
    {}
  );
  const eventSourceRef = useRef<EventSource | null>(null);
  const queryClient = useQueryClient();

  const connect = () => {
    if (!enabled || eventSourceRef.current) return;

    const token = tokenManager.getAccessToken();

    if (!token) {
      console.warn('No auth token found for SSE connection');
      return;
    }

    // Use the correct SSE endpoint: /api/v1/events/stream
    // EventSource doesn't support custom headers, so we'll need to use a different approach
    // For now, we'll use the token in the URL or implement a custom SSE client
    const url = `${getBaseURL()}/v1/events/stream`;

    setConnectionStatus('connecting');

    // Create EventSource with Authorization header using EventSource polyfill or withCredentials
    // Since native EventSource doesn't support headers, we pass token via query param
    const urlWithAuth = `${url}?authorization=${encodeURIComponent(token)}${customerId ? `&customerId=${customerId}` : ''}`;
    eventSourceRef.current = new EventSource(urlWithAuth);

    eventSourceRef.current.onopen = event => {
      setConnectionStatus('connected');
      onOpen?.(event);
    };

    eventSourceRef.current.onmessage = event => {
      try {
        const message: SSEMessage = JSON.parse(event.data);
        setLastMessage(message);
        onMessage?.(message);

        // Handle different message types
        switch (message.type) {
          case 'sync_status':
            const syncStatus = message.data as SyncStatus;
            setSyncStatuses(prev => ({
              ...prev,
              [syncStatus.trackingId]: syncStatus,
            }));
            // Invalidate trackings query to refresh data
            queryClient.invalidateQueries({
              queryKey: [TRACKINGS_QUERY_KEY, customerId],
            });
            break;

          case 'tracking_update':
            // Invalidate trackings queries when tracking data changes
            queryClient.invalidateQueries({
              queryKey: [TRACKINGS_QUERY_KEY, customerId],
            });
            break;

          case 'analytics_update':
            // Invalidate analytics queries when analytics data changes
            queryClient.invalidateQueries({
              queryKey: [TRACKING_ANALYTICS_QUERY_KEY, customerId],
            });
            break;
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSourceRef.current.onerror = event => {
      setConnectionStatus('error');
      onError?.(event);

      // Attempt to reconnect after a delay
      setTimeout(() => {
        disconnect();
        connect();
      }, 5000);
    };

    eventSourceRef.current.addEventListener('close', event => {
      setConnectionStatus('disconnected');
      onClose?.(event);
    });
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setConnectionStatus('disconnected');
    }
  };

  const reconnect = () => {
    disconnect();
    setTimeout(connect, 1000);
  };

  useEffect(() => {
    if (enabled && customerId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, customerId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    connectionStatus,
    lastMessage,
    syncStatuses,
    connect,
    disconnect,
    reconnect,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    hasError: connectionStatus === 'error',
  };
};

// Hook specifically for tracking sync status
export const useTrackingSyncStatus = (customerId: string) => {
  const [syncStatuses, setSyncStatuses] = useState<Record<string, SyncStatus>>(
    {}
  );

  const { connectionStatus, isConnected } = useSSE({
    customerId,
    enabled: !!customerId,
    onMessage: message => {
      if (message.type === 'sync_status') {
        const syncStatus = message.data as SyncStatus;
        setSyncStatuses(prev => ({
          ...prev,
          [syncStatus.trackingId]: syncStatus,
        }));
      }
    },
  });

  const getSyncStatus = (trackingId: string): SyncStatus | undefined => {
    return syncStatuses[trackingId];
  };

  const getLatestSyncStatus = (
    trackingId: string
  ): 'synced' | 'pending' | 'error' | 'unknown' => {
    const status = syncStatuses[trackingId];
    return status?.status || 'unknown';
  };

  return {
    syncStatuses,
    getSyncStatus,
    getLatestSyncStatus,
    connectionStatus,
    isConnected,
  };
};
