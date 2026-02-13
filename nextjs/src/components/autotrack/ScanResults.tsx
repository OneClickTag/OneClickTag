'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ScanSummary, TrackingRecommendation } from '@/types/site-scanner';
import {
  useRecommendations,
  useAcceptRecommendation,
  useRejectRecommendation,
  useBulkAcceptRecommendations,
} from '@/hooks/use-site-scanner';
import { TrackingReadinessScore } from './TrackingReadinessScore';
import { TechnologyDetection } from './TechnologyDetection';
import { RecommendationsList } from './RecommendationsList';

interface ScanResultsProps {
  customerId: string;
  scan: ScanSummary;
  onCreateTracking?: (recommendation: TrackingRecommendation) => void;
}

export function ScanResults({ customerId, scan, onCreateTracking }: ScanResultsProps) {
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const { data: recommendations, isLoading: loadingRecs } = useRecommendations(
    customerId,
    scan.id,
  );

  const acceptMutation = useAcceptRecommendation();
  const rejectMutation = useRejectRecommendation();
  const bulkAcceptMutation = useBulkAcceptRecommendations();

  const handleAccept = async (id: string) => {
    setAcceptingId(id);
    try {
      await acceptMutation.mutateAsync({ customerId, scanId: scan.id, recommendationId: id });
    } finally {
      setAcceptingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setRejectingId(id);
    try {
      await rejectMutation.mutateAsync({ customerId, scanId: scan.id, recommendationId: id });
    } finally {
      setRejectingId(null);
    }
  };

  const handleBulkAccept = async (ids: string[]) => {
    await bulkAcceptMutation.mutateAsync({
      customerId,
      scanId: scan.id,
      data: { recommendationIds: ids },
    });
  };

  const counts = scan.recommendationCounts || { critical: 0, important: 0, recommended: 0, optional: 0 };

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Readiness score */}
        {scan.trackingReadinessScore !== null && (
          <div className="lg:col-span-2">
            <TrackingReadinessScore
              score={scan.trackingReadinessScore}
              narrative={scan.readinessNarrative}
            />
          </div>
        )}

        {/* Severity counts */}
        <div className="bg-white rounded-lg border p-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{counts.critical}</p>
              <p className="text-xs text-muted-foreground">Critical</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{counts.important}</p>
              <p className="text-xs text-muted-foreground">Important</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{counts.recommended}</p>
              <p className="text-xs text-muted-foreground">Recommended</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-500">{counts.optional}</p>
              <p className="text-xs text-muted-foreground">Optional</p>
            </div>
          </div>
        </div>

        {/* Scan info */}
        <div className="bg-white rounded-lg border p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Niche</span>
              <span className="font-medium capitalize">{scan.confirmedNiche || scan.detectedNiche || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pages</span>
              <span className="font-medium">{scan.totalPagesScanned || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">AI Used</span>
              <span className="font-medium">{scan.aiAnalysisUsed ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Technologies */}
      <TechnologyDetection
        technologies={scan.detectedTechnologies}
        existingTracking={scan.existingTracking}
      />

      {/* Recommendations */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold mb-3">
          Tracking Recommendations ({scan.totalRecommendations || 0})
        </h3>

        {loadingRecs ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : recommendations && recommendations.length > 0 ? (
          <RecommendationsList
            recommendations={recommendations}
            onAccept={handleAccept}
            onReject={handleReject}
            onBulkAccept={handleBulkAccept}
            onCreateTracking={onCreateTracking}
            acceptingId={acceptingId}
            rejectingId={rejectingId}
            isBulkAccepting={bulkAcceptMutation.isPending}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No recommendations found.
          </div>
        )}
      </div>

      {/* Site Map */}
      {scan.siteMap && Object.keys(scan.siteMap).length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Site Structure</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(scan.siteMap).map(([type, pages]) => (
              <div key={type} className="border rounded p-3">
                <h4 className="text-sm font-medium capitalize mb-1">
                  {type} <span className="text-muted-foreground font-normal">({(pages as any[]).length})</span>
                </h4>
                <div className="space-y-1">
                  {(pages as any[]).slice(0, 5).map((page: any, i: number) => (
                    <div key={i} className="text-xs text-muted-foreground truncate">
                      {page.title || new URL(page.url).pathname}
                    </div>
                  ))}
                  {(pages as any[]).length > 5 && (
                    <div className="text-xs text-muted-foreground">
                      +{(pages as any[]).length - 5} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
