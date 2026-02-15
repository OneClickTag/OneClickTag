'use client';

import { useRef, useEffect, useState } from 'react';
import { Globe, Loader2, X, Radio, Shield, MousePointerClick } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LiveDiscovery } from '@/types/site-scanner';
import { TechPanel } from './discovery/TechPanel';
import { PriorityElementsPanel } from './discovery/PriorityElementsPanel';
import { UrlDiscoveryFeed } from './discovery/UrlDiscoveryFeed';
import { CredentialPrompt } from './CredentialPrompt';

interface ScanDiscoveryDashboardProps {
  websiteUrl: string;
  pagesProcessed: number;
  totalPages: number;
  discovery: LiveDiscovery | null;
  isDetectingNiche: boolean;
  loginDetected: boolean;
  loginUrl: string | null;
  newPages?: Array<{ url: string; title: string | null; pageType: string | null; hasForm: boolean; hasCTA: boolean }>;
  onCancel: () => void;
  isCancelling: boolean;
  onSaveCredential?: (username: string, password: string) => void;
  onSkipCredential?: () => void;
  isSavingCredential?: boolean;
  showCredentialPrompt?: boolean;
  obstaclesDismissed?: number;
  totalInteractions?: number;
  authenticatedPagesCount?: number;
}

/**
 * Smooth progress bar that interpolates towards target value
 * to avoid jarring jumps when totalPages changes.
 */
function SmoothProgress({ current, total }: { current: number; total: number }) {
  const [displayPercent, setDisplayPercent] = useState(0);
  const targetPercent = total > 0 ? Math.round((current / total) * 100) : 0;
  const rafRef = useRef<number>();

  useEffect(() => {
    const animate = () => {
      setDisplayPercent(prev => {
        const diff = targetPercent - prev;
        if (Math.abs(diff) < 0.5) return targetPercent;
        // Ease towards target - moves fast when far, slow when close
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
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-none"
          style={{
            width: `${percent}%`,
            boxShadow: percent > 0 ? '0 0 8px rgba(59, 130, 246, 0.4)' : 'none',
          }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{percent}% complete</span>
        <span>{current} / {total || '?'} pages</span>
      </div>
    </div>
  );
}

export function ScanDiscoveryDashboard({
  websiteUrl,
  pagesProcessed,
  totalPages,
  discovery,
  isDetectingNiche,
  loginDetected,
  loginUrl,
  newPages,
  onCancel,
  isCancelling,
  onSaveCredential,
  onSkipCredential,
  isSavingCredential,
  showCredentialPrompt,
  obstaclesDismissed = 0,
  totalInteractions = 0,
  authenticatedPagesCount = 0,
}: ScanDiscoveryDashboardProps) {
  let domain = '';
  try {
    domain = new URL(websiteUrl).hostname;
  } catch {
    domain = websiteUrl;
  }

  return (
    <div className="bg-white rounded-lg border p-6 space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative p-2 bg-blue-100 rounded-lg">
            <Globe className="h-5 w-5 text-blue-600" />
            {/* Live scanning indicator */}
            {!isDetectingNiche && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
              </span>
            )}
          </div>
          <div>
            <h3 className="font-semibold">
              {isDetectingNiche ? 'Analyzing Niche...' : `Scanning ${domain}`}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isDetectingNiche
                ? 'AI is analyzing your site to detect the business niche'
                : `Discovering pages and analyzing structure`}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isCancelling}>
          {isCancelling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Progress */}
      {!isDetectingNiche && (
        <SmoothProgress current={pagesProcessed} total={totalPages} />
      )}

      {/* Obstacle and Interaction Counters */}
      {!isDetectingNiche && (obstaclesDismissed > 0 || totalInteractions > 0) && (
        <div className="flex items-center gap-4 text-xs">
          {obstaclesDismissed > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-green-600" />
              <span>Auto-dismissed: {obstaclesDismissed} {obstaclesDismissed === 1 ? 'obstacle' : 'obstacles'}</span>
            </div>
          )}
          {totalInteractions > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MousePointerClick className="h-3.5 w-3.5 text-blue-600" />
              <span>{totalInteractions} {totalInteractions === 1 ? 'interaction' : 'interactions'} performed</span>
            </div>
          )}
        </div>
      )}

      {/* Niche detection state */}
      {isDetectingNiche && (
        <div className="flex items-center gap-3 py-3 px-4 bg-purple-50 rounded-lg border border-purple-100">
          <div className="relative">
            <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-purple-900">Running AI niche detection</p>
            <p className="text-xs text-purple-600">Analyzing content, structure, and technologies...</p>
          </div>
        </div>
      )}

      {/* Credential prompt */}
      {showCredentialPrompt && loginDetected && onSaveCredential && onSkipCredential && (
        <CredentialPrompt
          loginUrl={loginUrl}
          domain={domain}
          onSave={onSaveCredential}
          onSkip={onSkipCredential}
          isSaving={isSavingCredential || false}
        />
      )}

      {/* Discovery panels */}
      {discovery && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left column: Tech + Elements */}
          <div className="space-y-4">
            <TechPanel discovery={discovery} />
            <PriorityElementsPanel discovery={discovery} />
          </div>
          {/* Right column: URL feed */}
          <UrlDiscoveryFeed discovery={discovery} newPages={newPages} />
        </div>
      )}

      {/* URLs discovered counter */}
      {discovery && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t">
          <Radio className="h-3 w-3 text-blue-500 animate-pulse" />
          <span>{discovery.totalUrlsDiscovered} total URLs discovered</span>
        </div>
      )}
    </div>
  );
}
