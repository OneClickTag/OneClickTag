'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useScanHistory,
  useScanDetail,
  useStartScan,
  useConfirmNiche,
  useCancelScan,
  useChunkedScan,
  useSaveCredential,
  useProvideCredentials,
  useAutoRegister,
} from '@/hooks/use-site-scanner';
import { SiteScanStatus, TrackingRecommendation } from '@/types/site-scanner';
import { ScanLauncher } from './ScanLauncher';
import { ScanDiscoveryDashboard } from './ScanDiscoveryDashboard';
import { ScanProgress } from './ScanProgress';
import { NicheVerification } from './NicheVerification';
import { ScanResults } from './ScanResults';
import { ScanHistoryList } from './ScanHistory';

interface AutoTrackProps {
  customerId: string;
  customerWebsiteUrl?: string;
  hasGoogleConnected?: boolean;
  onCreateTracking?: (recommendation: TrackingRecommendation) => void;
}

const ACTIVE_STATUSES: SiteScanStatus[] = [
  'QUEUED', 'DISCOVERING', 'CRAWLING', 'NICHE_DETECTED', 'AWAITING_CONFIRMATION', 'DEEP_CRAWLING', 'ANALYZING',
];

export function AutoTrack({ customerId, customerWebsiteUrl, hasGoogleConnected, onCreateTracking }: AutoTrackProps) {
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [showCredentialPrompt, setShowCredentialPrompt] = useState(false);
  const [autoRegisterStatus, setAutoRegisterStatus] = useState<'idle' | 'finding_signup' | 'creating_account' | 'success' | 'failed'>('idle');
  const [autoRegisterError, setAutoRegisterError] = useState<string | null>(null);
  const credentialSkippedRef = useRef(false);
  const phase1StartedRef = useRef(false);

  // Queries
  const { data: scanHistory } = useScanHistory(customerId);
  const shouldPoll = activeScanId !== null;
  const { data: scanDetail } = useScanDetail(customerId, activeScanId, shouldPoll);

  // Mutations
  const startScan = useStartScan();
  const confirmNiche = useConfirmNiche();
  const cancelScan = useCancelScan();
  const saveCredential = useSaveCredential();
  const provideCredentials = useProvideCredentials();
  const autoRegister = useAutoRegister();

  // Chunked scan orchestration
  const chunkedScan = useChunkedScan(customerId, activeScanId);

  // Auto-select the latest active/completed scan on load
  useEffect(() => {
    if (scanHistory && !activeScanId) {
      const activeScan = scanHistory.find(s => ACTIVE_STATUSES.includes(s.status as SiteScanStatus));
      if (activeScan) {
        setActiveScanId(activeScan.id);
      } else if (scanHistory.length > 0 && scanHistory[0].status === 'COMPLETED') {
        setActiveScanId(scanHistory[0].id);
      }
    }
  }, [scanHistory, activeScanId]);

  // Show credential prompt when login is detected (non-blocking - processing continues)
  useEffect(() => {
    if (chunkedScan.loginDetected && !showCredentialPrompt && !credentialSkippedRef.current) {
      setShowCredentialPrompt(true);
      // Don't stop processing - scan continues crawling non-protected pages
      // while credential prompt is visible. Credentials will be added to
      // subsequent chunk requests if provided.
    }
  }, [chunkedScan.loginDetected, showCredentialPrompt, chunkedScan]);

  // Determine current display state from scan detail + chunked state
  const dbStatus = scanDetail?.status as SiteScanStatus | undefined;
  const isChunking = chunkedScan.isProcessing;
  const chunkPhase = chunkedScan.phase;

  // Phase 1 is active when: chunks are processing in phase1, or detecting niche
  const isPhase1Active = isChunking && (chunkPhase === 'phase1' || chunkPhase === 'detecting_niche');
  // Phase 2 is active when: chunks processing in phase2, or finalizing
  const isPhase2Active = isChunking && (chunkPhase === 'phase2' || chunkPhase === 'finalizing');
  // Niche phase: scan is NICHE_DETECTED and we're not chunking
  const isNichePhase = !isChunking && (dbStatus === 'NICHE_DETECTED' || dbStatus === 'AWAITING_CONFIRMATION');
  // Terminal states
  const isCompleted = dbStatus === 'COMPLETED';
  const isFailed = dbStatus === 'FAILED' || (!isChunking && !!chunkedScan.error);
  const isCancelled = dbStatus === 'CANCELLED';
  // Idle means no active scan or scan is terminal
  const isIdle = !activeScanId || isCompleted || isFailed || isCancelled;
  // Scan in CRAWLING but not being processed (e.g. page refresh)
  const needsResume = !isChunking && !isNichePhase && !isCompleted && !isFailed && !isCancelled &&
    (dbStatus === 'CRAWLING' || dbStatus === 'DISCOVERING');

  const handleStartScan = async (websiteUrl?: string, maxPages?: number, maxDepth?: number) => {
    try {
      phase1StartedRef.current = false;
      credentialSkippedRef.current = false;
      setShowCredentialPrompt(false);
      setAutoRegisterStatus('idle');
      setAutoRegisterError(null);
      const result = await startScan.mutateAsync({
        customerId,
        data: { websiteUrl, maxPages, maxDepth },
      });
      setActiveScanId(result.id);
      chunkedScan.reset();
    } catch (error) {
      console.error('Failed to start scan:', error);
    }
  };

  // Auto-start Phase 1 chunks when scan enters CRAWLING
  useEffect(() => {
    if (
      activeScanId &&
      (dbStatus === 'CRAWLING' || dbStatus === 'DISCOVERING') &&
      !chunkedScan.isProcessing &&
      chunkedScan.phase === 'idle' &&
      !phase1StartedRef.current
    ) {
      phase1StartedRef.current = true;
      chunkedScan.startPhase1();
    }
  }, [activeScanId, dbStatus, chunkedScan]);

  const handleConfirmNiche = async (niche: string) => {
    if (!activeScanId) return;
    try {
      await confirmNiche.mutateAsync({
        customerId,
        scanId: activeScanId,
        data: { niche },
      });
      // After niche confirmed, start Phase 2 chunk loop
      chunkedScan.startPhase2();
    } catch (error) {
      console.error('Failed to confirm niche:', error);
    }
  };

  const handleCancelScan = async () => {
    if (!activeScanId) return;
    try {
      chunkedScan.stopProcessing();
      await cancelScan.mutateAsync({ customerId, scanId: activeScanId });
      setActiveScanId(null);
      chunkedScan.reset();
      phase1StartedRef.current = false;
    } catch (error) {
      console.error('Failed to cancel scan:', error);
    }
  };

  const handleResume = () => {
    if (!activeScanId) return;
    phase1StartedRef.current = false;
    chunkedScan.reset();
    // The useEffect above will auto-start Phase 1
  };

  const handleSelectScan = (scanId: string) => {
    chunkedScan.reset();
    phase1StartedRef.current = false;
    setActiveScanId(scanId);
    setShowCredentialPrompt(false);
  };

  const handleReset = () => {
    setActiveScanId(null);
    chunkedScan.reset();
    phase1StartedRef.current = false;
    credentialSkippedRef.current = false;
    setShowCredentialPrompt(false);
    setAutoRegisterStatus('idle');
    setAutoRegisterError(null);
  };

  const handleSaveCredential = async (username: string, password: string, saveForFuture = true, mfaCode?: string) => {
    if (!activeScanId) return;

    try {
      // Provide credentials to the current scan to resume processing
      await provideCredentials.mutateAsync({
        customerId,
        scanId: activeScanId,
        username,
        password,
        saveForFuture,
      });

      // Store credentials in chunked scan state for subsequent chunk requests
      // They will be included in subsequent chunk API calls automatically
      chunkedScan.setCredentials({ username, password });

      // Hide the credential prompt - processing is still running
      setShowCredentialPrompt(false);
    } catch (error) {
      console.error('Failed to provide credentials:', error);
    }
  };

  const handleAutoRegister = async () => {
    if (!activeScanId) return;
    try {
      setAutoRegisterStatus('finding_signup');
      setAutoRegisterError(null);

      // Brief delay then update to 'creating_account' for UX
      setTimeout(() => setAutoRegisterStatus('creating_account'), 2000);

      const result = await autoRegister.mutateAsync({
        customerId,
        scanId: activeScanId,
      });

      if (result.success && result.credentials) {
        setAutoRegisterStatus('success');
        // Use the auto-registered credentials for subsequent chunks
        chunkedScan.setCredentials({
          username: result.credentials.email,
          password: result.credentials.password,
        });
        // Hide prompt after a brief success display
        setTimeout(() => setShowCredentialPrompt(false), 2000);
      } else {
        setAutoRegisterStatus('failed');
        setAutoRegisterError(result.error || 'Auto-registration failed');
      }
    } catch (error) {
      setAutoRegisterStatus('failed');
      setAutoRegisterError((error as Error)?.message || 'Auto-registration failed');
    }
  };

  const pastScans = scanHistory?.filter(s => s.id !== activeScanId) || [];

  return (
    <div className="space-y-4">
      {/* Show launcher when idle */}
      {isIdle && (
        <ScanLauncher
          defaultUrl={customerWebsiteUrl}
          onStartScan={handleStartScan}
          isLoading={startScan.isPending}
        />
      )}

      {/* Error from start */}
      {startScan.isError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">
            {(startScan.error as Error)?.message || 'Failed to start scan'}
          </span>
        </div>
      )}

      {/* Phase 1: Discovery Dashboard */}
      {isPhase1Active && (
        <ScanDiscoveryDashboard
          websiteUrl={scanDetail?.websiteUrl || customerWebsiteUrl || ''}
          pagesProcessed={chunkedScan.pagesProcessed}
          totalPages={chunkedScan.totalPages}
          discovery={chunkedScan.discovery}
          isDetectingNiche={chunkPhase === 'detecting_niche'}
          loginDetected={chunkedScan.loginDetected}
          loginUrl={chunkedScan.loginUrl}
          newPages={chunkedScan.accumulatedPages}
          onCancel={handleCancelScan}
          isCancelling={cancelScan.isPending}
          onSaveCredential={handleSaveCredential}
          onSkipCredential={() => {
            credentialSkippedRef.current = true;
            setShowCredentialPrompt(false);
          }}
          isSavingCredential={provideCredentials.isPending}
          showCredentialPrompt={showCredentialPrompt}
          onAutoRegister={handleAutoRegister}
          isAutoRegistering={autoRegister.isPending}
          autoRegisterStatus={autoRegisterStatus}
          autoRegisterError={autoRegisterError}
          obstaclesDismissed={chunkedScan.obstaclesDismissed}
          totalInteractions={chunkedScan.totalInteractions}
          authenticatedPagesCount={chunkedScan.authenticatedPagesCount}
          scanId={activeScanId}
        />
      )}

      {/* Resume banner for interrupted scans */}
      {needsResume && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <h3 className="font-medium text-amber-900">Scan In Progress</h3>
            <p className="text-sm text-amber-700">
              This scan was interrupted. Resume to continue processing.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancelScan} disabled={cancelScan.isPending}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleResume}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Resume
            </Button>
          </div>
        </div>
      )}

      {/* Phase 2: Simpler progress */}
      {isPhase2Active && (
        <ScanProgress
          status={chunkPhase === 'finalizing' ? 'ANALYZING' : 'DEEP_CRAWLING'}
          progress={{
            pagesScanned: chunkedScan.pagesProcessed,
            percentage: 0, // Phase 2 doesn't have a total count upfront
            step: chunkPhase === 'finalizing' ? 'Generating recommendations...' : 'Extracting interactive elements...',
          }}
          onCancel={handleCancelScan}
          isCancelling={cancelScan.isPending}
        />
      )}

      {/* Niche Verification */}
      {isNichePhase && (
        <NicheVerification
          scan={scanDetail || null}
          nicheData={null}
          onConfirm={handleConfirmNiche}
          isConfirming={confirmNiche.isPending}
          onCancel={handleCancelScan}
          isCancelling={cancelScan.isPending}
        />
      )}

      {/* Results */}
      {isCompleted && scanDetail && (
        <ScanResults customerId={customerId} scan={scanDetail} onCreateTracking={onCreateTracking} hasGoogleConnected={hasGoogleConnected} />
      )}

      {/* Failed */}
      {isFailed && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <h3 className="font-semibold text-red-800">Scan Failed</h3>
          </div>
          <p className="text-sm text-red-700">
            {chunkedScan.error || scanDetail?.errorMessage || 'An unknown error occurred during the scan.'}
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={handleReset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      )}

      {/* Scan History */}
      {pastScans.length > 0 && (
        <ScanHistoryList
          scans={pastScans}
          onSelectScan={handleSelectScan}
          activeScanId={activeScanId}
        />
      )}
    </div>
  );
}
