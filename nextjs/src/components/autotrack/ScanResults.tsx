'use client';

import { useState } from 'react';
import { Loader2, MapIcon, ListChecks, AlertCircle } from 'lucide-react';
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
import { ExploredRoutes } from './ExploredRoutes';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  // Calculate coverage
  const scanPages = scan.pages || [];
  const totalRoutesDiscovered = scan.totalUrlsFound || 0;
  const pagesScanned = scanPages.length;
  const coveragePercent = totalRoutesDiscovered > 0
    ? Math.round((pagesScanned / totalRoutesDiscovered) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Coverage Banner */}
      {totalRoutesDiscovered > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapIcon className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-900">Site Coverage</h3>
                <p className="text-sm text-blue-700">
                  Explored {pagesScanned} of {totalRoutesDiscovered} discovered routes ({coveragePercent}% coverage)
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{coveragePercent}%</div>
            </div>
          </div>
        </div>
      )}

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

      {/* Tabs: Recommendations and Explored Routes */}
      <Tabs defaultValue="recommendations" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Recommendations ({scan.totalRecommendations || 0})
          </TabsTrigger>
          <TabsTrigger value="routes" className="flex items-center gap-2">
            <MapIcon className="h-4 w-4" />
            Explored Routes ({scanPages.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="mt-4">
          <div className="bg-white rounded-lg border p-4">
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
        </TabsContent>

        <TabsContent value="routes" className="mt-4">
          <ExploredRoutes
            scanPages={scanPages}
            recommendations={recommendations || []}
          />
        </TabsContent>
      </Tabs>

      {/* Site Map - Keep for backwards compatibility */}
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
