'use client';

import React from 'react';
import { Loader2, Globe, Brain, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SiteScanStatus } from '@/types/site-scanner';

interface ScanProgressInfo {
  pagesScanned?: number;
  totalPages?: number;
  currentUrl?: string;
  percentage?: number;
  pageUrl?: string;
  pageTitle?: string;
  pageType?: string;
  step?: string;
  phase?: string;
}

interface ScanProgressProps {
  status: SiteScanStatus;
  progress: ScanProgressInfo | null;
  onCancel: () => void;
  isCancelling: boolean;
}

const statusMessages: Record<string, { title: string; description: string; icon: React.ReactNode }> = {
  QUEUED: {
    title: 'Queued',
    description: 'Your scan is in the queue and will start shortly...',
    icon: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
  },
  CRAWLING: {
    title: 'Discovering Your Site',
    description: 'Crawling pages and analyzing site structure...',
    icon: <Globe className="h-5 w-5 animate-pulse text-blue-500" />,
  },
  ANALYZING: {
    title: 'AI Analysis',
    description: 'AI is analyzing tracking opportunities...',
    icon: <Brain className="h-5 w-5 animate-pulse text-purple-500" />,
  },
  DEEP_CRAWLING: {
    title: 'Deep Analysis',
    description: 'Extracting interactive elements from pages...',
    icon: <Globe className="h-5 w-5 animate-pulse text-indigo-500" />,
  },
};

export function ScanProgress({ status, progress, onCancel, isCancelling }: ScanProgressProps) {
  const statusInfo = statusMessages[status] || statusMessages.CRAWLING;
  const percentage = progress?.percentage || 0;

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {statusInfo.icon}
          <div>
            <h3 className="font-semibold">{statusInfo.title}</h3>
            <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isCancelling}
        >
          {isCancelling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Progress value={percentage} className="mb-2" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{percentage}% complete</span>
        {progress?.pagesScanned !== undefined && (
          <span>
            {progress.pagesScanned} / {progress.totalPages || '?'} pages
          </span>
        )}
      </div>

      {progress?.currentUrl && (
        <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-muted-foreground truncate">
          Scanning: {progress.currentUrl}
        </div>
      )}

      {progress?.pageUrl && (
        <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
          <span className="text-muted-foreground">Latest: </span>
          <span className="font-medium">{progress.pageTitle || progress.pageUrl}</span>
          {progress.pageType && (
            <span className="ml-2 text-muted-foreground">({progress.pageType})</span>
          )}
        </div>
      )}

      {progress?.step && (
        <div className="mt-2 text-xs text-muted-foreground">
          Step: {progress.step.replace(/_/g, ' ')}
        </div>
      )}
    </div>
  );
}
