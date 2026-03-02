'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Clock, Loader2, CheckCircle2, XCircle, RotateCw, Pause, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBatchProgress, type BatchProgressState, type JobProgress } from '@/hooks/use-batch-progress';
import { useApi } from '@/hooks/use-api';
import { useQueryClient } from '@tanstack/react-query';

interface BulkCreateProgressProps {
  batchId: string;
  onClose: () => void;
}

// Smooth animated progress bar (extracted from ScanDiscoveryDashboard pattern)
function SmoothProgress({ current, total }: { current: number; total: number }) {
  const [displayPercent, setDisplayPercent] = useState(0);
  const targetPercent = total > 0 ? Math.round((current / total) * 100) : 0;
  const rafRef = useRef<number>();

  useEffect(() => {
    const animate = () => {
      setDisplayPercent((prev) => {
        const diff = targetPercent - prev;
        if (Math.abs(diff) < 0.5) return targetPercent;
        return prev + diff * 0.15;
      });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [targetPercent]);

  const percent = Math.round(Math.min(displayPercent, 100));

  return (
    <div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-none"
          style={{
            width: `${percent}%`,
            boxShadow: percent > 0 ? '0 0 8px rgba(59, 130, 246, 0.4)' : 'none',
          }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>
          {current} of {total} processed
        </span>
        <span>{percent}%</span>
      </div>
    </div>
  );
}

// Countdown timer for paused state
function CountdownTimer({ resumeAfter }: { resumeAfter: string }) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, Math.ceil((new Date(resumeAfter).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [resumeAfter]);

  return <span>{secondsLeft}s</span>;
}

function JobStatusIcon({ status, step }: { status: string; step: string | null }) {
  switch (status) {
    case 'QUEUED':
      return <Clock className="h-4 w-4 text-gray-400" />;
    case 'PROCESSING':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'COMPLETED':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'FAILED':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'RETRYING':
      return <RotateCw className="h-4 w-4 text-orange-500" />;
    case 'PAUSED':
      return <Pause className="h-4 w-4 text-amber-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
}

function stepLabel(step: string | null): string {
  switch (step) {
    case 'syncing':
      return 'Syncing with Google...';
    case 'ads_sync':
      return 'Creating Ads conversion...';
    case 'gtm_sync':
      return 'Creating GTM tags...';
    default:
      return '';
  }
}

export function BulkCreateProgress({ batchId, onClose }: BulkCreateProgressProps) {
  const progress = useBatchProgress(batchId);
  const api = useApi();
  const apiRef = useRef(api);
  apiRef.current = api;
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);

  // Poll batch status from API every 5s as fallback (Supabase Realtime may miss events).
  // Also hydrates initial state for page navigation scenarios.
  // Uses apiRef to avoid re-creating the interval when the api object changes.
  useEffect(() => {
    if (!batchId) return;
    let cancelled = false;

    const fetchStatus = () => {
      apiRef.current.get(`/api/batches/${batchId}`).then((data: any) => {
        if (cancelled) return;
        setInitialData(data);
      }).catch(() => {});
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [batchId]);

  // Derive status from polled API data (source of truth), overlaid with realtime events.
  // Realtime updates are faster but may miss events; polling ensures we converge.
  const apiStatus = initialData?.status === 'COMPLETED' ? 'completed' :
    initialData?.status === 'PAUSED' ? 'paused' :
    initialData?.status === 'CANCELLED' ? 'completed' :
    initialData ? 'processing' : 'idle';

  // Use whichever is more "advanced" — completed > paused > processing > idle
  const statusRank = { idle: 0, processing: 1, paused: 2, completed: 3 };
  const realtimeStatus = progress.status;
  const status = statusRank[realtimeStatus] >= statusRank[apiStatus] ? realtimeStatus : apiStatus;

  // For counters, use the higher values (realtime may be ahead of polling, or vice versa)
  const apiCompleted = initialData?.completed || 0;
  const apiFailed = initialData?.failed || 0;
  const apiTotal = initialData?.totalJobs || 0;
  const completed = Math.max(progress.completed, apiCompleted);
  const failed = Math.max(progress.failed, apiFailed);
  const total = Math.max(progress.total, apiTotal);
  const pauseReason = progress.pauseReason || initialData?.pauseReason || null;
  const resumeAfter = progress.resumeAfter || initialData?.resumeAfter || null;

  // Build job list: merge realtime events with polled data
  const apiJobs: JobProgress[] = (initialData?.jobs || []).map((j: any) => ({
    jobId: j.id,
    trackingId: j.trackingId,
    trackingName: j.trackingName || 'Unknown',
    status: j.status,
    step: j.step,
    error: j.lastError,
    nextRetryAt: j.nextRetryAt,
  }));

  // Merge: realtime has more immediate status, polled has full list
  const jobMap = new Map<string, JobProgress>();
  for (const j of apiJobs) jobMap.set(j.jobId, j);
  for (const j of Array.from(progress.jobs.values())) jobMap.set(j.jobId, j);
  const jobs = Array.from(jobMap.values());

  const isComplete = status === 'completed';
  const processed = completed + failed;

  // Auto-invalidate queries when batch completes (whether via realtime or polling)
  const hasInvalidated = useRef(false);
  useEffect(() => {
    if (isComplete && !hasInvalidated.current) {
      hasInvalidated.current = true;
      queryClient.invalidateQueries({ queryKey: ['trackings'] });
      queryClient.invalidateQueries({ queryKey: ['scan-recommendations'] });
    }
  }, [isComplete, queryClient]);

  const handleCancel = useCallback(async () => {
    setCancelling(true);
    try {
      await api.post(`/api/batches/${batchId}/cancel`);
    } catch (err) {
      console.error('Failed to cancel batch:', err);
    } finally {
      setCancelling(false);
    }
  }, [batchId, api]);

  const handleDone = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['trackings'] });
    queryClient.invalidateQueries({ queryKey: ['scan-recommendations'] });
    onClose();
  }, [onClose, queryClient]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-lg">Creating Trackings</h2>
          </div>
          <Badge
            variant={
              isComplete ? 'default' :
              status === 'paused' ? 'secondary' : 'outline'
            }
            className={
              isComplete
                ? 'bg-green-100 text-green-800'
                : status === 'paused'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-blue-100 text-blue-800'
            }
          >
            {isComplete ? 'Complete' : status === 'paused' ? 'Paused' : 'Processing'}
          </Badge>
        </div>

        {/* Progress */}
        <div className="p-4 space-y-3">
          <SmoothProgress current={processed} total={total} />

          {/* Paused banner */}
          {status === 'paused' && pauseReason && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
              <Pause className="h-4 w-4 text-amber-600 shrink-0" />
              <div className="text-sm text-amber-800">
                {pauseReason}
                {resumeAfter && (
                  <span className="font-medium ml-1">
                    Resuming in <CountdownTimer resumeAfter={resumeAfter} />
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Completion banner */}
          {isComplete && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  {completed} tracking{completed !== 1 ? 's' : ''} created successfully
                  {failed > 0 && (
                    <span className="text-red-600 ml-1">
                      ({failed} failed)
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Job list */}
        <div className="flex-1 overflow-y-auto px-4 pb-2 min-h-0">
          <div className="space-y-1">
            {jobs.map((job) => (
              <div
                key={job.jobId}
                className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50"
              >
                <JobStatusIcon status={job.status} step={job.step} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">
                    {job.trackingName}
                  </span>
                  {job.status === 'PROCESSING' && job.step && (
                    <span className="text-xs text-blue-600">{stepLabel(job.step)}</span>
                  )}
                  {job.status === 'FAILED' && job.error && (
                    <span className="text-xs text-red-500 truncate block">{job.error}</span>
                  )}
                  {job.status === 'RETRYING' && job.nextRetryAt && (
                    <span className="text-xs text-orange-600">
                      Retrying in <CountdownTimer resumeAfter={job.nextRetryAt} />
                    </span>
                  )}
                </div>
              </div>
            ))}
            {jobs.length === 0 && status !== 'idle' && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                Waiting for processing to start...
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t">
          {isComplete ? (
            <Button onClick={handleDone}>Done</Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
