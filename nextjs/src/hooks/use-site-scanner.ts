'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import {
  StartScanRequest,
  ConfirmNicheRequest,
  RecommendationFilters,
  BulkAcceptRequest,
  SiteScanStatus,
  ScanSummary,
  ScanHistory,
  TrackingRecommendation,
  LiveDiscovery,
  ChunkResult,
  Phase2ChunkResult,
  SiteCredential,
  SaveCredentialRequest,
} from '@/types/site-scanner';

const SCANS_QUERY_KEY = 'site-scans';
const SCAN_DETAIL_KEY = 'site-scan-detail';
const RECOMMENDATIONS_KEY = 'scan-recommendations';

// ========================================
// Queries
// ========================================

export const useScanHistory = (customerId: string) => {
  const api = useApi();
  return useQuery({
    queryKey: [SCANS_QUERY_KEY, customerId],
    queryFn: () => api.get<ScanHistory[]>(`/api/customers/${customerId}/scans`),
    enabled: !!customerId,
    staleTime: 30 * 1000,
  });
};

export const useScanDetail = (customerId: string, scanId: string | null, poll = false) => {
  const api = useApi();
  return useQuery({
    queryKey: [SCAN_DETAIL_KEY, customerId, scanId],
    queryFn: () => api.get<ScanSummary>(`/api/customers/${customerId}/scans/${scanId}`),
    enabled: !!customerId && !!scanId,
    staleTime: poll ? 2000 : 10 * 1000,
    refetchInterval: poll ? 3000 : false,
  });
};

export const useRecommendations = (
  customerId: string,
  scanId: string | null,
  filters?: RecommendationFilters,
) => {
  const api = useApi();
  return useQuery({
    queryKey: [RECOMMENDATIONS_KEY, customerId, scanId, filters],
    queryFn: () =>
      api.get<TrackingRecommendation[]>(`/api/customers/${customerId}/scans/${scanId}/recommendations`, {
        params: filters as any,
      }),
    enabled: !!customerId && !!scanId,
    staleTime: 30 * 1000,
  });
};

// ========================================
// Mutations
// ========================================

export const useStartScan = () => {
  const queryClient = useQueryClient();
  const api = useApi();
  return useMutation({
    mutationFn: ({ customerId, data }: { customerId: string; data?: StartScanRequest }) =>
      api.post<ScanSummary>(`/api/customers/${customerId}/scans`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SCANS_QUERY_KEY, variables.customerId] });
    },
  });
};

export const useConfirmNiche = () => {
  const queryClient = useQueryClient();
  const api = useApi();
  return useMutation({
    mutationFn: ({
      customerId,
      scanId,
      data,
    }: {
      customerId: string;
      scanId: string;
      data: ConfirmNicheRequest;
    }) => api.post<ScanSummary>(`/api/customers/${customerId}/scans/${scanId}/confirm-niche`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SCAN_DETAIL_KEY, variables.customerId, variables.scanId] });
    },
  });
};

export const useCancelScan = () => {
  const queryClient = useQueryClient();
  const api = useApi();
  return useMutation({
    mutationFn: ({ customerId, scanId }: { customerId: string; scanId: string }) =>
      api.post<void>(`/api/customers/${customerId}/scans/${scanId}/cancel`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SCANS_QUERY_KEY, variables.customerId] });
      queryClient.invalidateQueries({ queryKey: [SCAN_DETAIL_KEY, variables.customerId, variables.scanId] });
    },
  });
};

export const useAcceptRecommendation = () => {
  const queryClient = useQueryClient();
  const api = useApi();
  return useMutation({
    mutationFn: ({
      customerId,
      scanId,
      recommendationId,
    }: {
      customerId: string;
      scanId: string;
      recommendationId: string;
    }) =>
      api.post<TrackingRecommendation>(
        `/api/customers/${customerId}/scans/${scanId}/recommendations/${recommendationId}/accept`
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [RECOMMENDATIONS_KEY, variables.customerId, variables.scanId] });
    },
  });
};

export const useRejectRecommendation = () => {
  const queryClient = useQueryClient();
  const api = useApi();
  return useMutation({
    mutationFn: ({
      customerId,
      scanId,
      recommendationId,
    }: {
      customerId: string;
      scanId: string;
      recommendationId: string;
    }) =>
      api.post<TrackingRecommendation>(
        `/api/customers/${customerId}/scans/${scanId}/recommendations/${recommendationId}/reject`
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [RECOMMENDATIONS_KEY, variables.customerId, variables.scanId] });
    },
  });
};

export const useBulkAcceptRecommendations = () => {
  const queryClient = useQueryClient();
  const api = useApi();
  return useMutation({
    mutationFn: ({
      customerId,
      scanId,
      data,
    }: {
      customerId: string;
      scanId: string;
      data: BulkAcceptRequest;
    }) => api.post<void>(`/api/customers/${customerId}/scans/${scanId}/recommendations/bulk-accept`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [RECOMMENDATIONS_KEY, variables.customerId, variables.scanId] });
    },
  });
};

interface BulkCreateTrackingsResult {
  created: number;
  failed: number;
  trackingIds: string[];
  errors: string[];
  total: number;
}

export const useBulkCreateTrackings = () => {
  const queryClient = useQueryClient();
  const api = useApi();
  return useMutation({
    mutationFn: ({
      customerId,
      scanId,
      recommendationIds,
    }: {
      customerId: string;
      scanId: string;
      recommendationIds: string[];
    }) =>
      api.post<BulkCreateTrackingsResult>(
        `/api/customers/${customerId}/scans/${scanId}/recommendations/bulk-create-trackings`,
        { recommendationIds },
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [RECOMMENDATIONS_KEY, variables.customerId, variables.scanId] });
      queryClient.invalidateQueries({ queryKey: ['trackings'] });
    },
  });
};

export const useProcessChunk = () => {
  const api = useApi();
  return useMutation({
    mutationFn: ({
      customerId,
      scanId,
      phase,
      chunkSize,
      credentials,
    }: {
      customerId: string;
      scanId: string;
      phase: 'phase1' | 'phase2';
      chunkSize?: number;
      credentials?: { username: string; password: string };
    }) =>
      api.post<ChunkResult | Phase2ChunkResult>(
        `/api/customers/${customerId}/scans/${scanId}/process-chunk`,
        { phase, chunkSize, credentials },
      ),
  });
};

export const useProvideCredentials = () => {
  const api = useApi();
  return useMutation({
    mutationFn: async ({
      customerId,
      scanId,
      username,
      password,
      saveForFuture,
    }: {
      customerId: string;
      scanId: string;
      username: string;
      password: string;
      saveForFuture: boolean;
    }) => {
      return api.post<void>(
        `/api/customers/${customerId}/scans/${scanId}/provide-credentials`,
        { username, password, saveForFuture },
      );
    },
  });
};

export const useDetectNiche = () => {
  const queryClient = useQueryClient();
  const api = useApi();
  return useMutation({
    mutationFn: ({ customerId, scanId }: { customerId: string; scanId: string }) =>
      api.post<ScanSummary>(`/api/customers/${customerId}/scans/${scanId}/detect-niche`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SCAN_DETAIL_KEY, variables.customerId, variables.scanId] });
    },
  });
};

export const useFinalizeScan = () => {
  const queryClient = useQueryClient();
  const api = useApi();
  return useMutation({
    mutationFn: ({ customerId, scanId }: { customerId: string; scanId: string }) =>
      api.post<ScanSummary>(`/api/customers/${customerId}/scans/${scanId}/finalize`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SCAN_DETAIL_KEY, variables.customerId, variables.scanId] });
      queryClient.invalidateQueries({ queryKey: [SCANS_QUERY_KEY, variables.customerId] });
      queryClient.invalidateQueries({ queryKey: [RECOMMENDATIONS_KEY, variables.customerId, variables.scanId] });
    },
  });
};

const CREDENTIALS_KEY = 'site-credentials';

export const useCredentials = (customerId: string) => {
  const api = useApi();
  return useQuery({
    queryKey: [CREDENTIALS_KEY, customerId],
    queryFn: () => api.get<SiteCredential[]>(`/api/customers/${customerId}/credentials`),
    enabled: !!customerId,
  });
};

export const useSaveCredential = () => {
  const queryClient = useQueryClient();
  const api = useApi();
  return useMutation({
    mutationFn: ({ customerId, data }: { customerId: string; data: SaveCredentialRequest }) =>
      api.post<SiteCredential>(`/api/customers/${customerId}/credentials`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [CREDENTIALS_KEY, variables.customerId] });
    },
  });
};

export const useDeleteCredential = () => {
  const queryClient = useQueryClient();
  const api = useApi();
  return useMutation({
    mutationFn: ({ customerId, credentialId }: { customerId: string; credentialId: string }) =>
      api.delete<void>(`/api/customers/${customerId}/credentials/${credentialId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [CREDENTIALS_KEY, variables.customerId] });
    },
  });
};

interface AutoRegisterResult {
  success: boolean;
  credentials?: { email: string; password: string };
  error?: string;
  needsEmailVerification?: boolean;
}

export const useAutoRegister = () => {
  const api = useApi();
  return useMutation({
    mutationFn: ({ customerId, scanId }: { customerId: string; scanId: string }) =>
      api.post<AutoRegisterResult>(`/api/customers/${customerId}/scans/${scanId}/auto-register`),
  });
};

// ========================================
// Chunked Scan Orchestration Hook
// ========================================

interface ChunkedScanState {
  isProcessing: boolean;
  phase: 'idle' | 'phase1' | 'detecting_niche' | 'phase2' | 'finalizing' | 'done';
  pagesProcessed: number;
  totalPages: number;
  discovery: LiveDiscovery | null;
  error: string | null;
  loginDetected: boolean;
  loginUrl: string | null;
  accumulatedPages: ChunkResult['newPages'];
  obstaclesDismissed: number;
  totalInteractions: number;
  authenticatedPagesCount: number;
  credentials: { username: string; password: string } | null;
}

export const useChunkedScan = (customerId: string, scanId: string | null) => {
  const [state, setState] = useState<ChunkedScanState>({
    isProcessing: false,
    phase: 'idle',
    pagesProcessed: 0,
    totalPages: 0,
    discovery: null,
    error: null,
    loginDetected: false,
    loginUrl: null,
    accumulatedPages: [],
    obstaclesDismissed: 0,
    totalInteractions: 0,
    authenticatedPagesCount: 0,
    credentials: null,
  });
  const abortRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();
  const api = useApi();

  const stopProcessing = useCallback(() => {
    abortRef.current = true;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const startPhase1 = useCallback(async (resume = false) => {
    if (!customerId || !scanId) return;
    abortRef.current = false;

    let currentCredentials: { username: string; password: string } | null = null;
    let startingPageCount = 0;

    setState(prev => {
      currentCredentials = prev.credentials;
      startingPageCount = resume ? prev.pagesProcessed : 0;
      return {
        ...prev,
        isProcessing: true,
        phase: 'phase1',
        // Only reset stats if not resuming
        pagesProcessed: resume ? prev.pagesProcessed : 0,
        error: null,
        accumulatedPages: resume ? prev.accumulatedPages : [],
        obstaclesDismissed: resume ? prev.obstaclesDismissed : 0,
        totalInteractions: resume ? prev.totalInteractions : 0,
        authenticatedPagesCount: resume ? prev.authenticatedPagesCount : 0,
      };
    });

    try {
      let hasMore = true;
      // Start from current pagesProcessed if resuming
      let totalProcessed = startingPageCount;

      while (hasMore && !abortRef.current) {
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const result = await api.post<ChunkResult>(
          `/api/customers/${customerId}/scans/${scanId}/process-chunk`,
          {
            phase: 'phase1',
            chunkSize: 8,
            credentials: currentCredentials || undefined,
          },
          { signal: controller.signal },
        );

        totalProcessed += result.pagesProcessed;
        hasMore = result.hasMore;

        setState(prev => ({
          ...prev,
          pagesProcessed: totalProcessed,
          totalPages: result.discovery.totalUrlsDiscovered,
          discovery: result.discovery,
          loginDetected: prev.loginDetected || !!result.loginDetected,
          loginUrl: result.loginUrl || prev.loginUrl,
          // Accumulate new pages - prepend so newest appear first
          accumulatedPages: [...result.newPages, ...prev.accumulatedPages],
          // Accumulate V2 stats if present in result
          obstaclesDismissed: prev.obstaclesDismissed + ((result as any).obstaclesDismissed || 0),
          totalInteractions: prev.totalInteractions + ((result as any).totalInteractions || 0),
          authenticatedPagesCount: prev.authenticatedPagesCount + ((result as any).authenticatedPagesCount || 0),
        }));
      }

      if (abortRef.current) return;

      // Phase 1 chunks done — run niche detection
      setState(prev => ({ ...prev, phase: 'detecting_niche' }));
      await api.post(`/api/customers/${customerId}/scans/${scanId}/detect-niche`);

      queryClient.invalidateQueries({ queryKey: [SCAN_DETAIL_KEY, customerId, scanId] });
      setState(prev => ({ ...prev, isProcessing: false, phase: 'done' }));
    } catch (err) {
      // Ignore abort errors — they're expected on cancel
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Scan failed';
      setState(prev => ({ ...prev, isProcessing: false, error: message }));
    }
  }, [customerId, scanId, api, queryClient]);

  const startPhase2 = useCallback(async () => {
    if (!customerId || !scanId) return;
    abortRef.current = false;

    setState(prev => ({
      ...prev,
      isProcessing: true,
      phase: 'phase2',
      pagesProcessed: 0,
      error: null,
    }));

    try {
      let hasMore = true;
      let totalProcessed = 0;

      while (hasMore && !abortRef.current) {
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const result = await api.post<Phase2ChunkResult>(
          `/api/customers/${customerId}/scans/${scanId}/process-chunk`,
          { phase: 'phase2', chunkSize: 5 },
          { signal: controller.signal },
        );

        totalProcessed += result.pagesProcessed;
        hasMore = result.hasMore;

        setState(prev => ({
          ...prev,
          pagesProcessed: totalProcessed,
        }));
      }

      if (abortRef.current) return;

      // Phase 2 chunks done — finalize
      setState(prev => ({ ...prev, phase: 'finalizing' }));
      await api.post(`/api/customers/${customerId}/scans/${scanId}/finalize`);

      queryClient.invalidateQueries({ queryKey: [SCAN_DETAIL_KEY, customerId, scanId] });
      queryClient.invalidateQueries({ queryKey: [SCANS_QUERY_KEY, customerId] });
      queryClient.invalidateQueries({ queryKey: [RECOMMENDATIONS_KEY, customerId, scanId] });
      setState(prev => ({ ...prev, isProcessing: false, phase: 'done' }));
    } catch (err) {
      // Ignore abort errors — they're expected on cancel
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setState(prev => ({ ...prev, isProcessing: false, error: message }));
    }
  }, [customerId, scanId, api, queryClient]);

  const reset = useCallback(() => {
    abortRef.current = true;
    setState({
      isProcessing: false,
      phase: 'idle',
      pagesProcessed: 0,
      totalPages: 0,
      discovery: null,
      error: null,
      loginDetected: false,
      loginUrl: null,
      accumulatedPages: [],
      obstaclesDismissed: 0,
      totalInteractions: 0,
      authenticatedPagesCount: 0,
      credentials: null,
    });
  }, []);

  const setCredentials = useCallback((credentials: { username: string; password: string } | null) => {
    setState(prev => ({ ...prev, credentials }));
  }, []);

  return {
    ...state,
    startPhase1,
    startPhase2,
    stopProcessing,
    reset,
    setCredentials,
  };
};

// SSE Hook removed — replaced by useScanProgress (Supabase Realtime).
// See: nextjs/src/hooks/use-scan-progress.ts
