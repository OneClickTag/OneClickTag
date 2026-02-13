'use client';

import React from 'react';
import { Clock, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScanHistory as ScanHistoryType } from '@/types/site-scanner';

interface ScanHistoryProps {
  scans: ScanHistoryType[];
  onSelectScan: (scanId: string) => void;
  activeScanId?: string | null;
}

const statusConfig: Record<string, { icon: React.ReactNode; className: string }> = {
  COMPLETED: { icon: <CheckCircle className="h-3.5 w-3.5" />, className: 'text-green-600' },
  FAILED: { icon: <AlertCircle className="h-3.5 w-3.5" />, className: 'text-red-600' },
  CANCELLED: { icon: <XCircle className="h-3.5 w-3.5" />, className: 'text-gray-500' },
  QUEUED: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, className: 'text-blue-500' },
  CRAWLING: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, className: 'text-blue-500' },
  ANALYZING: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, className: 'text-purple-500' },
  NICHE_DETECTED: { icon: <Clock className="h-3.5 w-3.5" />, className: 'text-yellow-600' },
  AWAITING_CONFIRMATION: { icon: <Clock className="h-3.5 w-3.5" />, className: 'text-yellow-600' },
  DEEP_CRAWLING: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, className: 'text-indigo-500' },
};

export function ScanHistoryList({ scans, onSelectScan, activeScanId }: ScanHistoryProps) {
  if (scans.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold mb-3 text-sm">Previous Scans</h3>
      <div className="space-y-2">
        {scans.map((scan) => {
          const status = statusConfig[scan.status] || statusConfig.QUEUED;
          const isActive = activeScanId === scan.id;

          return (
            <button
              key={scan.id}
              onClick={() => onSelectScan(scan.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                isActive ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={status.className}>{status.icon}</span>
                  <span className="text-sm font-medium truncate max-w-[200px]">
                    {scan.websiteUrl}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(scan.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {scan.detectedNiche && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {scan.detectedNiche}
                  </Badge>
                )}
                {scan.totalPagesScanned && (
                  <span className="text-xs text-muted-foreground">
                    {scan.totalPagesScanned} pages
                  </span>
                )}
                {scan.totalRecommendations !== null && (
                  <span className="text-xs text-muted-foreground">
                    {scan.totalRecommendations} recommendations
                  </span>
                )}
                {scan.trackingReadinessScore !== null && (
                  <Badge variant="outline" className="text-xs">
                    Score: {scan.trackingReadinessScore}
                  </Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
