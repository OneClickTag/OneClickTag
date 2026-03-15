'use client';

import { useRef } from 'react';
import type { SiteScanStatus } from '@/types/site-scanner';

export type ScanUIPhase =
  | 'idle'              // No scan, or terminal (show launcher + history)
  | 'loading'           // Transitioning between scans (show spinner overlay)
  | 'phase1'            // Phase 1 crawling (show ScanDiscoveryDashboard)
  | 'detecting_niche'   // AI niche detection running
  | 'niche_confirm'     // Awaiting user niche confirmation
  | 'phase2'            // Phase 2 extraction (show ScanProgress)
  | 'finalizing'        // Generating recommendations
  | 'completed'         // Results ready (show ScanResults)
  | 'failed'            // Error state
  | 'cancelled'         // Cancelled
  | 'needs_resume';     // Interrupted scan, needs resume

interface UseScanUIStateParams {
  activeScanId: string | null;
  dbStatus: SiteScanStatus | undefined;
  isDbLoading: boolean;
  isChunking: boolean;
  chunkPhase: 'idle' | 'phase1' | 'detecting_niche' | 'phase2' | 'finalizing' | 'done';
  chunkError: string | null;
  hasPreviousData: boolean;  // Whether React Query has placeholder/previous data
}

export function useScanUIState({
  activeScanId,
  dbStatus,
  isDbLoading,
  isChunking,
  chunkPhase,
  chunkError,
  hasPreviousData,
}: UseScanUIStateParams): ScanUIPhase {
  const prevPhaseRef = useRef<ScanUIPhase>('idle');

  let phase: ScanUIPhase;

  // No active scan → idle
  if (!activeScanId) {
    phase = 'idle';
  }
  // Loading with no data at all → loading
  else if (isDbLoading && !hasPreviousData && !isChunking) {
    phase = 'loading';
  }
  // Chunked processing is active → derive from chunk phase
  else if (isChunking) {
    switch (chunkPhase) {
      case 'phase1':
        phase = 'phase1';
        break;
      case 'detecting_niche':
        phase = 'detecting_niche';
        break;
      case 'phase2':
        phase = 'phase2';
        break;
      case 'finalizing':
        phase = 'finalizing';
        break;
      default:
        phase = prevPhaseRef.current !== 'idle' ? prevPhaseRef.current : 'phase1';
    }
  }
  // Chunk error → failed
  else if (chunkError) {
    phase = 'failed';
  }
  // Not chunking → derive from DB status
  else if (dbStatus) {
    switch (dbStatus) {
      case 'COMPLETED':
        phase = 'completed';
        break;
      case 'FAILED':
        phase = 'failed';
        break;
      case 'CANCELLED':
        phase = 'cancelled';
        break;
      case 'NICHE_DETECTED':
      case 'AWAITING_CONFIRMATION':
        phase = 'niche_confirm';
        break;
      case 'CRAWLING':
      case 'DISCOVERING':
        // Not chunking but DB says crawling → needs resume (page refresh scenario)
        phase = 'needs_resume';
        break;
      case 'DEEP_CRAWLING':
      case 'ANALYZING':
        phase = 'needs_resume';
        break;
      case 'QUEUED':
        phase = 'loading';
        break;
      default:
        phase = 'idle';
    }
  }
  // Chunk phase is 'done' → let DB status take over (will be completed/failed soon)
  else if (chunkPhase === 'done') {
    phase = 'loading'; // Brief loading while DB catches up
  }
  else {
    phase = 'idle';
  }

  // Prevent flashing through idle/loading during transitions
  // If we were in an active phase and now would go to idle or loading briefly, keep previous phase
  const isActivePhase = (p: ScanUIPhase) =>
    !['idle', 'loading', 'completed', 'failed', 'cancelled'].includes(p);
  if ((phase === 'idle' || phase === 'loading') && isActivePhase(prevPhaseRef.current) && activeScanId) {
    phase = prevPhaseRef.current;
  }

  prevPhaseRef.current = phase;
  return phase;
}
