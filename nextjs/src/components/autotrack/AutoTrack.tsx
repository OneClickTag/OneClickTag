'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
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
import { useScanUIState, ScanUIPhase } from '@/hooks/use-scan-ui-state';
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
  const { data: scanHistory, isLoading: isLoadingHistory } = useScanHistory(customerId);
  const shouldPoll = activeScanId !== null;
  const scanDetailQuery = useScanDetail(customerId, activeScanId, shouldPoll);
  const scanDetail = scanDetailQuery.data;

  // Mutations
  const startScan = useStartScan();
  const confirmNiche = useConfirmNiche();
  const cancelScan = useCancelScan();
  const saveCredential = useSaveCredential();
  const provideCredentials = useProvideCredentials();
  const autoRegister = useAutoRegister();

  // Chunked scan orchestration
  const chunkedScan = useChunkedScan(customerId, activeScanId);

  // Derive UI phase from all state sources
  const dbStatus = scanDetail?.status as SiteScanStatus | undefined;
  const { isProcessing, phase: chunkPhase, error: chunkError } = chunkedScan;
  const uiPhase = useScanUIState({
    activeScanId,
    dbStatus,
    isDbLoading: scanDetailQuery.isLoading,
    isChunking: isProcessing,
    chunkPhase,
    chunkError,
    hasPreviousData: scanDetailQuery.isPlaceholderData || !!scanDetail,
  });

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
    }
  }, [chunkedScan.loginDetected, showCredentialPrompt]);

  // Auto-start Phase 1 chunks when scan enters CRAWLING
  useEffect(() => {
    if (
      activeScanId &&
      (dbStatus === 'CRAWLING' || dbStatus === 'DISCOVERING') &&
      !isProcessing &&
      chunkPhase === 'idle' &&
      !phase1StartedRef.current
    ) {
      phase1StartedRef.current = true;
      chunkedScan.startPhase1();
    }
  }, [activeScanId, dbStatus, isProcessing, chunkPhase]);

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

  const handleConfirmNiche = async (niche: string) => {
    if (!activeScanId) return;
    try {
      await confirmNiche.mutateAsync({
        customerId,
        scanId: activeScanId,
        data: { niche },
      });
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
  };

  const handleSelectScan = (scanId: string) => {
    chunkedScan.stopProcessing();
    phase1StartedRef.current = false;
    chunkedScan.reset();
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
      await provideCredentials.mutateAsync({
        customerId,
        scanId: activeScanId,
        username,
        password,
        saveForFuture,
      });
      chunkedScan.setCredentials({ username, password });
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
      setTimeout(() => setAutoRegisterStatus('creating_account'), 2000);
      const result = await autoRegister.mutateAsync({
        customerId,
        scanId: activeScanId,
      });
      if (result.success && result.credentials) {
        setAutoRegisterStatus('success');
        chunkedScan.setCredentials({
          username: result.credentials.email,
          password: result.credentials.password,
        });
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

  // Render based on single UI phase
  const renderContent = () => {
    // Show loader while loading initial scan history (prevents flash to ScanLauncher)
    if (isLoadingHistory && !activeScanId) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    switch (uiPhase) {
      case 'loading':
        return (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        );

      case 'phase1':
      case 'detecting_niche':
        return (
          <ScanDiscoveryDashboard
            websiteUrl={scanDetail?.websiteUrl || customerWebsiteUrl || ''}
            pagesProcessed={chunkedScan.pagesProcessed}
            totalPages={chunkedScan.totalPages}
            discovery={chunkedScan.discovery}
            isDetectingNiche={uiPhase === 'detecting_niche'}
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
        );

      case 'needs_resume':
        return (
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
        );

      case 'phase2':
      case 'finalizing':
        return (
          <ScanProgress
            status={uiPhase === 'finalizing' ? 'ANALYZING' : 'DEEP_CRAWLING'}
            progress={{
              pagesScanned: chunkedScan.pagesProcessed,
              percentage: 0,
              step: uiPhase === 'finalizing' ? 'Generating recommendations...' : 'Extracting interactive elements...',
            }}
            onCancel={handleCancelScan}
            isCancelling={cancelScan.isPending}
          />
        );

      case 'niche_confirm':
        return (
          <NicheVerification
            scan={scanDetail || null}
            nicheData={null}
            onConfirm={handleConfirmNiche}
            isConfirming={confirmNiche.isPending}
            onCancel={handleCancelScan}
            isCancelling={cancelScan.isPending}
          />
        );

      case 'completed':
        return scanDetail ? (
          <ScanResults customerId={customerId} scan={scanDetail} onCreateTracking={onCreateTracking} hasGoogleConnected={hasGoogleConnected} />
        ) : null;

      case 'failed':
        return (
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
        );

      case 'cancelled':
      case 'idle':
      default:
        return (
          <ScanLauncher
            defaultUrl={customerWebsiteUrl}
            onStartScan={handleStartScan}
            isLoading={startScan.isPending}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      {renderContent()}

      {/* Error from start */}
      {startScan.isError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">
            {(startScan.error as Error)?.message || 'Failed to start scan'}
          </span>
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
