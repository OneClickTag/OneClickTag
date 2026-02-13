'use client';

import { Globe, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
}: ScanDiscoveryDashboardProps) {
  const percentage = totalPages > 0 ? Math.round((pagesProcessed / totalPages) * 100) : 0;
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
          <div className="p-2 bg-blue-100 rounded-lg">
            <Globe className="h-5 w-5 text-blue-600 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold">
              {isDetectingNiche ? 'Analyzing Niche...' : `Scanning ${domain}`}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isDetectingNiche
                ? 'AI is analyzing your site to detect the business niche'
                : `${pagesProcessed} / ${totalPages || '?'} pages crawled`}
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
        <div>
          <Progress value={percentage} className="mb-1" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{percentage}% complete</span>
            {discovery && (
              <span>{discovery.totalUrlsDiscovered} URLs discovered</span>
            )}
          </div>
        </div>
      )}

      {isDetectingNiche && (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
          <span className="text-sm text-muted-foreground">Running AI niche detection...</span>
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
    </div>
  );
}
